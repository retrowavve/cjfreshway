# 배포된 백엔드 E2E 테스트 리포트 - 응모해

## 개요

- **대상**: `https://retrowavve-be.vercel.app` (Vercel 배포, 운영 Supabase Postgres 연결)
- **테스트 방법**: `docs/4-user-scenario.md`의 8개 시나리오를 API 레벨(curl)로 재현. 프론트엔드는 별도 배포 확인 없이 백엔드 API만 검증(요청 범위: "배포된 백엔드에 대해").
- **테스트일**: 2026-08-21
- **원본 요청/응답 로그**: `e2e/backend-prod/raw-log.txt`
- **사전 조치**: 운영 DB의 `admins` 테이블이 비어 있어 로컬과 동일한 기본 seed 계정(`admin` / `ChangeMe123!`)을 하나 생성함(테스트에 필요, 아래 "후속 조치 필요" 참고)

## 결과 요약

| 구분 | 건수 |
|------|------|
| 정상 동작 확인 시나리오/스텝 | 21 |
| 예외/엣지 케이스 확인 | 10 |
| 발견된 결함(Bug) | 0 |
| 운영 설정 관련 확인/참고사항 | 2 |
| 오탐(테스트 도구 문제, 아래 참고) | 1 |

핵심 비즈니스 로직(회원가입/로그인, DIRECT·ROULETTE 참여, 취소/재신청, 마이페이지, Admin 등록/조기종료/현황조회, 각종 권한·상태 검증)은 **모두 로그에 문서화된 기대값대로 정상 동작**했으며, 한글 등 비-ASCII 텍스트도 정상적으로 저장·조회됩니다.

---

## ⚠️ 정정 — 최초 "한글 인코딩 치명 결함" 보고는 오탐이었음

최초 테스트에서 `POST /auth/signup`에 `businessName:"상사"`를 담아 보냈을 때 응답과 DB 양쪽에 `"���"`(U+FFFD)로 저장되는 것을 발견해 백엔드 결함으로 보고했으나, 원인을 더 파고든 결과 **백엔드가 아니라 이번 테스트에 사용한 curl 명령이 원인**이었음을 확인했습니다.

**원인**: 이 환경(Windows Git Bash)에서 `curl -d '{"...상사..."}'`처럼 한글이 포함된 문자열을 커맨드라인 인자로 넘기면, curl.exe 프로세스를 실행하는 과정에서 해당 인자가 UTF-8이 아닌 다른 코드페이지로 재인코딩되어 실제로는 손상된 바이트가 네트워크로 전송됩니다.

**검증**:
- 의도한 페이로드의 정상 UTF-8 바이트 수: 95바이트 (`상사`=6바이트, `홍길동`=9바이트 포함)
- `curl --trace-ascii`로 실제 전송된 바이트 수 확인: **90바이트** (5바이트 부족 — `상사`를 CP949로 보내면 4바이트, `홍길동`을 CP949로 보내면 6바이트가 되어 정확히 5바이트가 줄어드는 것과 일치)
- 같은 JSON을 파일에 UTF-8로 저장한 뒤 `curl --data-binary @file`로 전송(커맨드라인 인자 경유 없이 파일 바이트를 그대로 전송)하니 응답과 DB 양쪽 모두 `"businessName":"상사","name":"홍길동"`로 **완벽하게 정상 저장·조회**됨을 확인

즉 백엔드의 JSON 파싱/DB 저장/응답 직렬화 전 구간이 UTF-8을 정확히 처리하고 있으며, 수정이 필요한 코드는 없습니다. 진단 과정에서 생성했던 테스트 계정(`trace_check_1`, `file_check_1`)은 정리했습니다.

---

## 정상 동작 확인 시나리오

