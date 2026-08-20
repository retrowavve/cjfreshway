# 실행계획 - 응모해

## 변경이력

| 버전 | 날짜       | 변경내용                                                                                                                           |
| ---- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| v1.0 | 2026-08-13 | 최초 작성: DB/백엔드/프론트엔드 Task 분해 및 실행계획 수립                                                                         |
| v1.1 | 2026-08-13 | Task 의존관계도(mermaid) 추가                                                                                                      |
| v1.2 | 2026-08-13 | swagger.json과의 정합성 반영: B8 완료조건에 result 필드 추가, B3 필드명 주석(myAttemptCount), B4에 PRD §8 일정 표기 차이 설명 추가 |
| v1.3 | 2026-08-13 | D1 수행 완료: postgresql-mcp로 5개 테이블·UNIQUE 제약·append-only 트리거 검증, Admin seed 계정 생성. D1 완료 조건 4개 모두 체크    |
| v1.4 | 2026-08-13 | B1 수행 완료: Express 앱/pool/errorHandler/server 구현, node:test 테스트 6건 전부 통과(커버리지 91.11%), B1 완료 조건 4개 모두 체크 |
| v1.5 | 2026-08-20 | B2 수행 완료: 인증 API(회원가입/로그인/토큰재발급) 및 authMiddleware 구현, node:test 테스트 19건 전부 통과(커버리지 96.84%), B2 완료 조건 6개 모두 체크 |
| v1.6 | 2026-08-20 | B3 수행 완료: 프로모션 조회 API(목록/상세, status 동적 산정, myAttemptCount) 구현, node:test 테스트 31건 전부 통과(전체 커버리지 97.33%), B3 완료 조건 3개 모두 체크 |
| v1.7 | 2026-08-20 | B4 수행 완료: Admin 프로모션 관리 API(등록/수정/조기종료/전체목록) 및 adminOnlyMiddleware(403) 구현, node:test 테스트 52건 전부 통과(전체 커버리지 95.17%), B4 완료 조건 4개 모두 체크 |
| v1.8 | 2026-08-20 | B5 수행 완료: 프로모션 참여 API(DIRECT 응모/ROULETTE 시도, 트랜잭션·동시성 방어) 구현, node:test 테스트 69건 전부 통과(동시성 테스트 2건 포함, 전체 커버리지 96.19%), B5 완료 조건 7개 모두 체크 |
| v1.9 | 2026-08-20 | B6 수행 완료: 참여 취소/재신청 API(status 조건부 전환, 본인 소유 검증) 구현, node:test 테스트 83건 전부 통과(전체 커버리지 95.99%), B6 완료 조건 4개 모두 체크 |
| v1.10 | 2026-08-20 | B7 수행 완료: 내 참여내역 API(GET /me/participations, ROULETTE 회차별 attempts 배치 조회) 구현, node:test 테스트 89건 전부 통과(전체 커버리지 95.93%), B7 완료 조건 3개 모두 체크 |
| v1.11 | 2026-08-20 | B8 수행 완료: 관리자 참여 현황 API(GET /admin/promotions/:id/participations, DISTINCT ON 최신 attempt 집계) 구현, node:test 테스트 94건 전부 통과(전체 커버리지 96.17%), B8 완료 조건 3개 모두 체크 |
| v1.12 | 2026-08-20 | B9 수행 완료: 마이페이지 API(GET/PUT /me, PUT /me/password) 구현, node:test 테스트 104건 전부 통과(전체 커버리지 95.75%), B9 완료 조건 3개 모두 체크 |
| v1.13 | 2026-08-20 | F1 수행 완료: 프론트엔드 셋업(Vite+React 19+TS, Zustand authStore, TanStack Query, react-router-dom), API 클라이언트(httpClient 401→refresh→재시도), 보호 라우트(ProtectedRoute) 구현, Vitest 테스트 19건 전부 통과(대상 소스 커버리지 98.76%), F1 완료 조건 4개 모두 체크 |
| v1.14 | 2026-08-20 | F2 수행 완료: 회원가입/로그인 화면(10-style.md 컬러 토큰 적용) 구현, 로그인 성공 시 role별 리다이렉트(USER→`/`, ADMIN→`/admin/promotions`), 서버 에러 메시지 노출, Vitest 테스트 31건 전부 통과(대상 소스 커버리지 99.15%), F2 완료 조건 4개 모두 체크 |
| v1.15 | 2026-08-20 | F3 수행 완료: 프로모션 목록(카드 그리드, type 배지, 기간)/상세(description, 타입별 하단 액션) 화면 구현, ROULETTE 잔여 시도 횟수 표시, Vitest 테스트 40건 전부 통과(대상 소스 커버리지 99.36%), F3 완료 조건 4개 모두 체크. 응모/룰렛 버튼은 표시만 하고 실제 참여 API 연동은 F4 범위로 명시적으로 남김 |
| v1.16 | 2026-08-20 | F4 수행 완료: DIRECT 응모(PENDING 표시, 409 거부 사유 노출)/ROULETTE 실행(WIN·LOSE·회차·잔여횟수 결과 카드, 소진 시 버튼 미노출, mutation.isPending으로 중복클릭 방지) 구현, Vitest 테스트 46건 전부 통과(대상 소스 커버리지 98.61%), F4 완료 조건 5개 모두 체크 |
| v1.17 | 2026-08-20 | F5 수행 완료: 내 참여내역 표(프로모션명/방식/상태/결과/참여일/액션), ROULETTE 회차별 결과, 취소/재신청 mutation(재조회 방식으로 상태 갱신) 구현, Vitest 테스트 54건 전부 통과(대상 소스 커버리지 99.11%), F5 완료 조건 5개 모두 체크 |
| v1.18 | 2026-08-20 | F6 수행 완료: 마이페이지(정보 조회/수정, User·Admin 필드 분기, 비밀번호 변경 후 로그아웃→재로그인 유도, User 전용 참여내역 링크) 구현, Vitest 테스트 61건 전부 통과(대상 소스 커버리지 98.72%), F6 완료 조건 3개 모두 체크 |
| v1.19 | 2026-08-20 | F7 수행 완료: 관리자 화면 3종(프로모션 등록/수정 폼 — type ROULETTE만 maxParticipationCount 노출·수정 시 type 변경불가, 프로모션 목록 관리 — ONGOING만 조기종료 버튼·confirm 후 PATCH, 참여 현황 — 참여자 수/목록/ROULETTE WIN·LOSE 집계) 구현, Vitest 테스트 77건 전부 통과(대상 소스 커버리지 98.68%), F7 완료 조건 4개 모두 체크 |
| v1.20 | 2026-08-20 | F8 수행 완료: 반응형 스타일 점검 — 전역 box-sizing/body margin 리셋 누락 발견해 추가(모바일 가로 스크롤 위험 제거), 표 화면 3종의 컨테이너 스크롤 패턴 재확인, 헤더/요약 영역 flex-wrap 보강. Vitest 77건 전부 통과(회귀 없음), F8 완료 조건 3개 모두 체크. 프론트엔드 F1~F8 전체 완료 |

