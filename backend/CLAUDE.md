# cjfreshway 백엔드 개발을 위한 지침

## 반드시 준수할 것

- SOLID 원칙을 반드시 지킬 것
- Clean 아키텍처를 반드시 구현할 것

## 참조 문서 (docs/)

백엔드 작업 전 관련 문서를 먼저 확인할 것.

| 문서 이름 | 경로 | 내용 |
|-----------|------|------|
| 도메인 정의서 | `docs/1-domain-definition.md` | 엔티티, 상태, 비즈니스 규칙(1-9), 예외케이스 — 서비스 로직 구현의 최상위 근거 |
| PRD | `docs/2-PRD.md` | §6 기술스택, §7 비기능요구사항(인증/보안), §8 일정 |
| 사용자 시나리오 | `docs/4-user-scenario.md` | API별 기본/예외 흐름 |
| 프로젝트 구조 설계 원칙 | `docs/5-project-principle.md` | §2 레이어(라우트→서비스→DB 접근), §3 네이밍, §4 테스트, §5 설정/보안, §7 백엔드 디렉토리 구조 |
| 기술 아키텍처 다이어그램 | `docs/6-arch-diagram.md` | 시스템 구성 요소 및 흐름 |
| ERD | `docs/8-erd.md` | 엔티티 관계 다이어그램 |
| DB 스키마 (DDL) | `docs/8-schema.sql` | PostgreSQL DDL |
| 실행계획 | `docs/9-plan.md` | Task별 작업 내용/완료조건 |
| API 스펙 | `docs/swagger.json` | REST API 스펙 (OpenAPI 3.0.3) |