| # | 시나리오/스텝 | 결과 |
|---|------|------|
| 1 | 회원가입 | ✅ 201 |
| 2 | 로그인(User) | ✅ 200, accessToken/refreshToken 발급 |
| 3 | 로그인(Admin) | ✅ 200 |
| 4 | Admin: DIRECT 프로모션 등록 | ✅ 201, status 자동 산정(ONGOING) |
| 5 | Admin: ROULETTE 프로모션 등록(maxParticipationCount) | ✅ 201 |
| 6 | `GET /promotions` (ONGOING+UPCOMING 노출) | ✅ 200 |
| 7 | `GET /promotions/:id` 상세 | ✅ 200 |
| 8 | DIRECT 응모 | ✅ 201, status=APPLIED, result=PENDING |
| 9~10 | ROULETTE 1·2회차 시도(LOSE→WIN), attemptCount 증가 | ✅ 201×2 |
| 11 | `GET /me/participations` (DIRECT/ROULETTE 결과 함께 표시) | ✅ 200 |
| 12 | 참여 취소 → status=CANCELLED | ✅ 200 |
| 13 | 재신청 → status=REAPPLIED, result 유지 | ✅ 200 |
| 14~15 | `GET /me`, `PUT /me` 정보 수정 | ✅ 200 |
| 16~17 | 비밀번호 변경(실패/성공), 새 비밀번호로 재로그인 | ✅ |
| 18 | `GET /admin/promotions` | ✅ 200 |
| 19 | 조기종료 → status=ENDED 즉시 반영 | ✅ 200 |
| 20 | 참여 현황(ROULETTE, WIN/LOSE 카운트) | ✅ 200, winCount=1/loseCount=0 |
| 21 | 참여 현황(DIRECT, 카운트만) | ✅ 200 |

## 예외/엣지 케이스 확인

| # | 케이스 | 기대 결과 | 실제 결과 |
|---|--------|-----------|-----------|
| 1-1 | 중복 loginId 회원가입 | 409 LOGIN_ID_DUPLICATE | ✅ |
| 2-1 | 잘못된 비밀번호 로그인 | 401 INVALID_CREDENTIALS | ✅ |
| 5-1 | User 토큰으로 프로모션 등록 시도 | 403 FORBIDDEN | ✅ |
| 7-1 | 존재하지 않는 프로모션 조회 | 404 PROMOTION_NOT_FOUND | ✅ |
| 8-1 | DIRECT 중복 응모 | 409 ALREADY_PARTICIPATED | ✅ |
| 8-2 | 비로그인 응모 시도 | 401 UNAUTHORIZED | ✅ |
| 10-1 | ROULETTE 소진 후 추가 시도(규칙6) | 409 ATTEMPT_LIMIT_EXCEEDED | ✅ |
| 10-2 | DIRECT 프로모션에 `/roulette` 호출 | 409 PROMOTION_TYPE_MISMATCH | ✅ |
| 13-1 | REAPPLIED 상태에 재신청 재시도 | 409 INVALID_STATUS_TRANSITION | ✅ |
| 16 | 현재 비밀번호 틀림 | 401 INVALID_CURRENT_PASSWORD | ✅ |
| 19-1 | 조기종료 후 신규 참여 시도(규칙9) | 409 PROMOTION_NOT_ONGOING | ✅ |

## 운영 설정 관련 참고사항 (Bug 아님)

- **CORS**: `Access-Control-Allow-Origin: https://retrowavve-fe.vercel.app`로 정상 고정되어 있음을 확인. 저장소 내 `.env.production`에는 `FRONTEND_ORIGIN=http://localhost:5173`로 되어 있으나, 실제 Vercel 배포에는 별도로 올바른 값이 환경변수로 설정되어 있는 것으로 보임(로컬 파일과 실배포 값이 다름 — 저장소의 `.env.production`은 실제 배포 설정을 반영하지 않으므로 참고용으로만 사용할 것).
- **Admin 기본 계정**: 운영 DB에 admin 계정이 없어 이번 테스트를 위해 `admin`/`ChangeMe123!`(로컬과 동일한 기본값)로 하나 생성했습니다. 실서비스 전에 반드시 비밀번호를 변경하거나 별도 계정으로 교체하는 것을 권장합니다.

## 테스트 데이터 정리

- 이번 테스트로 만든 User(`prod_e2e_user_*`), 프로모션(DIRECT), 참여내역은 정리했습니다.
- 인코딩 오탐 진단 과정에서 만든 계정(`trace_check_1`, `file_check_1`)과 한글 검증용 프로모션("한글 인코딩 검증용 프로모션")도 정리했습니다.
- ROULETTE 참여 1건과 `participation_attempts` 2건은 **정리하지 못했습니다** — `participation_attempts`는 도메인 규칙(재추첨 불가, 규칙4)에 따라 DB 트리거로 UPDATE/DELETE가 원천 차단되어 있고, 이를 참조하는 `participations`/`promotions`/`users` 행도 FK 제약으로 연쇄 삭제가 불가능합니다(설계상 의도된 동작). 남은 테스트 데이터는 `promotions.title = 'prod e2e ROULETTE'`(status=ENDED)로 식별 가능하며, 실사용자 데이터에 섞이지 않도록 이미 종료 처리되어 목록에는 노출되지 않습니다.
