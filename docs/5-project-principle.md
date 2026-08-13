# 프로젝트 구조 설계 원칙 - 응모해

## 변경이력

| 버전 | 날짜 | 변경내용 |
|------|------|----------|
| v1.0 | 2026-08-13 | 최초 작성 |

`docs/1-domain-definition.md`, `docs/2-PRD.md`(§6 기술스택, §7 비기능요구사항, §8 일정, §9 리스크), `docs/3-usecase.md`, `docs/4-user-scenario.md`를 전제로, 1인 개발·3일 일정 MVP에 맞는 프로젝트 구조 원칙을 정의한다.

## 1. 최상위 공통 원칙

| 원칙 | 근거 |
|------|------|
| YAGNI: 지금 요구되는 기능만 구현한다 | 3일 일정에 없는 기능(검색, 포인트 등)을 위한 구조를 미리 만들지 않는다(PRD §4 Out of scope) |
| 표준 라이브러리/플랫폼 기능 우선 | ORM 대신 pg, 상태관리 라이브러리 난립 대신 Zustand+TanStack Query로 역할을 명확히 분리(PRD §6) |
| 파일/폴더 수를 최소로 유지한다 | 1인 개발에서 폴더를 넘나드는 탐색 비용 자체가 손실. "기능 단위로 묶고, 계층은 얕게" |
| 같은 것을 두 곳에 두지 않는다(DRY는 반복 3회부터) | 조기 추상화보다 중복 2회는 허용하고, 3번째 중복이 생길 때 함수/모듈로 뺀다 |
| 문서(도메인 정의서)와 코드의 용어를 항상 일치시킨다 | 엔티티/상태값 이름이 문서-코드 간 다르면 3일 내내 번역 비용이 발생 |
| 설계보다 동작하는 코드를 먼저 만들고, 필요할 때만 리팩터링한다 | 3일 일정에서 미리 완벽한 설계를 하는 것보다 Day1~3 우선순위(PRD §5)를 지키는 것이 더 중요 |

## 2. 의존성/레이어 원칙

- 계층은 딱 3개만 둔다: **라우트(프레젠테이션) → 서비스(비즈니스 로직) → DB 접근(pg 쿼리)**. 의존 방향은 항상 위→아래 한 방향이며, 역방향 참조·순환참조는 금지한다.
- FE도 동일하게 3분류: **페이지/컴포넌트(뷰) → 훅(TanStack Query/Zustand로 상태·API 호출 조합) → API 클라이언트(fetch 래퍼)**.
- **하지 않는 것(오버엔지니어링 금지, CLAUDE.md 최우선 지침)**
  - Repository + UseCase + Service + Controller 4중 레이어 금지 → 라우트 핸들러에서 서비스 함수를 직접 호출
  - 인터페이스 1개당 구현체 1개뿐인 추상화(예: `IUserRepository`) 금지
  - DI 컨테이너, 이벤트버스, 미들웨어 파이프라인 프레임워크 도입 금지 → Express 기본 미들웨어로 충분
  - BFF/마이크로서비스/캐시 레이어 금지(PRD §6에서 이미 배제)
- 같은 계층끼리는 서로 직접 참조하지 않는다(예: 서비스가 다른 도메인의 서비스를 호출해야 하면 함수 인자로 필요한 값만 전달).

## 3. 코드/네이밍 원칙

- **엔티티명은 도메인 정의서 용어를 그대로 사용**한다: `User`, `Admin`, `Promotion`, `Participation`, `ParticipationAttempt`. 축약(`Promo`, `Part` 등) 금지.
- 상태값(Enum)도 문서 표기를 그대로 사용: `UPCOMING/ONGOING/ENDED`, `APPLIED/CANCELLED/REAPPLIED`, `PENDING`, `WIN/LOSE`, `DIRECT/ROULETTE`.
- 파일명: FE는 `PascalCase.tsx`(컴포넌트), `camelCase.ts`(훅/유틸). BE는 `camelCase.js`(또는 `.ts`), 라우트 파일은 리소스명 복수형(`promotions.js`, `participations.js`).
- DB 테이블/컬럼명은 `snake_case`, 엔티티명과 1:1 매핑(`users`, `promotions`, `participations`, `participation_attempts`).
- 변수/함수명은 도메인 규칙을 그대로 드러내는 이름을 쓴다(예: `checkDuplicateDirectApplication`, `isAttemptLimitReached`) — 규칙 번호가 아니라 규칙 의미로 이름 짓는다.
- 코드 스타일은 프레임워크 기본값을 따르고 별도 스타일 가이드 문서를 만들지 않는다(§4 린트/포맷터로 강제).

