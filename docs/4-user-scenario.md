# 사용자 시나리오 - 응모해

## 변경이력

| 버전 | 날짜 | 변경내용 |
|------|------|----------|
| v1.0 | 2026-08-13 | 최초 작성 |
| v1.1 | 2026-08-13 | §4 취소/재신청 사전조건을 wireframe.md와 통일(취소는 상태 무관, 재신청만 ONGOING 필요) |

`docs/2-PRD.md`, `docs/1-domain-definition.md`, `docs/3-usecase.md`를 전제로 MVP 범위 내 사용자 시나리오를 작성.

---

## 1. 거래처 담당자 - 회원가입 및 로그인

**액터**: User

**사전조건**: 없음(신규 사용자)

**기본 흐름**
1. 회원가입 화면에서 loginId, password, businessName, name(필수), phone(선택)을 입력한다.
2. 시스템이 계정을 생성한다.
3. 로그인 화면에서 loginId/password를 입력한다.
4. 시스템이 access token(단기)과 refresh token(장기)을 발급한다.
5. 프로모션 목록 화면으로 이동한다.

**관련 도메인 규칙**: 규칙1(로그인한 사용자만 참여 가능) — 이후 참여 시나리오의 전제가 됨.

---

## 2. 거래처 담당자 - 프로모션 조회 및 DIRECT 응모

**액터**: User

**사전조건**: 로그인 완료

**기본 흐름**
1. 진행 중인 프로모션 목록을 조회한다(ONGOING 상태만 노출).
2. DIRECT 타입 프로모션을 선택해 상세(기간/혜택/참여조건/참여방식/유의사항)를 확인한다.
3. 응모 버튼을 클릭한다.
4. 시스템이 Participation 레코드를 생성한다(status=APPLIED, attemptCount=1, result=PENDING).
5. 응모 완료 결과를 화면에 표시한다.

**예외/대안 흐름**
- 이미 해당 프로모션에 APPLIED/REAPPLIED 상태로 참여한 사용자가 다시 응모를 시도하면, 시스템은 중복 응모로 거부한다.

**관련 도메인 규칙**: 규칙1, 규칙2(ONGOING만 신규 참여 가능), 규칙5(DIRECT 중복응모 제한)

---

## 3. 거래처 담당자 - 프로모션 조회 및 ROULETTE 참여

**액터**: User

**사전조건**: 로그인 완료

**기본 흐름**
1. 진행 중인 프로모션 목록에서 ROULETTE 타입 프로모션을 선택해 상세를 확인한다.
2. 룰렛 실행 버튼을 클릭한다.
3. 최초 시도 시 시스템이 Participation 레코드를 생성하고(status=APPLIED), ParticipationAttempt(attemptNo=1)를 생성해 결과(WIN/LOSE)를 즉시 확정한다.
4. 결과를 화면에 즉시 표시한다.
5. maxParticipationCount에 도달하지 않았다면 다시 룰렛을 실행할 수 있으며, 매 시도마다 Participation.attemptCount가 1씩 증가하고 새 ParticipationAttempt가 생성된다.

**예외/대안 흐름**
- Participation.attemptCount가 해당 프로모션의 maxParticipationCount에 도달한 사용자가 추가 실행을 시도하면, 시스템은 참여를 거부한다.
- 이미 확정된 ParticipationAttempt.result에 대한 재추첨 요청은 거부한다(결과는 변경 불가).

**관련 도메인 규칙**: 규칙1, 규칙2, 규칙4(재추첨 불가), 규칙6(ROULETTE 최대 참여횟수)

---

## 4. 거래처 담당자 - 참여 취소 및 재신청

**액터**: User

**사전조건**: 로그인 완료, 해당 프로모션에 APPLIED 상태의 Participation 존재. (취소는 프로모션 상태와 무관하게 가능하나, 재신청은 규칙2에 따라 프로모션이 ONGOING이어야 한다 — 7-wireframe.md §6과 동일)

**기본 흐름**
1. 내 참여내역 또는 프로모션 상세에서 참여 취소를 요청한다.
2. 시스템이 기존 Participation 레코드의 status를 CANCELLED로 전환한다(새 레코드 생성 없음).
3. 사용자가 동일 프로모션(ONGOING 상태)에 재신청을 요청한다.
4. 시스템이 기존 레코드의 status를 REAPPLIED로 전환한다.
5. (ROULETTE인 경우) REAPPLIED 이후에도 maxParticipationCount 범위 내에서 추가 룰렛 시도가 가능하다. 단 기존에 확정된 ParticipationAttempt.result는 그대로 유지된다.
   (DIRECT인 경우) result=PENDING 값은 재신청 후에도 그대로 유지된다.

