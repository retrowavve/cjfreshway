# 도메인 정의서 - 응모해

## 1. 개요

- **서비스명**: 응모해
- **목적**: 식자재를 구매하는 B2B 고객(외식업체, 급식업체 등)이 진행 중인 프로모션을 한눈에 확인하고, 일반 응모 또는 룰렛 방식으로 참여할 수 있는 웹 애플리케이션. 관리자는 프로모션을 등록·관리하고 참여 반응을 확인한다.
- **UI 대응**: 모바일(거래처 담당자 현장 접속)과 데스크탑(관리자 사무실 접속) 모두 지원하는 반응형 UI.

## 2. 핵심 액터

| 액터 | 설명 | 주요 권한 |
|------|------|-----------|
| 거래처 담당자 (User) | 식자재를 구매하는 외식업체/급식업체 등 B2B 고객사 소속 담당자 | 회원가입/로그인, 프로모션 조회, 프로모션 참여, 내 참여내역 조회, 마이페이지 |
| 관리자 (Admin) | 프로모션을 등록·관리하는 운영 담당자 | 로그인, 프로모션 등록/수정/종료, 참여 현황 조회, 마이페이지 |

## 3. 핵심 도메인 엔티티

### User (거래처 담당자)

| 속성명 | 타입 | 설명 | 필수 여부 |
|--------|------|------|-----------|
| id | ID | 회원 식별자 | 필수 |
| loginId | String | 로그인 계정 | 필수 |
| password | String | 비밀번호(암호화 저장) | 필수 |
| businessName | String | 사업체명(외식업체/급식업체 등) | 필수 |
| name | String | 담당자 이름 | 필수 |
| phone | String | 연락처 | 선택 |
| createdAt | DateTime | 가입일시 | 필수 |

### Admin (관리자)

| 속성명 | 타입 | 설명 | 필수 여부 |
|--------|------|------|-----------|
| id | ID | 관리자 식별자 | 필수 |
| loginId | String | 로그인 계정 | 필수 |
| password | String | 비밀번호(암호화 저장) | 필수 |
| name | String | 관리자 이름 | 필수 |
| createdAt | DateTime | 등록일시 | 필수 |

### Promotion (프로모션)

| 속성명 | 타입 | 설명 | 필수 여부 |
|--------|------|------|-----------|
| id | ID | 프로모션 식별자 | 필수 |
| title | String | 프로모션명 | 필수 |
| type | Enum | 참여 방식: DIRECT(일반 응모형) / ROULETTE(룰렛형) | 필수 |
| description | Text | 혜택, 참여조건, 참여방식, 유의사항 등 상세 설명 | 필수 |
| startAt | DateTime | 시작일시 | 필수 |
| endAt | DateTime | 종료일시 | 필수 |
| status | Enum | 진행상태: UPCOMING(예정) / ONGOING(진행중) / ENDED(종료) | 필수 |
| maxParticipationCount | Int | 사용자별 최대 참여 가능 횟수(ROULETTE 전용, DIRECT는 1 고정) | 필수 |
| createdBy | ID | 등록한 관리자(Admin.id) | 필수 |

### Participation (참여신청)

(Promotion, User) 조합당 유일한 신청 단위. DIRECT는 참여 결과를 이 레코드에 직접 보관하고, ROULETTE는 회차별 결과를 하위 `ParticipationAttempt`에 보관한다(§3-1 참조).

| 속성명 | 타입 | 설명 | 필수 여부 |
|--------|------|------|-----------|
| id | ID | 참여신청 식별자 | 필수 |
| userId | ID | 참여한 회원 | 필수 |
| promotionId | ID | 참여한 프로모션 | 필수 |
| status | Enum | 참여상태: APPLIED(신청) / CANCELLED(취소) / REAPPLIED(재신청) | 필수 |
| participatedAt | DateTime | 최초 참여(신청)일시 | 필수 |
| updatedAt | DateTime | 상태 변경일시 | 필수 |
| attemptCount | Int | 누적 참여(시도) 횟수. DIRECT는 항상 1, ROULETTE는 시도할 때마다 증가 | 필수 |
| result | Enum | DIRECT 전용 결과: PENDING(응모완료, 결과 미확정). ROULETTE는 사용하지 않음(null) | DIRECT만 필수 |

> DIRECT는 신청 시 result=PENDING 고정, attemptCount=1 고정(추가 시도 없음).
> ROULETTE는 신청마다 result를 쓰지 않고 아래 ParticipationAttempt에 회차별 WIN/LOSE를 기록한다.