## 4. 테스트/품질 원칙

- **전체 커버리지 강제 안 함.** 3일 일정에서는 아래 핵심 비즈니스 로직만 최소 단위 테스트(또는 self-check 스크립트)로 검증한다.

| 검증 대상 | 도메인 규칙 |
|-----------|-------------|
| (Promotion, User) 조합당 Participation 유일성 | 규칙3 |
| DIRECT 중복응모 거부 | 규칙5 |
| ROULETTE maxParticipationCount 초과 시 거부 | 규칙6 |
| 확정된 ParticipationAttempt.result는 재추첨 불가 | 규칙4 |
| UPCOMING/ENDED 프로모션 참여 거부 | 규칙2 |

- 나머지(목록 조회, 마이페이지 수정 등 단순 CRUD)는 자동 테스트 대신 수동 스모크 테스트로 대체한다(PRD §9 리스크와 일치).
- 린트/포맷터: BE/FE 모두 ESLint + Prettier 기본 설정만 사용, 커스텀 규칙 추가는 지양한다.
- E2E, 스냅샷 테스트, CI 파이프라인 구축은 이번 범위에서 하지 않는다(3일 내 ROI 없음).

## 5. 설정/보안/운영 원칙

- **환경변수**: `.env`(로컬, git 미포함) + `.env.example`(공유용 템플릿)로 관리. `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PORT` 등.
- **JWT**: access token은 짧은 만료(예: 15분), refresh token은 긴 만료(예: 7일)로 분리 발급. 시크릿은 환경변수로만 주입, 코드에 하드코딩 금지.
- **비밀번호**: bcrypt로 해시 저장(User/Admin 공통). 평문 저장·로깅 금지.
- **CORS**: FE 배포 origin만 허용하는 최소 설정(`cors` 미들웨어, allowlist 1개).
- **DB 제약으로 규칙 보강**: (user_id, promotion_id) UNIQUE 제약으로 규칙3 이중 방어, FK로 참조 무결성 보장. 애플리케이션 검증 + DB 제약 이중화(PRD §7).
- **Admin 계정**: 회원가입 화면 없이 DB seed 스크립트로 생성(PRD §4, §8).
- **배포/실행**: 3일 MVP 규모이므로 별도 오케스트레이션(Docker Compose 이상, k8s 등) 없이 FE는 정적 빌드 배포, BE는 단일 Node 프로세스로 실행. `npm run build` / `npm start` 수준의 단순 스크립트로 충분.

## 6. 프론트엔드 디렉토리 구조

```
frontend/
├── src/
│   ├── pages/              # 라우트 단위 화면 (PromotionList, PromotionDetail, MyPage, AdminPromotionForm 등)
│   ├── components/         # 여러 페이지에서 재사용하는 UI 조각 (Button, PromotionCard, Roulette 등)
│   ├── hooks/               # TanStack Query 훅 (useApiPromotions, useParticipate 등) — 서버 상태 전담
│   ├── stores/               # Zustand 스토어 (authStore: access token, 로그인 유저 정보 등 전역 상태)
│   ├── api/                  # fetch 래퍼 + 엔드포인트 함수 (promotionApi.ts, participationApi.ts 등)
│   ├── types/                 # 도메인 타입 (User, Admin, Promotion, Participation, ParticipationAttempt)
│   ├── router.tsx             # 라우트 정의
│   └── main.tsx                # 앱 진입점
├── .env.example
└── package.json
```

## 7. 백엔드 디렉토리 구조

```
backend/
├── src/
│   ├── routes/               # Express 라우터 (프레젠테이션 계층) — promotions.js, participations.js, auth.js, users.js
│   ├── services/              # 비즈니스 로직 (참여신청 유일성, 중복응모, 횟수제한 등 규칙 검증) — promotionService.js, participationService.js
│   ├── db/                     # pg Pool 설정 + 쿼리 함수 (DB 접근 계층) — pool.js, promotionQueries.js, participationQueries.js
│   ├── middlewares/             # authMiddleware(JWT 검증), errorHandler
│   ├── migrations/               # SQL 스키마/마이그레이션 파일 (테이블 생성, UNIQUE/FK 제약)
│   ├── seed/                      # Admin 계정 등 초기 데이터 삽입 스크립트
│   └── app.js                      # Express 앱 설정 및 진입점
├── .env.example
└── package.json
```