**예외/대안 흐름**
- CANCELLED 상태에서 재신청 시 새 레코드가 아닌 기존 레코드의 status만 REAPPLIED로 전환된다.
- 프로모션이 UPCOMING/ENDED 상태일 때 재신청을 시도하면 규칙2에 따라 거부한다(취소 자체는 거부되지 않음).
- ROULETTE에서 attemptCount가 이미 maxParticipationCount에 도달한 상태로 재신청 후 추가 시도를 요청하면 거부한다.

**관련 도메인 규칙**: 규칙3(참여신청 유일성), 규칙4(재추첨 불가), 규칙6(ROULETTE 최대 참여횟수)

---

## 5. 거래처 담당자 - 내 참여내역 조회

**액터**: User

**사전조건**: 로그인 완료

**기본 흐름**
1. 마이페이지 하위의 내 참여내역 메뉴로 이동한다.
2. 시스템이 사용자의 Participation 목록(프로모션명, 참여방식, 참여일시, 상태)을 조회해 표시한다.
3. DIRECT 항목은 result(PENDING)를, ROULETTE 항목은 회차별 ParticipationAttempt 결과(WIN/LOSE)를 함께 표시한다.
4. 프로모션이 ENDED 상태여도 기존 참여내역과 결과는 계속 조회 가능하다.

**관련 도메인 규칙**: 규칙7(종료 후에도 참여내역 조회 가능)

---

## 6. 거래처 담당자 - 마이페이지에서 정보 수정/비밀번호 변경

**액터**: User

**사전조건**: 로그인 완료

**기본 흐름**
1. 마이페이지에서 내 정보(businessName, name, phone 등)를 조회한다.
2. 수정할 항목을 입력하고 저장을 요청한다.
3. 시스템이 정보를 갱신한다.
4. 비밀번호 변경 화면에서 현재 비밀번호와 새 비밀번호를 입력한다.
5. 시스템이 새 비밀번호를 해시하여 저장한다.

---

## 7. 관리자 - 로그인 및 프로모션 등록

**액터**: Admin

**사전조건**: Admin 계정은 회원가입 없이 DB seed로 사전 생성되어 있음

**기본 흐름**
1. 로그인 화면에서 loginId/password를 입력해 로그인한다.
2. 시스템이 access token/refresh token을 발급한다.
3. 프로모션 등록 화면에서 title, type(DIRECT/ROULETTE), description, startAt, endAt, maxParticipationCount(ROULETTE인 경우)를 입력한다.
4. 등록을 요청하면 시스템이 Promotion 레코드를 생성한다(createdBy=Admin.id). status는 startAt/endAt 기준으로 UPCOMING 또는 ONGOING으로 결정된다.
5. 필요 시 등록된 프로모션의 내용을 수정한다.

**관련 도메인 규칙**: 규칙8(프로모션 등록/관리는 Admin만 수행)

---

## 8. 관리자 - 프로모션 조기 종료 및 참여 현황 조회

**액터**: Admin

**사전조건**: 로그인 완료, 대상 프로모션이 ONGOING 상태

**기본 흐름**
1. 프로모션 상세(관리자 화면)에서 조기 종료를 요청한다.
2. 시스템이 즉시 status를 ENDED로 전환한다.
3. 이후 해당 프로모션에는 신규 참여 및 추가 시도가 불가능해진다.
4. 기존에 생성된 Participation/ParticipationAttempt는 변경·삭제되지 않고 그대로 보존된다.
5. 참여 현황 조회 화면에서 프로모션별 참여자 수, (DIRECT) 응모 건수, (ROULETTE) 당첨 현황 등을 조회한다.

**예외/대안 흐름**
- 조기 종료 이후 사용자가 신규 참여를 시도하면 UPCOMING/ENDED 프로모션 참여 시도와 동일하게 거부된다.

**관련 도메인 규칙**: 규칙2(ONGOING만 신규 참여 가능), 규칙8, 규칙9(조기 종료 시 진행중 참여 보존)
