# E2E 테스트 리포트 - 응모해

## 개요

- **테스트 방법**: Playwright MCP를 이용한 브라우저 자동화 수동 E2E 시나리오 테스트
- **대상**: 로컬 개발서버 (Frontend `http://localhost:5173`, Backend `http://localhost:3000`)
- **테스트일**: 2026-08-21
- **테스트 계정**: User `e2euser01`(신규 가입), Admin `admin`(DB seed 계정)
- **근거 문서**: `docs/4-user-scenario.md`(사용자 시나리오 1~8), `docs/1-domain-definition.md`(도메인 규칙)
- **스크린샷**: `e2e/screenshots/` (총 36장, 파일명에 `BUG-` 접두사가 붙은 4장은 아래 발견된 결함에 대응)

## 결과 요약

| 구분 | 건수 |
|------|------|
| 정상 동작 확인 시나리오 | 15 |
| 예외/엣지 케이스 확인 | 8 |
| 발견된 결함(Bug) | 3 |

전체적으로 핵심 사용자 흐름(회원가입 → 로그인 → 프로모션 조회/응모 → 참여내역 관리 → 마이페이지, Admin의 프로모션 등록/수정/조기종료/현황조회)은 시나리오 문서와 일치하게 정상 동작했습니다. 다만 아래 3건의 결함을 실제 브라우저 조작 중 재현했습니다.

---

## 1. 시나리오별 테스트 결과

### 시나리오 1 — 회원가입 및 로그인 (`docs/4-user-scenario.md` §1)

| 스텝 | 결과 | 스크린샷 |
|------|------|----------|
| 회원가입 폼 입력 및 제출 | ✅ 정상, 로그인 화면으로 이동 | `01-signup.png`, `02-signup-filled.png` |
| 잘못된 비밀번호로 로그인 시도 (엣지케이스) | ✅ "아이디 또는 비밀번호가 올바르지 않습니다." 알림 정상 표시 | `04-login-invalid-credentials.png` |
| 올바른 정보로 로그인 | ✅ 프로모션 목록으로 정상 이동, GNB에 로그인ID/역할 배지 노출 | `03-login.png`, `05-promotion-list.png` |
| 중복 로그인ID로 재가입 시도 (엣지케이스) | ✅ "이미 사용 중인 아이디입니다." 알림 정상 표시 | `34-signup-duplicate-loginid.png` |

### 시나리오 2 — 프로모션 조회 및 DIRECT 응모 (§2)

| 스텝 | 결과 | 스크린샷 |
|------|------|----------|
| DIRECT 프로모션 상세 진입 | ✅ | `06-promotion-detail-direct.png` |
| 응모하기 클릭 → 응모 완료(PENDING) 표시 | ✅ | `07-direct-applied.png` |
| 동일 프로모션 중복 응모 시도 (엣지케이스, 규칙5) | ✅ "이미 참여한 프로모션입니다." 거부 확인 | `08-direct-duplicate-error.png` |

### 시나리오 3 — 프로모션 조회 및 ROULETTE 참여 (§3)

| 스텝 | 결과 | 스크린샷 |
|------|------|----------|
| 룰렛 실행(1회차) → LOSE | ✅ 결과 즉시 표시, 잔여횟수 2/3 → 1/3 감소 | `09-promotion-detail-roulette.png`, `10-roulette-result-lose.png` |
| 룰렛 재실행(2회차) → WIN | ✅ `window.alert` 축하 얼럿 노출 + 결과 카드에 "🎉 축하합니다! 당첨되셨습니다! 🎉" 배너 표시 | `11-roulette-result-win.png` |
| maxParticipationCount(3회) 소진까지 반복(3회차 WIN) | ✅ 잔여 0/3 도달 시 실행 버튼 자동 숨김(규칙6) | `12-roulette-exhausted.png` |

### 시나리오 4 — 참여 취소 및 재신청 (§4)

| 스텝 | 결과 | 스크린샷 |
|------|------|----------|
| 내 참여내역에서 DIRECT 응모 취소 | ✅ 상태 "응모취소"로 전환, "재응모" 버튼 노출 | `14-participation-cancelled.png` |
| 재응모 클릭 | ✅ 상태 "재응모완료"로 전환 | `15-participation-reapplied.png` |

### 시나리오 5 — 내 참여내역 조회 (§5)

| 스텝 | 결과 | 스크린샷 |
|------|------|----------|
| 내 참여내역 목록 조회 | ✅ DIRECT/ROULETTE 항목 모두 한국어 상태·결과 라벨(응모완료/결과 대기중/당첨/미당첨)로 표시, 회차별 결과 리스트 확인 | `13-my-participations.png` |

### 시나리오 6 — 마이페이지 정보 수정/비밀번호 변경 (§6)