`docs/1-domain-definition.md`(엔티티·규칙), `docs/2-PRD.md`(§5 우선순위·§8 3일 일정), `docs/5-project-principle.md`(디렉토리 구조·레이어), `docs/7-wireframe.md`(화면), `docs/8-erd.md`·`docs/8-schema.sql`(스키마)을 전제로 작성.

## Task 개요

| ID  | 영역   | Task                                    | 선행 Task  | 일정    |
| --- | ------ | --------------------------------------- | ---------- | ------- |
| D1  | DB     | 스키마 생성 및 seed                     | -          | Day 1   |
| B1  | 백엔드 | 프로젝트 셋업 · DB 연결                 | D1         | Day 1   |
| B2  | 백엔드 | 인증 API (회원가입/로그인/토큰재발급)   | B1         | Day 1   |
| B3  | 백엔드 | 프로모션 조회 API (User)                | B1         | Day 1   |
| B4  | 백엔드 | 프로모션 관리 API (Admin)               | B2         | Day 1   |
| B5  | 백엔드 | 프로모션 참여 API (DIRECT/ROULETTE)     | B2, B3     | Day 2   |
| B6  | 백엔드 | 참여 취소/재신청 API                    | B5         | Day 2   |
| B7  | 백엔드 | 내 참여내역 API                         | B5         | Day 2   |
| B8  | 백엔드 | 관리자 참여 현황 API                    | B5         | Day 3   |
| B9  | 백엔드 | 마이페이지 API (정보수정/비밀번호변경)  | B2         | Day 3   |
| B10 | 백엔드 | 핵심 비즈니스 규칙 테스트               | B5, B6     | Day 2~3 |
| F1  | 프론트 | 프로젝트 셋업 · 라우팅 · API 클라이언트 | -          | Day 1   |
| F2  | 프론트 | 인증 화면 · authStore                   | F1, B2     | Day 1   |
| F3  | 프론트 | 프로모션 목록/상세 화면                 | F2, B3     | Day 1   |
| F4  | 프론트 | 참여 화면 (DIRECT 응모 / ROULETTE 룰렛) | F3, B5     | Day 2   |
| F5  | 프론트 | 내 참여내역 화면 (취소/재신청 포함)     | F2, B6, B7 | Day 2~3 |
| F6  | 프론트 | 마이페이지 화면                         | F2, B9     | Day 3   |
| F7  | 프론트 | 관리자 화면 (등록/수정/목록관리/현황)   | F2, B4, B8 | Day 3   |
| F8  | 프론트 | 반응형 스타일 점검                      | F3~F7      | Day 3   |

