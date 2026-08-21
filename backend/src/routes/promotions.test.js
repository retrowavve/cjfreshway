const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const app = require('../app');
const pool = require('../db/pool');

let server;
let baseUrl;

const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
const testUserLoginId = `test_user_promo_${suffix}`;
const testAdminLoginId = `test_admin_promo_${suffix}`;
const testPassword = 'Passw0rd!23';

let adminId;
let userId;
let accessToken;

const promotionIds = {};
const participationIds = [];

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

  const signupRes = await fetch(`${baseUrl}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loginId: testUserLoginId,
      password: testPassword,
      businessName: '테스트상회',
      name: '홍길동',
      phone: '010-1234-5678',
    }),
  });
  const signupBody = await signupRes.json();
  userId = signupBody.id;

  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: testUserLoginId, password: testPassword }),
  });
  ({ accessToken } = await loginRes.json());

  // UPCOMING: start_at 미래
  let r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'DIRECT', '설명', now() + interval '1 day', now() + interval '2 day', 'UPCOMING', 1, $2) RETURNING id`,
    [`test_upcoming_${suffix}`, adminId],
  );
  promotionIds.upcoming = r.rows[0].id;

  // ONGOING: start_at 과거, end_at 미래, DB status='ONGOING'
  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'DIRECT', '진행중 설명', now() - interval '1 day', now() + interval '1 day', 'ONGOING', 5, $2) RETURNING id`,
    [`test_ongoing_${suffix}`, adminId],
  );
  promotionIds.ongoing = r.rows[0].id;

  // DB status='UPCOMING'이지만 start_at이 이미 지난 경우 (동적으로 ONGOING 판정되어야 함)
  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'DIRECT', '설명', now() - interval '1 hour', now() + interval '1 day', 'UPCOMING', 1, $2) RETURNING id`,
    [`test_stale_upcoming_${suffix}`, adminId],
  );
  promotionIds.staleUpcoming = r.rows[0].id;

  // 시간경과 ENDED: DB status='ONGOING'이지만 end_at이 이미 지남
  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'DIRECT', '설명', now() - interval '2 day', now() - interval '1 day', 'ONGOING', 1, $2) RETURNING id`,
    [`test_ended_by_time_${suffix}`, adminId],
  );
  promotionIds.endedByTime = r.rows[0].id;

  // 조기종료 ENDED: DB status='ENDED'이지만 end_at은 미래
  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'DIRECT', '설명', now() - interval '1 day', now() + interval '1 day', 'ENDED', 1, $2) RETURNING id`,
    [`test_ended_early_${suffix}`, adminId],
  );
  promotionIds.endedEarly = r.rows[0].id;

  // ROULETTE ONGOING (myAttemptCount 검증용)
  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'ROULETTE', '룰렛 설명', now() - interval '1 day', now() + interval '1 day', 'ONGOING', 10, $2) RETURNING id`,
    [`test_roulette_${suffix}`, adminId],
  );
  promotionIds.roulette = r.rows[0].id;

  // ROULETTE ONGOING - participations row 없음(별도 프로모션)
  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'ROULETTE', '룰렛 설명2', now() - interval '1 day', now() + interval '1 day', 'ONGOING', 10, $2) RETURNING id`,
    [`test_roulette_no_participation_${suffix}`, adminId],
  );
  promotionIds.rouletteNoParticipation = r.rows[0].id;

  // DIRECT ONGOING (로그인 시 myAttemptCount 없어야 함 검증용, 참여 row도 만들어둠)
  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'DIRECT', 'direct 설명', now() - interval '1 day', now() + interval '1 day', 'ONGOING', 1, $2) RETURNING id`,
    [`test_direct_with_participation_${suffix}`, adminId],
  );
  promotionIds.directWithParticipation = r.rows[0].id;

  // roulette 프로모션에 대한 participations row(attempt_count=3)
  r = await pool.query(
    `INSERT INTO participations (user_id, promotion_id, status, attempt_count, result)
     VALUES ($1, $2, 'APPLIED', 3, 'PENDING') RETURNING id`,
    [userId, promotionIds.roulette],
  );
  participationIds.push(r.rows[0].id);

  // direct 프로모션에 대한 participations row(attempt_count=1)
  r = await pool.query(
    `INSERT INTO participations (user_id, promotion_id, status, attempt_count, result)
     VALUES ($1, $2, 'APPLIED', 1, 'PENDING') RETURNING id`,
    [userId, promotionIds.directWithParticipation],
  );
  participationIds.push(r.rows[0].id);
});

after(async () => {
  if (participationIds.length > 0) {
    await pool.query('DELETE FROM participations WHERE id = ANY($1::uuid[])', [participationIds]);
  }
  const ids = Object.values(promotionIds);
  if (ids.length > 0) {
    await pool.query('DELETE FROM promotions WHERE id = ANY($1::uuid[])', [ids]);
  }
  await pool.query('DELETE FROM users WHERE login_id = $1', [testUserLoginId]);
  await pool.query('DELETE FROM admins WHERE login_id = $1', [testAdminLoginId]);
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await pool.end();
});

describe('GET /promotions', () => {
  test('ONGOING/UPCOMING 프로모션은 포함되고 ENDED는 제외된다', async () => {
    const res = await fetch(`${baseUrl}/promotions`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(body));

    const ids = body.map((p) => p.id);
    assert.ok(ids.includes(promotionIds.ongoing));
    assert.ok(ids.includes(promotionIds.upcoming));
    assert.ok(!ids.includes(promotionIds.endedByTime));
    assert.ok(!ids.includes(promotionIds.endedEarly));

    body.forEach((p) => assert.ok(p.status === 'ONGOING' || p.status === 'UPCOMING'));
  });

  test('DB status가 UPCOMING이어도 start_at이 지났으면 동적으로 ONGOING 판정되어 목록에 포함된다', async () => {
    const res = await fetch(`${baseUrl}/promotions`);
    const body = await res.json();

    const found = body.find((p) => p.id === promotionIds.staleUpcoming);
    assert.ok(found, '동적으로 ONGOING 판정되어 목록에 포함되어야 한다');
    assert.equal(found.status, 'ONGOING');
  });
});

describe('GET /promotions/:id', () => {
  test('ONGOING 프로모션 상세 조회 시 필요한 필드가 모두 정확히 반환된다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.ongoing}`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.title, `test_ongoing_${suffix}`);
    assert.equal(body.type, 'DIRECT');
    assert.equal(body.description, '진행중 설명');
    assert.equal(typeof body.startAt, 'string');
    assert.equal(typeof body.endAt, 'string');
    assert.equal(body.status, 'ONGOING');
    assert.equal(body.maxParticipationCount, 5);
  });

  test('UPCOMING 프로모션은 status가 UPCOMING으로 반환된다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.upcoming}`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.status, 'UPCOMING');
  });

  test('end_at이 지난 프로모션은 status가 ENDED로 동적 판정된다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.endedByTime}`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.status, 'ENDED');
  });

  test('DB status가 ENDED(조기종료)이면 end_at이 미래여도 ENDED로 유지된다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.endedEarly}`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.status, 'ENDED');
  });

  test('존재하지 않는 id로 조회하면 404와 { code, message }를 반환한다', async () => {
    const res = await fetch(`${baseUrl}/promotions/00000000-0000-0000-0000-000000000000`);
    const body = await res.json();

    assert.equal(res.status, 404);
    assert.equal(typeof body.code, 'string');
    assert.equal(typeof body.message, 'string');
  });

  test('ROULETTE 프로모션을 비로그인 상태로 조회하면 myAttemptCount 필드가 없다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.roulette}`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.myAttemptCount, undefined);
  });

  test('ROULETTE 프로모션을 로그인 상태로 조회했는데 participations row가 없으면 myAttemptCount는 0이다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.rouletteNoParticipation}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.myAttemptCount, 0);
  });

  test('ROULETTE 프로모션을 로그인 상태로 조회하면 participations.attempt_count 값이 myAttemptCount로 반환된다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.roulette}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.myAttemptCount, 3);
  });

  test('DIRECT 프로모션은 로그인 상태로 조회해도 myAttemptCount 필드가 없다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.directWithParticipation}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.myAttemptCount, undefined);
  });

  test('위조된 토큰을 Authorization 헤더에 넣어도 401 에러 없이 비로그인처럼 200 응답된다', async () => {
    const forged = jwt.sign({ sub: 'forged', role: 'USER' }, 'wrong-secret', { expiresIn: '15m' });

    const res = await fetch(`${baseUrl}/promotions/${promotionIds.roulette}`, {
      headers: { Authorization: `Bearer ${forged}` },
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.myAttemptCount, undefined);
  });
});