### ParticipationAttempt (룰렛 시도 결과) — ROULETTE 전용

동일 Participation 안에서 여러 번 룰렛을 돌릴 수 있으므로, 시도(회차)마다 결과를 별도 레코드로 남긴다.

| 속성명 | 타입 | 설명 | 필수 여부 |
|--------|------|------|-----------|
| id | ID | 시도 식별자 | 필수 |
| participationId | ID | 소속 Participation | 필수 |
| attemptNo | Int | 시도 회차(1부터 증가) | 필수 |
| result | Enum | WIN(당첨) / LOSE(미당첨) | 필수 |
| attemptedAt | DateTime | 시도(룰렛 실행)일시 | 필수 |

> 한 번 생성된 ParticipationAttempt.result는 수정·삭제되지 않는다(재추첨 불가, 규칙4).

## 4. 엔티티 간 관계

| 엔티티 A | 관계 | 엔티티 B | 설명 |
|----------|------|----------|------|
| User | 1:N | Participation | 한 명의 회원이 여러 프로모션에 참여 |
| Promotion | 1:N | Participation | 하나의 프로모션에 여러 회원이 참여 |
| Admin | 1:N | Promotion | 관리자가 여러 프로모션을 등록 |
| (User, Promotion) | 1:1 (Participation 기준) | Participation | 회원-프로모션 조합당 참여신청 레코드는 유일 |
| Participation | 1:N | ParticipationAttempt | ROULETTE 참여신청 1건이 여러 회차의 룰렛 시도 결과를 가짐(DIRECT는 0건) |

## 5. 상태 정의

### Promotion.status 전이

| 상태값 | 설명 | 전이 조건 |
|--------|------|-----------|
| UPCOMING | 시작 전, 참여 불가 | 현재시각 < startAt |
| ONGOING | 진행 중, 신규 참여 가능 | startAt ≤ 현재시각 < endAt |
| ENDED | 종료, 신규 참여 불가(기존 참여내역·결과는 조회 가능) | 현재시각 ≥ endAt |

### Participation.status 전이 (참여신청 상태전환)

```
(없음) --참여--> APPLIED --취소--> CANCELLED --재신청--> REAPPLIED --취소--> CANCELLED ...
```

| 상태값 | 설명 |
|--------|------|
| APPLIED | 최초 참여신청 완료 상태 |
| CANCELLED | 참여를 취소한 상태 |
| REAPPLIED | 취소 후 다시 참여신청한 상태 |

- (프로모션, 거래처) 조합당 Participation 레코드는 **1건만 존재**한다.
- 취소·재신청은 새 레코드를 생성하지 않고 **기존 레코드의 status를 전환**하여 처리한다.
- ROULETTE는 재신청(REAPPLIED) 후에도 maxParticipationCount 범위 내에서 새로운 시도(ParticipationAttempt)를 만들 수 있지만, **이미 생성된 ParticipationAttempt.result는 재추첨하지 않는다**(규칙4).

### Participation.result / ParticipationAttempt.result

| 결과값 | 적용 대상 | 설명 |
|--------|-----------|------|
| PENDING | DIRECT (Participation.result) | 응모 완료, 당첨 여부는 별도 오프라인 발표. 재신청해도 이 값은 그대로 유지 |
| WIN / LOSE | ROULETTE (ParticipationAttempt.result, 회차별) | 룰렛 실행(시도) 즉시 확정되는 결과. 시도마다 새 레코드로 기록되며 기존 시도의 결과는 변경되지 않는다 |

## 6. 핵심 유스케이스

### 거래처 담당자 (User)

- 회원가입 / 로그인
- 진행 중인 프로모션 목록 조회
- 프로모션 상세 조회(기간/혜택/참여조건/참여방식/유의사항)
- 프로모션 참여 — DIRECT: 응모 버튼 클릭 / ROULETTE: 룰렛 실행 후 결과 즉시 확인
- 내 참여내역 조회(프로모션, 참여방식, 참여일시, 응모/당첨 결과)
- 마이페이지 — 내 정보 조회/수정, 비밀번호 변경

### 관리자 (Admin)

- 로그인
- 프로모션 등록 / 수정 / 조기 종료
- 프로모션별 참여 현황(참여자 수, 당첨 현황 등) 조회
- 마이페이지 — 내 정보 조회/수정, 비밀번호 변경

## 7. 비즈니스 규칙