## Task 의존관계도

```mermaid
flowchart LR
    subgraph DB["DB"]
        D1["D1 스키마 생성/seed"]
    end

    subgraph BE["백엔드"]
        B1["B1 셋업·DB연결"]
        B2["B2 인증 API"]
        B3["B3 프로모션 조회 API"]
        B4["B4 프로모션 관리 API"]
        B5["B5 참여 API"]
        B6["B6 취소/재신청 API"]
        B7["B7 참여내역 API"]
        B8["B8 참여 현황 API"]
        B9["B9 마이페이지 API"]
        B10["B10 규칙 테스트"]
    end

    subgraph FE["프론트엔드"]
        F1["F1 셋업·라우팅"]
        F2["F2 인증 화면"]
        F3["F3 목록/상세 화면"]
        F4["F4 참여 화면"]
        F5["F5 참여내역 화면"]
        F6["F6 마이페이지 화면"]
        F7["F7 관리자 화면"]
        F8["F8 반응형 점검"]
    end

    D1 --> B1
    B1 --> B2
    B1 --> B3
    B2 --> B4
    B2 --> B5
    B3 --> B5
    B5 --> B6
    B5 --> B7
    B5 --> B8
    B2 --> B9
    B5 --> B10
    B6 --> B10

    F1 --> F2
    B2 --> F2
    F2 --> F3
    B3 --> F3
    F3 --> F4
    B5 --> F4
    F2 --> F5
    B6 --> F5
    B7 --> F5
    F2 --> F6
    B9 --> F6
    F2 --> F7
    B4 --> F7
    B8 --> F7
    F3 --> F8
    F4 --> F8
    F5 --> F8
    F6 --> F8
    F7 --> F8
```

---

## D1. DB 스키마 생성 및 seed

**선행 Task**: 없음

**작업 내용**

- PostgreSQL 17 데이터베이스 생성
- `docs/8-schema.sql` 실행하여 5개 테이블 생성
- Admin 초기 계정 seed 스크립트 작성 (`backend/src/seed/`)

**완료 조건**

- [x] `users`, `admins`, `promotions`, `participations`, `participation_attempts` 5개 테이블이 생성됨
- [x] `participations`에 `UNIQUE (user_id, promotion_id)` 제약이 존재함 (규칙3)
- [x] `participation_attempts`에 UPDATE/DELETE 차단 트리거가 동작함 (규칙4) — UPDATE 시도 시 예외 발생 확인
- [x] Admin 계정 1건이 seed로 생성되고 bcrypt 해시로 저장됨

