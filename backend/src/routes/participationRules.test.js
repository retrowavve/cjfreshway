// B10: docs/5-project-principle.md §4의 5개 핵심 비즈니스 규칙 검증.
// 아래 4개는 이미 기존 테스트가 검증하므로 여기서 재작성하지 않는다(DRY, 오버엔지니어링 금지):
//
// | 규칙 | 내용                                              | 검증 위치 |
// |------|---------------------------------------------------|-----------|
// | 규칙2 | UPCOMING/ENDED 프로모션 참여 거부                  | promotions.participate.test.js: 'UPCOMING 프로모션에 참여 요청하면 409 PROMOTION_NOT_ONGOING을 반환한다' / 'ENDED 프로모션에 참여 요청하면 409 PROMOTION_NOT_ONGOING을 반환한다' |
// | 규칙3 | (Promotion, User) 조합당 Participation 유일성        | promotions.participate.test.js: '동시성' describe의 'DIRECT: 동일 유저의 동시 응모 2건 중 정확히 1건만 201, 나머지 1건은 409 ALREADY_PARTICIPATED이며 DB에는 1건만 남는다' |
// | 규칙5 | DIRECT 중복응모 거부                                | promotions.participate.test.js: '같은 유저가 같은 DIRECT 프로모션에 재응모하면 409 ALREADY_PARTICIPATED를 반환한다' |
// | 규칙6 | ROULETTE maxParticipationCount 초과 거부            | promotions.participate.test.js: 'max_participation_count(2)를 모두 소진한 뒤 세번째 시도하면 409 ATTEMPT_LIMIT_EXCEEDED를 반환한다' |
//
// 규칙4(확정된 ParticipationAttempt.result는 재추첨·수정·삭제 불가)만 이 파일에서 새로 검증한다.

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const app = require('../app');
const pool = require('../db/pool');

let server;
let baseUrl;

const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
const testAdminLoginId = `test_admin_rules_${suffix}`;
const testPassword = 'Passw0rd!23';

let adminId;
let promotionId;
let attemptId;
let attemptResult;

const user = {};

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  const bcrypt = require('bcrypt');
  const passwordHash = await bcrypt.hash(testPassword, 10);
  const adminResult = await pool.query(
    'INSERT INTO admins (login_id, password, name) VALUES ($1, $2, $3) RETURNING id',
    [testAdminLoginId, passwordHash, '관리자테스트'],
  );
  adminId = adminResult.rows[0].id;

  const loginId = `test_user_rules_${suffix}`;
  const signupRes = await fetch(`${baseUrl}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loginId,
      password: testPassword,
      businessName: '테스트상회',
      name: '홍길동',
      phone: '010-1234-5678',
    }),
  });
  const signupBody = await signupRes.json();

  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId, password: testPassword }),
  });
  const { accessToken } = await loginRes.json();
  user.id = signupBody.id;
  user.loginId = loginId;
  user.accessToken = accessToken;

  const promotionResult = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'ROULETTE', '설명', now() - interval '1 day', now() + interval '1 day', 'ONGOING', 1, $2) RETURNING id`,
    [`test_participation_rules_${suffix}`, adminId],
  );
  promotionId = promotionResult.rows[0].id;

  const rouletteRes = await fetch(`${baseUrl}/promotions/${promotionId}/roulette`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user.accessToken}` },
  });
  const rouletteBody = await rouletteRes.json();
  assert.equal(rouletteRes.status, 201);

  const attemptResultRow = await pool.query(
    'SELECT id, result FROM participation_attempts WHERE participation_id = $1 AND attempt_no = 1',
    [rouletteBody.participationId],
  );
  attemptId = attemptResultRow.rows[0].id;
  attemptResult = attemptResultRow.rows[0].result;
});

after(async () => {
  await pool.query('ALTER TABLE participation_attempts DISABLE TRIGGER trg_participation_attempts_no_mutation');
  try {
    await pool.query(
      'DELETE FROM participation_attempts WHERE participation_id IN (SELECT id FROM participations WHERE promotion_id = $1)',
      [promotionId],
    );
    await pool.query('DELETE FROM participations WHERE promotion_id = $1', [promotionId]);
    await pool.query('DELETE FROM promotions WHERE id = $1', [promotionId]);
  } finally {
    await pool.query('ALTER TABLE participation_attempts ENABLE TRIGGER trg_participation_attempts_no_mutation');
  }

  await pool.query('DELETE FROM users WHERE login_id = $1', [user.loginId]);
  await pool.query('DELETE FROM admins WHERE login_id = $1', [testAdminLoginId]);

  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe('확정된 ParticipationAttempt 수정 불가 (규칙4)', () => {
  test('확정된 ParticipationAttempt.result를 UPDATE하려 하면 예외가 발생하고 값이 바뀌지 않는다', async () => {
    const newResult = attemptResult === 'WIN' ? 'LOSE' : 'WIN';
    await assert.rejects(
      () => pool.query('UPDATE participation_attempts SET result = $1 WHERE id = $2', [newResult, attemptId]),
      /append-only/,
    );
    const { rows } = await pool.query('SELECT result FROM participation_attempts WHERE id = $1', [attemptId]);
    assert.equal(rows[0].result, attemptResult);
  });

  test('확정된 ParticipationAttempt를 DELETE하려 하면 예외가 발생하고 row가 남아있다', async () => {
    await assert.rejects(
      () => pool.query('DELETE FROM participation_attempts WHERE id = $1', [attemptId]),
      /append-only/,
    );
    const { rows } = await pool.query(
      'SELECT count(*)::int AS count FROM participation_attempts WHERE id = $1',
      [attemptId],
    );
    assert.equal(rows[0].count, 1);
  });
});