1. 로그인한 사용자만 프로모션에 참여할 수 있다.
2. status가 ONGOING인 프로모션만 신규 참여가 가능하다.
3. **참여신청 유일성**: (Promotion, User) 조합당 Participation 레코드는 유일하다. 취소/재신청은 새 레코드가 아닌 기존 레코드의 status 전환으로 처리한다.
4. **재추첨 불가**: 생성된 ParticipationAttempt.result(WIN/LOSE)는 이후 어떤 경우에도 수정·삭제·재생성되지 않는다. 새 시도는 항상 새 ParticipationAttempt 레코드로만 추가된다.
5. **DIRECT 중복응모 제한**: 동일 사용자는 동일 DIRECT 프로모션에 유효 상태(APPLIED/REAPPLIED)로 1건만 참여할 수 있다(attemptCount=1 고정, 추가 시도 없음).
6. **ROULETTE 최대 참여횟수**: Participation.attemptCount는 프로모션별 maxParticipationCount를 초과할 수 없다. 시도(룰렛 실행) 시마다 attemptCount를 1 증가시키고 ParticipationAttempt를 1건 생성하며, 결과는 즉시 확정된다.
7. 프로모션 종료(ENDED) 이후에도 기존 참여내역과 결과는 계속 조회할 수 있다.
8. 프로모션 등록/관리는 Admin만 수행할 수 있다.
9. **조기 종료 시 진행중 참여 보존**: Admin이 프로모션을 조기 종료(status→ENDED)해도, 이미 생성된 Participation·ParticipationAttempt는 변경·삭제되지 않는다. 단, 종료 시점 이후로는 신규 참여 및 추가 시도가 불가하다(규칙2).

## 8. 예외 케이스

| 케이스 | 처리 |
|--------|------|
| 비로그인 사용자가 참여 시도 | 로그인 페이지로 유도, 참여 거부 |
| UPCOMING/ENDED 프로모션에 참여 시도 | 참여 불가 안내, 참여 거부 |
| DIRECT 프로모션에 이미 APPLIED/REAPPLIED 상태로 참여한 사용자가 재참여 시도 | 중복 응모로 거부 |
| ROULETTE 참여 횟수가 maxParticipationCount 도달한 사용자가 참여 시도 | 참여 거부 |
| CANCELLED 상태에서 재신청 | 기존 레코드 status를 REAPPLIED로 전환(새 레코드 생성 아님) |
| 이미 WIN/LOSE 결과가 확정된 ParticipationAttempt에 대한 재추첨 요청 | 거부(재추첨 불가 규칙, 규칙4) |
| ROULETTE에서 attemptCount가 maxParticipationCount에 도달했는데 재신청 후 추가 시도 요청 | 거부(참여 가능 횟수 초과) |
| Admin이 진행중(ONGOING) 프로모션을 조기 종료 | status를 즉시 ENDED로 전환, 이후 신규 참여·추가 시도만 차단(기존 Participation/ParticipationAttempt는 보존, 규칙9) |

## 9. MVP 범위

### 포함

- 회원가입/로그인(User, Admin)
- 프로모션 목록/상세 조회
- 프로모션 참여(DIRECT/ROULETTE), 참여신청 상태전환(신청/취소/재신청)
- 내 참여내역 조회
- 관리자 프로모션 등록/수정/종료 및 참여 현황 조회
- 마이페이지(정보 조회/수정, 비밀번호 변경)
- 반응형 UI(모바일/데스크탑)

### 제외

- 실제 주문/결제/정산 연동
- 재고 실시간 연동
- 프로모션 등록/참여에 대한 승인 워크플로우
- 거래처 등급별 차등가
- 포인트 적립
- 검색 기능
- 경품 재고 관리
- 쿠폰 발급, 복잡한 게임 로직, 개인화 추천

## 10. 용어집

| 용어 | 정의 |
|------|------|
| DIRECT | 일반 응모형 프로모션 참여 방식 |
| ROULETTE | 룰렛형 프로모션 참여 방식 |
| B2B 고객 / 거래처 담당자 | 식자재를 구매하는 외식업체, 급식업체 등 사업자 소속 회원 |
| Participation | (프로모션, 거래처) 조합당 유일한 참여신청 레코드. 취소/재신청은 status 전환으로 관리 |
| ParticipationAttempt | ROULETTE 참여신청 하나가 가지는 회차별 룰렛 시도 결과 레코드 |
| 재추첨 불가 | ROULETTE 시도(ParticipationAttempt)로 한 번 확정된 WIN/LOSE 결과는 다시 추첨하지 않는다는 규칙 |
