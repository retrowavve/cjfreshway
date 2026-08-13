# 도메인 정의서 - 응모해

## 1. 개요

- **서비스명**: 응모해
- **목적**: 식자재를 구매하는 B2B 고객(외식업체, 급식업체 등)이 진행 중인 프로모션을 한눈에 확인하고, 응모/룰렛 방식으로 참여할 수 있는 웹 애플리케이션
- **핵심 사용자**: 식자재를 구매하는 외식업체, 급식업체 등 B2B 고객

## 2. 핵심 엔티티

### User (회원)

| 속성명 | 타입 | 설명 | 필수 여부 |
|--------|------|------|-----------|
| id | ID | 회원 식별자 | 필수 |
| loginId | String | 로그인 계정 | 필수 |
| password | String | 비밀번호(암호화 저장) | 필수 |
| businessName | String | 사업체명(외식업체/급식업체 등) | 필수 |
| createdAt | DateTime | 가입일시 | 필수 |

### Promotion (프로모션)

| 속성명 | 타입 | 설명 | 필수 여부 |
|--------|------|------|-----------|
| id | ID | 프로모션 식별자 | 필수 |
| title | String | 프로모션명 | 필수 |
| type | Enum | 참여 방식: DIRECT(일반 응모형) / ROULETTE(룰렛형) | 필수 |
| description | Text | 혜택, 유의사항 등 상세 설명 | 필수 |
| startAt | DateTime | 시작일시 | 필수 |
| endAt | DateTime | 종료일시 | 필수 |
| status | Enum | 진행상태: UPCOMING(예정) / ONGOING(진행중) / ENDED(종료) | 필수 |
| maxParticipationCount | Int | 사용자별 최대 참여 가능 횟수(ROULETTE 전용, DIRECT는 1) | 필수 |

### Participation (참여내역)

| 속성명 | 타입 | 설명 | 필수 여부 |
|--------|------|------|-----------|
| id | ID | 참여 식별자 | 필수 |
| userId | ID | 참여한 회원 | 필수 |
| promotionId | ID | 참여한 프로모션 | 필수 |
| participatedAt | DateTime | 참여일시 | 필수 |
| result | Enum | 결과: APPLIED(응모완료, DIRECT) / WIN(당첨, ROULETTE) / LOSE(미당첨, ROULETTE) | 필수 |

## 3. 엔티티 간 관계

| 엔티티 A | 관계 | 엔티티 B | 설명 |
|----------|------|----------|------|
| User | 1:N | Participation | 한 명의 회원이 여러 건 참여 |
| Promotion | 1:N | Participation | 하나의 프로모션에 여러 회원이 참여 |

## 4. 상태 정의

### Promotion.status 전이

| 상태값 | 설명 | 전이 조건 |
|--------|------|-----------|
| UPCOMING | 시작 전 | 현재시각 < startAt |
| ONGOING | 진행 중, 신규 참여 가능 | startAt ≤ 현재시각 < endAt |
| ENDED | 종료, 신규 참여 불가 (기존 참여내역은 조회 가능) | 현재시각 ≥ endAt |

### Participation.result

| 결과값 | 적용 대상 | 설명 |
|--------|-----------|------|
| APPLIED | DIRECT | 응모 완료(당첨 여부는 별도 오프라인 발표) |
| WIN / LOSE | ROULETTE | 룰렛 실행 즉시 확정되는 결과 |

## 5. 핵심 비즈니스 규칙

- 로그인한 사용자만 프로모션에 참여할 수 있다.
- status가 ONGOING인 프로모션만 신규 참여가 가능하다.
- DIRECT 프로모션은 동일 사용자가 동일 프로모션에 1회만 참여할 수 있다.
- ROULETTE 프로모션은 프로모션별로 정의된 maxParticipationCount까지 참여할 수 있으며, 참여 즉시 WIN/LOSE 결과가 생성된다.
- 프로모션 종료(ENDED) 이후에도 해당 프로모션의 기존 참여내역과 결과는 계속 조회할 수 있다.
- 쿠폰·포인트 지급, 복잡한 게임 로직, 개인화 추천 등은 MVP 범위에서 제외한다.

## 6. 용어집

| 용어 | 정의 |
|------|------|
| DIRECT | 일반 응모형 프로모션 참여 방식 |
| ROULETTE | 룰렛형 프로모션 참여 방식 |
| B2B 고객 | 식자재를 구매하는 외식업체, 급식업체 등 사업자 회원 |