---

## B1. 백엔드 프로젝트 셋업 · DB 연결

**선행 Task**: D1

**작업 내용**

- `backend/` 프로젝트 초기화 (Express, pg, jsonwebtoken, bcrypt, cors, dotenv)
- `src/db/pool.js` — pg Pool 설정
- `src/app.js` — Express 앱, CORS, JSON 파서, 공통 에러 핸들러
- `.env.example` 작성 (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PORT`)

**완료 조건**

- [x] `npm start`로 서버가 기동됨
- [x] DB 연결 확인용 요청이 정상 응답함
- [x] 에러 응답이 `{ code, message }` 형태로 통일됨
- [x] `.env`가 git에 포함되지 않음

---

## B2. 인증 API

**선행 Task**: B1

**작업 내용**

- `POST /auth/signup` — User 회원가입 (Admin은 회원가입 없음, seed로만 생성)
- `POST /auth/login` — User/Admin 공통 로그인, access/refresh token 발급
- `POST /auth/refresh` — refresh token으로 access token 재발급
- `src/middlewares/authMiddleware.js` — access token 검증, 요청에 사용자/역할 주입

**완료 조건**

- [x] 회원가입 시 비밀번호가 bcrypt 해시로 저장됨 (평문 저장/로깅 없음)
- [x] 중복 `loginId` 가입 시도가 거부됨
- [x] 로그인 성공 시 access token(단기)과 refresh token(장기)이 함께 발급됨
- [x] 만료/위조된 access token으로 보호된 API 호출 시 401 응답
- [x] refresh token으로 새 access token을 재발급받을 수 있음
- [x] authMiddleware가 User/Admin 역할을 구분해 주입함

---

## B3. 프로모션 조회 API (User)

**선행 Task**: B1

**작업 내용**

- `GET /promotions` — 진행중(ONGOING) 프로모션 목록
- `GET /promotions/:id` — 프로모션 상세
- `status`는 `startAt`/`endAt`과 현재시각 기준으로 산정 (도메인 정의서 §5)

**완료 조건**

- [x] 목록 API가 ONGOING 상태 프로모션만 반환함
- [x] 상세 API가 title, type, description, startAt, endAt, status, maxParticipationCount를 반환함
- [x] ROULETTE 상세 조회 시 로그인 사용자의 현재 `attemptCount`가 함께 반환됨 (잔여 횟수 표시용, API 응답 필드명은 `swagger.json` 기준 `myAttemptCount`)

---

## B4. 프로모션 관리 API (Admin)

**선행 Task**: B2

> 참고: PRD §8 일정표는 "등록"을 Day1, "수정/조기종료"를 Day3로 구분 표기하지만, 이는 화면(F7) 노출 시점 기준이다. API(B4)는 등록/수정/조기종료를 한 번에 Day1에 구현하고, 수정·조기종료 화면(F7)만 Day3에 붙인다.

**작업 내용**

- `POST /admin/promotions` — 등록 (`createdBy` = 로그인 Admin)
- `PUT /admin/promotions/:id` — 수정
- `PATCH /admin/promotions/:id/end` — 조기 종료 (status → ENDED)
- `GET /admin/promotions` — 전체 프로모션 목록 (상태 무관)

**완료 조건**

- [x] Admin 토큰 없이 호출 시 403으로 거부됨 (규칙8) — 토큰 자체가 없으면 401(UNAUTHORIZED), 로그인은 했으나 Admin이 아니면 403(FORBIDDEN)으로 세분화하여 둘 다 검증
- [x] 등록 시 startAt/endAt 기준으로 status가 UPCOMING 또는 ONGOING으로 자동 산정됨
- [x] ROULETTE 등록 시 `maxParticipationCount`가 1 이상으로 저장되고, DIRECT는 1로 고정됨
- [x] 조기 종료 후 해당 프로모션의 status가 ENDED이고, 기존 Participation/ParticipationAttempt는 변경되지 않음 (규칙9)

---

## B5. 프로모션 참여 API

**선행 Task**: B2, B3

**작업 내용**

- `POST /promotions/:id/participate` — DIRECT 응모
- `POST /promotions/:id/roulette` — ROULETTE 시도 (Participation 없으면 생성 후 시도)
- 참여 생성/시도 증가/Attempt 생성은 하나의 트랜잭션으로 처리
- 룰렛 당첨 판정 로직 (MVP: 고정 확률 기반 난수)

**완료 조건**

- [x] 비로그인 요청이 401로 거부됨 (규칙1)
- [x] UPCOMING/ENDED 프로모션 참여 요청이 거부됨 (규칙2)
- [x] DIRECT 응모 시 Participation이 status=APPLIED, attemptCount=1, result=PENDING으로 생성됨
- [x] DIRECT에서 이미 APPLIED/REAPPLIED 상태인 사용자의 재응모가 거부됨 (규칙5)
- [x] ROULETTE 시도마다 attemptCount가 1 증가하고 ParticipationAttempt가 1건 생성되며 WIN/LOSE가 즉시 확정됨 (규칙6)
- [x] attemptCount가 maxParticipationCount에 도달하면 추가 시도가 거부됨 (규칙6)
- [x] 동일 사용자의 동시 요청에서도 (user, promotion) 조합 Participation이 2건 생성되지 않음 (규칙3, UNIQUE 제약으로 방어) — DIRECT는 UNIQUE 제약 위반(23505)을 409로 변환, ROULETTE는 `INSERT ... ON CONFLICT DO NOTHING` + `SELECT ... FOR UPDATE` row-lock으로 방어, 동시 요청 테스트로 실증 검증

---

## B6. 참여 취소/재신청 API

**선행 Task**: B5

**작업 내용**

- `PATCH /participations/:id/cancel` — status → CANCELLED
- `PATCH /participations/:id/reapply` — status → REAPPLIED

**완료 조건**

- [x] 취소/재신청 시 새 레코드가 생성되지 않고 기존 레코드의 status만 전환됨 (규칙3)
- [x] 재신청은 프로모션이 ONGOING일 때만 허용됨 (규칙2, `4-user-scenario.md` §4) — 취소는 프로모션 상태와 무관하게 항상 허용
- [x] 재신청 후에도 기존 ParticipationAttempt 결과가 그대로 유지됨 (규칙4) — 서비스 로직이 participation_attempts 테이블을 전혀 접근하지 않아 자연히 보존
- [x] 본인 소유가 아닌 Participation에 대한 요청이 거부됨

---

## B7. 내 참여내역 API

**선행 Task**: B5

**작업 내용**

- `GET /me/participations` — 로그인 사용자의 참여내역 목록
- DIRECT는 `result`, ROULETTE는 회차별 ParticipationAttempt 목록을 포함

**완료 조건**

- [x] 프로모션명, 참여방식, 참여일시, status가 반환됨
- [x] ROULETTE 항목에 회차별(attemptNo) WIN/LOSE 결과가 포함됨
- [x] ENDED 프로모션의 참여내역도 계속 조회됨 (규칙7) — 조회 쿼리에 프로모션 상태 조건이 없어 자동 충족

---

## B8. 관리자 참여 현황 API

**선행 Task**: B5

**작업 내용**

- `GET /admin/promotions/:id/participations` — 참여자 목록 및 집계

**완료 조건**

- [x] 총 참여자 수와 참여자별(사업체명/담당자/상태/결과/참여일) 목록이 반환됨 (`7-wireframe.md` §11) — CANCELLED 포함 전체 이력, 상태 필터 없음
- [x] ROULETTE 프로모션은 WIN/LOSE 집계가 함께 반환됨 — 참여자별 최신 ParticipationAttempt 결과(DISTINCT ON) 기준 집계, DIRECT는 winCount/loseCount 필드 자체를 생략
- [x] Admin 토큰 없이 호출 시 거부됨

---

## B9. 마이페이지 API

**선행 Task**: B2

**작업 내용**

- `GET /me` / `PUT /me` — 내 정보 조회·수정 (User: businessName/name/phone, Admin: name)
- `PUT /me/password` — 비밀번호 변경 (현재 비밀번호 검증 후 변경)

**완료 조건**

- [x] User/Admin 모두 자신의 정보를 조회·수정할 수 있음 — role별 허용 필드만 반영, 그 외 필드는 조용히 무시
- [x] 현재 비밀번호가 틀리면 변경이 거부됨
- [x] 변경된 비밀번호가 bcrypt 해시로 저장되고, 새 비밀번호로 로그인됨

---

## B10. 핵심 비즈니스 규칙 테스트

**선행 Task**: B5, B6

**작업 내용**

- `5-project-principle.md` §4 표의 5개 규칙에 대한 최소 테스트 작성 (프레임워크 없이 assert 기반 스크립트 가능)

**완료 조건**

- [ ] (Promotion, User) 조합당 Participation 유일성 검증 (규칙3)
- [ ] DIRECT 중복응모 거부 검증 (규칙5)
- [ ] ROULETTE maxParticipationCount 초과 거부 검증 (규칙6)
- [ ] 확정된 ParticipationAttempt 수정 불가 검증 (규칙4)
- [ ] UPCOMING/ENDED 프로모션 참여 거부 검증 (규칙2)
- [ ] 전체 테스트가 한 번의 명령으로 실행되고 통과함

---

## F1. 프론트엔드 셋업 · 라우팅 · API 클라이언트

**선행 Task**: 없음 (B1과 병행 가능)

**작업 내용**

- `frontend/` 초기화 (React 19, Zustand, TanStack Query, 라우터)
- `src/api/` — fetch 래퍼, access token 자동 첨부, 401 시 refresh 재시도
- `src/router.tsx` — 라우트 정의, 인증 보호 라우트 처리
- `src/types/` — 도메인 타입 정의

**완료 조건**

- [x] 개발 서버가 기동되고 빈 라우트가 렌더링됨 — Vite dev 서버 5173 포트 기동 확인, router 테스트로 placeholder 페이지 렌더 검증
- [x] QueryClientProvider가 앱 최상단에 설정됨 — `App.tsx`에서 `RouterProvider`를 감싸는 최상단에 배치
- [x] API 클라이언트가 access token을 자동 첨부하고, 401 시 refresh 후 1회 재시도함 — `httpClient.ts`, 재시도 성공/실패/무한루프 방지 케이스 포함 테스트 9건 통과
- [x] 미인증 상태로 보호 라우트 접근 시 로그인 화면으로 리다이렉트됨 — `ProtectedRoute`, role 불일치 시 `/`로 리다이렉트도 함께 검증

---

## F2. 인증 화면 · authStore

**선행 Task**: F1, B2

**작업 내용**

- 회원가입 화면 (`7-wireframe.md` §1)
- 로그인 화면 (§2, User/Admin 공통)
- `src/stores/authStore.ts` — 로그인 사용자, 역할, 토큰 보관

**완료 조건**

- [x] 회원가입 후 로그인 화면으로 이동함 — 가입 성공(201) 시 `/login`으로 navigate
- [x] 로그인 성공 시 User는 프로모션 목록, Admin은 프로모션 관리 화면으로 이동함 — `user.role`에 따라 `/`(USER) / `/admin/promotions`(ADMIN) 분기
- [x] 새로고침 후에도 로그인 상태가 유지됨 — zustand persist(localStorage), 모듈 재로드 시나리오로 재수화 검증
- [x] 로그인 실패 시 원인을 알 수 있는 오류 메시지가 표시됨 — 서버 `ApiError.message`를 `role="alert"` 영역에 노출(401/400 모두, 회원가입 400/409도 동일)

---

## F3. 프로모션 목록/상세 화면

**선행 Task**: F2, B3

**작업 내용**

- 프로모션 목록 화면 (§3) — 카드형, DIRECT/ROULETTE 배지
- 프로모션 상세 화면 (§4) — 타입별 하단 액션 분기

**완료 조건**

- [x] ONGOING 프로모션만 카드로 표시되고, title/type/기간이 노출됨 — 서버(B3)가 이미 ONGOING만 반환, 프론트는 재필터링 없이 그대로 렌더
- [x] 카드 클릭 시 상세 화면으로 이동함 — 카드 전체를 `Link`로 감싸 `/promotions/:id`로 이동
- [x] 상세에서 기간/혜택/참여조건/참여방식/유의사항이 표시됨 — `description` 단일 필드에 통합 표시(도메인 정의서 §3과 일치)
- [x] ROULETTE 상세에 잔여 시도 횟수가 표시됨 — `maxParticipationCount - (myAttemptCount ?? 0)`로 계산, 비로그인 시 최대치로 표시. 응모/룰렛 버튼은 표시만 하고 동작(API 연동)은 F4 범위로 남김

---

## F4. 참여 화면 (DIRECT / ROULETTE)

**선행 Task**: F3, B5

**작업 내용**

- DIRECT 응모 버튼 및 결과 표시
- ROULETTE 실행 UI와 결과 표시 (§5)

**완료 조건**

- [x] DIRECT 응모 성공 시 응모 완료(PENDING)가 표시됨 — 응모 버튼을 "응모 완료 (PENDING)" 텍스트로 교체
- [x] 중복 응모 시도 시 거부 사유가 화면에 표시됨 — 서버 409 `ApiError.message`를 `role="alert"`로 노출
- [x] 룰렛 실행 후 WIN/LOSE 결과와 회차, 잔여 횟수가 표시됨 — mutation 응답(`RouletteResult`)을 그대로 결과 카드에 표시, 재조회 없이 단일 응답으로 처리
- [x] 잔여 횟수 소진 시 실행 버튼이 비활성화되거나 노출되지 않음 — `remaining>0` 조건부 렌더로 버튼 자체를 DOM에서 제거(초기 로드 시점/실행 후 소진 시점 모두 동일 조건식으로 처리)
- [x] 참여 요청 중 중복 클릭으로 2건이 생성되지 않음 — `mutation.isPending`으로 버튼 `disabled` 처리, fetch 지연 mock으로 재클릭이 무시됨을 검증

---

## F5. 내 참여내역 화면

**선행 Task**: F2, B6, B7

**작업 내용**

- 참여내역 목록 (§6) — 모바일 카드 / 데스크탑 표
- 취소·재신청 액션

**완료 조건**

- [x] 프로모션명, 참여방식, status, 참여일이 표시됨 — 표(`myp-table`) 형태, 좁은 화면은 컨테이너 가로 스크롤로 대응(마크업 이중화 없이 반응형 처리)
- [x] ROULETTE 항목에 회차별 WIN/LOSE가 표시됨 — `attempts` 배열을 `N회차: WIN/LOSE` 목록으로 렌더
- [x] 취소 시 status가 CANCELLED로 갱신되어 화면에 반영됨 — `cancelMutation` 성공 시 `invalidateQueries(['myParticipations'])`로 재조회
- [x] 재신청 시 status가 REAPPLIED로 갱신되고, 기존 룰렛 결과는 유지됨 — 서버가 attempts를 그대로 유지해 응답, 프론트는 재조회 결과를 그대로 렌더(별도 보존 로직 불필요)
- [x] ENDED 프로모션의 내역도 조회됨 — 프론트에 상태/타입 기반 필터링 코드 없음, 서버 응답을 그대로 전부 렌더

---

## F6. 마이페이지 화면

**선행 Task**: F2, B9

**작업 내용**

- 마이페이지 (§7) — 정보 수정, 비밀번호 변경, 참여내역 진입

**완료 조건**

- [x] 내 정보가 조회되고 수정 후 저장이 반영됨 — `GET /me` 조회 후 폼 초기화, `PUT /me` 응답으로 캐시(`setQueryData`)와 폼을 재조회 없이 즉시 갱신
- [x] 비밀번호 변경이 성공하고, 새 비밀번호로 재로그인됨 — 성공 시 `logout()` 후 `/login` 이동, 로그인 화면에서 새 비밀번호로 실제 로그인 성공까지 통합 테스트로 검증
- [x] User에게만 "내 참여내역 보기"가 노출됨 — `role === 'USER'` 조건부 렌더, Admin은 링크 자체가 DOM에 없음

---

## F7. 관리자 화면

**선행 Task**: F2, B4, B8

**작업 내용**

- 프로모션 등록/수정 폼 (§9)
- 프로모션 목록 관리 (§10) — 수정/조기종료/현황 액션
- 참여 현황 조회 (§11)

**완료 조건**

- [x] 등록 폼에서 type이 ROULETTE일 때만 maxParticipationCount 입력이 노출됨 — 등록 모드는 라디오 실시간 반응, 수정 모드는 조회된 기존 type으로 고정(type 자체는 PromotionUpdateRequest에 없어 수정 불가, 라디오 disabled)
- [x] 등록/수정이 목록에 즉시 반영됨 — 저장 성공 시 `invalidateQueries(['adminPromotions'])` 후 목록으로 이동(폼과 목록이 별도 마운트라 캐시 invalidate가 유일한 반영 수단)
- [x] 조기 종료는 ONGOING 프로모션에만 노출되고, 실행 시 상태가 ENDED로 바뀜 — `status==='ONGOING'` 조건부 버튼, `window.confirm` 확인 후 PATCH, 성공 시 재조회로 화면 반영
- [x] 참여 현황에서 참여자 수와 참여자 목록이 표시되고, ROULETTE는 당첨 현황이 함께 표시됨 — `winCount`/`loseCount` 필드 존재 여부로 ROULETTE 여부 판단(별도 타입 조회 불필요), 프로모션명 타이틀은 완료조건에 없어 API 추가 호출 없이 생략

---

## F8. 반응형 스타일 점검

**선행 Task**: F3~F7

**작업 내용**

- `7-wireframe.md`의 모바일/데스크탑 레이아웃 대조 점검

**완료 조건**

- [x] User 화면이 모바일 폭에서 가로 스크롤 없이 표시됨 — 전역 `box-sizing:border-box`+`body margin:0` 리셋 누락을 발견해 추가(리셋이 없으면 `width:90%`+`padding` 조합인 `.auth-form` 등이 좁은 화면에서 뷰포트를 넘어설 위험이 있었음)
- [x] Admin 표 화면이 좁은 폭에서 카드 형태로 전환되거나 컨테이너 내부에서만 가로 스크롤됨 — `MyParticipations`/`AdminPromotionList`/`AdminParticipationStatus` 3개 표 화면 모두 `.myp-table-wrap`(overflow-x:auto) + `.myp-table`(min-width:640px) 패턴으로 이미 컨테이너 내부 스크롤만 발생(F5/F7에서 확립된 반응형 원칙, 마크업 이중화 없음)
- [x] 모든 화면이 모바일/데스크탑 두 폭에서 레이아웃 깨짐 없이 표시됨 — `.promotion-header`/`.admin-summary`/`.admin-list-header`에 `flex-wrap` 보강(좁은 화면에서 제목+버튼/요약 텍스트가 겹치지 않도록), 나머지 화면은 F2~F7에서 이미 768px/480px 브레이크포인트로 반응형 처리됨을 코드 검토로 재확인. Vitest 77건 전부 통과(회귀 없음), 빌드 성공

---

## 리스크

- Day 1에 D1·B1·B2·B3·B4·F1·F2가 몰려 있어 가장 부하가 큼. 지연 시 B4(관리자 프로모션 관리)를 Day 2로 이월하고, 프로모션 데이터는 seed로 대체해 F3~F4를 먼저 진행한다.
- Should 등급(B8, B9, F5~F7)은 Day 3 소진 시 다음 이터레이션으로 이월한다 (PRD §9).
- 룰렛 애니메이션 UI는 결과 표시(텍스트) 우선 구현 후, 시간이 남을 때 연출을 추가한다.