| 스텝 | 결과 | 스크린샷 |
|------|------|----------|
| 마이페이지 메뉴(개인정보 수정/비밀번호 변경/참여내역) 진입 | ✅ 각각 별도 화면으로 정상 분리 | `16-mypage-menu.png` |
| 사업체명 수정 후 저장 | ✅ 화면에 즉시 반영 | `17-myinfo-edit.png`, `18-myinfo-saved.png` |
| 잘못된 현재 비밀번호로 변경 시도 (엣지케이스) | ✅ "현재 비밀번호가 올바르지 않습니다." 알림 정상 표시 | `19-password-change-wrong-current.png` |
| 올바른 현재 비밀번호로 변경 | ⚠️ **결함 발견(#1, 아래 참조)** | `20-BUG-password-change-json-parse-error.png`, `21-login-with-changed-password-succeeds.png` |

### 시나리오 7 — Admin 로그인 및 프로모션 등록 (§7)

| 스텝 | 결과 | 스크린샷 |
|------|------|----------|
| Admin 로그인 → 프로모션 관리 화면 자동 이동 | ✅ GNB에 "관리자" 배지 표시 | `25-admin-promotion-list.png` |
| DIRECT 프로모션 신규 등록 | ✅ | `26-admin-promotion-form-direct.png` |
| ROULETTE 프로모션 신규 등록(최대 참여 횟수 입력란 노출 확인) | ✅ | `27-admin-promotion-form-roulette.png` |
| 등록된 프로모션명 수정 | ✅ 수정 모드에서 type 라디오 비활성화 확인(규칙: 등록 후 타입 변경 불가) | `30-admin-promotion-edit.png` |

### 시나리오 8 — 조기 종료 및 참여 현황 조회 (§8)

| 스텝 | 결과 | 스크린샷 |
|------|------|----------|
| DIRECT 참여 현황 조회 (건수만 표시, WIN/LOSE 없음) | ✅ 규칙대로 DIRECT는 카운트 미표시 | `28-admin-participation-status-direct.png` |
| ROULETTE 참여 현황 조회 (WIN/LOSE 카운트) | ✅ | `29-admin-participation-status-roulette.png` |
| 조기종료 확인 취소(엣지케이스) | ✅ confirm 취소 시 상태 유지, PATCH 미호출 | (해당 상태 유지 확인, 별도 캡처 없음) |
| 조기종료 확인(수락) | ✅ 상태 "종료"로 즉시 전환, 조기종료 버튼 사라짐 | `31-admin-early-end-success.png` |
| 종료 후 사용자가 신규 참여 시도 (규칙9) | ⚠️ **결함 발견(#3, 아래 참조)** — 백엔드는 정상 거부하나 프론트가 버튼을 계속 노출 | `32-BUG-ended-promotion-roulette-button-visible.png`, `33-BUG-ended-promotion-roulette-rejected.png` |

### 접근 제어 / 라우팅 엣지 케이스

| 케이스 | 결과 | 스크린샷 |
|--------|------|----------|
| 비로그인 상태로 보호된 라우트(`/me`) 접근 | ✅ `/login`으로 리다이렉트 | `22-protected-route-redirect-to-login.png` |
| USER가 `/admin/promotions` 직접 접근 | ✅ `/`로 리다이렉트(역할 불일치) | `23-user-admin-route-redirect.png` |
| 존재하지 않는 프로모션 상세 조회 | ⚠️ **결함 발견(#2, 아래 참조)** — 404 처리는 되지만 응답까지 과도하게 지연 | `24-BUG-promotion-404-slow-retry.png` |

### 반응형 UI (`docs/2-PRD.md` §7)

| 케이스 | 결과 | 스크린샷 |
|--------|------|----------|
| 모바일 뷰포트(390×844)에서 프로모션 목록 | ✅ 그리드가 1열로 재배치됨 | `35-mobile-promotion-list.png` |
| 모바일 뷰포트에서 내 참여내역 표(가로 스크롤) | ✅ 표가 컨테이너 내부에서만 가로 스크롤, 페이지 자체는 스크롤 없음 | `36-mobile-my-participations-table-scroll.png` |

---

## 2. 발견된 결함 (Bug)

### 🐞 결함 #1 — 비밀번호 변경 성공 시 프론트엔드가 빈 응답 바디 파싱에 실패하여 크래시

- **재현 경로**: 마이페이지 → 비밀번호 변경 → 올바른 현재 비밀번호 + 새 비밀번호 입력 → "비밀번호 변경" 클릭
- **증상**: 화면에 `Failed to execute 'json' on 'Response': Unexpected end of JSON input` 라는 원본 JS 예외 메시지가 그대로 노출됨. 로그아웃/재로그인 유도(정상 흐름)가 실행되지 않아 사용자는 비밀번호 변경이 실패한 것으로 오인함.
- **실제 서버 동작**: 비밀번호는 **정상적으로 변경됨** (새 비밀번호로 재로그인 성공 확인 — `21-login-with-changed-password-succeeds.png`).
- **원인 추정**: `frontend/src/api/httpClient.ts`의 `request()` 함수(66~71줄 부근)가 성공 응답 처리 시 `res.status === 204`만 특별 처리하고, 그 외 성공 상태 코드(예: 200)에서 응답 바디가 비어 있는 경우를 고려하지 않고 무조건 `res.json()`을 호출함. `PUT /me/password`가 본문 없는 200을 반환하는 것으로 보이며, 이 경우 `res.json()`이 예외를 던지고 `onSuccess` 콜백(로그아웃 처리)이 실행되지 못함.
- **영향도**: 높음 — 실제 데이터 변경은 성공했음에도 사용자에게는 실패로 보이는 상태 불일치(silent success, apparent failure). 사용자가 같은 비밀번호로 재시도하면 혼란 가중.
- **스크린샷**: `20-BUG-password-change-json-parse-error.png`

### 🐞 결함 #2 — 존재하지 않는 프로모션 조회 시 오류 표시까지 약 10초 이상 지연

- **재현 경로**: 로그인 상태에서 존재하지 않는 프로모션 UUID로 상세 페이지 직접 접근 (`/promotions/00000000-0000-0000-0000-000000000000`)
- **증상**: "불러오는 중..." 상태가 약 10초 이상 지속된 뒤에야 "프로모션을 찾을 수 없습니다." 오류가 표시됨.
- **원인 추정**: `frontend/src/App.tsx`에서 생성하는 전역 `QueryClient`가 옵션 없이 `new QueryClient()`로 생성되어 TanStack Query 기본값인 `retry: 3`(지수 백오프, 최대 지연 포함 시 수 초~수십 초)이 404 같은 재시도해도 의미 없는 오류에도 그대로 적용됨.
- **영향도**: 중간 — 기능적으로는 최종 오류 메시지가 표시되지만, 사용자 체감 응답 속도가 크게 저하됨. 다른 4xx 오류(예: 삭제된 프로모션 링크 공유 등)에서도 동일하게 재현될 가능성 있음.
- **스크린샷**: `24-BUG-promotion-404-slow-retry.png`

### 🐞 결함 #3 — 조기종료(ENDED)된 프로모션 상세에서도 응모/룰렛 버튼이 계속 노출됨

- **재현 경로**: Admin이 프로모션을 조기종료 → 동일 프로모션을 User가 상세 페이지에서 조회
- **증상**: 상태 칩은 "종료"로 정확히 표시되지만, "룰렛 실행하기"(ROULETTE) / "응모하기"(DIRECT, 코드 확인상 동일 패턴) 버튼이 그대로 노출됨. 클릭 시 백엔드가 "진행 중인 프로모션이 아닙니다."로 정상 거부하지만, 사용자 입장에서는 클릭 가능한 버튼이 실패하는 UX로 보임.
- **원인 추정**: `frontend/src/pages/PromotionDetail.tsx`의 버튼 노출 조건이 ROULETTE의 경우 `remaining > 0`(잔여 횟수)만, DIRECT의 경우 `directResult !== 'APPLIED'`만 검사하고 `promotion.status === 'ONGOING'` 여부를 반영하지 않음.
- **영향도**: 낮음~중간 — 백엔드 검증으로 실제 데이터 무결성은 지켜지나(규칙9 준수), 프론트엔드 UX 상 불필요한 오류를 사용자가 겪게 됨.
- **스크린샷**: `32-BUG-ended-promotion-roulette-button-visible.png`, `33-BUG-ended-promotion-roulette-rejected.png`

---

## 3. 결함 외 참고 관찰 사항 (Bug 아님)

- DIRECT 응모 후 새로고침하면 로컬 컴포넌트 상태(`directResult`)가 초기화되어 "응모하기" 버튼이 다시 보임(서버에 기 응모 여부를 조회하지 않음). 재클릭 시 백엔드가 중복 응모로 정상 거부하므로 데이터 정합성 문제는 없으나, 새로고침 후에도 "이미 응모함" 상태를 바로 보여주지 못하는 UX 개선 여지가 있음. (`07-direct-applied.png` → 새로고침 → `08-direct-duplicate-error.png` 흐름에서 확인)
- Admin 참여 현황(ROULETTE)의 "결과" 컬럼은 사용자별 여러 회차 결과 중 대표값 하나만 표시함(예: LOSE→WIN 순서로 시도한 사용자도 "WIN"으로 표시). 회차별 상세는 표시되지 않으며, 이는 명세상 허용 범위로 판단되나 참고로 기록.

---

## 4. 테스트 데이터

- 신규 가입 사용자: `e2euser01` / 최초 비밀번호 `Passw0rd!23` → 변경 후 `NewPassw0rd!23`
- Admin 계정: `admin` / `ChangeMe123!` (DB seed 기본값)
- 신규 등록한 테스트 프로모션: "E2E 테스트 DIRECT 프로모션", "E2E 테스트 ROULETTE 프로모션(수정됨)"(테스트 중 조기종료 처리됨)
