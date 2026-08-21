# 응모해

B2B 식자재 구매 고객(거래처)이 진행 중인 프로모션을 조회하고 DIRECT(일반 응모) 또는 ROULETTE(룰렛) 방식으로 참여할 수 있는 웹 애플리케이션. 관리자는 프로모션을 등록·관리하고 참여 현황을 확인한다.

## Demo Site

- Frontend: https://retrowavve-fe.vercel.app/
- Backend: https://retrowavve-be.vercel.app/ (`/health`, `/api-docs`)

## 테스트용 계정

| 구분 | 로그인ID | 비밀번호 |
|------|----------|----------|
| 관리자(Admin) | `admin` | `ChangeMe123!` |
| 일반회원(User) | `aaa` | `1111` |

## 간략한 테스트 시나리오

1. `aaa` / `111`로 로그인 → 프로모션 목록에서 "진행중" / "진행예정" chip으로 필터링
2. DIRECT 프로모션 상세 진입 → 응모하기 → 응모 완료 확인, 같은 프로모션에 다시 응모 시 중복 거부 확인
3. ROULETTE 프로모션 상세 진입 → 룰렛 실행하기를 최대 참여 횟수까지 반복 → 회차별 WIN/LOSE 결과, 당첨 시 축하 알림 확인
4. 마이페이지 → 내 참여내역 보기 → 참여 취소 → 재응모 → 상태 변화 확인
5. 마이페이지 → 개인정보 수정 / 비밀번호 변경
6. 로그아웃 후 `admin` / `ChangeMe123!`로 로그인 → 프로모션 관리 화면에서 신규 등록(DIRECT/ROULETTE) → 수정 → 조기종료
7. 조기종료한 프로모션의 "현황" 화면에서 참여자 수 및 (ROULETTE인 경우) WIN/LOSE 집계 확인

## 문서 (docs/)

작업 전 관련 문서를 먼저 확인할 것. `1-domain-definition.md`가 최상위 근거 문서이며, 이후 문서는 이를 전제로 작성됨.

| 문서 | 내용 |
|------|------|
| [`docs/1-domain-definition.md`](docs/1-domain-definition.md) | 도메인 정의서 — 액터, 엔티티, 상태, 비즈니스 규칙, 예외케이스, MVP 범위 |
| [`docs/2-PRD.md`](docs/2-PRD.md) | PRD — 목표/지표, 범위, 기능 우선순위, 기술스택, 일정, 리스크 |
| [`docs/3-usecase.md`](docs/3-usecase.md) | 유스케이스 다이어그램 (mermaid) |
| [`docs/4-user-scenario.md`](docs/4-user-scenario.md) | 사용자 시나리오 (액터별 기본/예외 흐름) |
| [`docs/5-project-principle.md`](docs/5-project-principle.md) | 프로젝트 구조 설계 원칙 — 레이어, 네이밍, 테스트, 보안, FE/BE 디렉토리 구조 |
| [`docs/6-arch-diagram.md`](docs/6-arch-diagram.md) | 기술 아키텍처 다이어그램 (mermaid) |
| [`docs/7-wireframe.md`](docs/7-wireframe.md) | 화면 와이어프레임 (모바일/데스크탑 반응형) |
| [`docs/8-erd.md`](docs/8-erd.md) | ERD (mermaid) |
| [`docs/8-schema.sql`](docs/8-schema.sql) | PostgreSQL DDL |
| [`docs/9-plan.md`](docs/9-plan.md) | 실행계획 — DB/백엔드/프론트엔드 Task 분해, 의존관계도, 완료조건 체크리스트 |
| [`docs/10-style.md`](docs/10-style.md) | 스타일 가이드 — 컬러/타이포그래피/레이아웃/컴포넌트 규칙 |
| [`docs/swagger.json`](docs/swagger.json) | REST API 스펙 (OpenAPI 3.0.3) |
