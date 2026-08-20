const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const app = require('../app');
const pool = require('../db/pool');

let server;
let baseUrl;

const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
const testAdminLoginId = `test_admin_${suffix}`;
const testUserLoginId = `test_user_${suffix}`;
const testPassword = 'Passw0rd!23';

let adminId;
let userId;
let adminAccessToken;
let userAccessToken;

const promotionIds = {};
const participationIds = [];
const extraUserLoginIds = [];

let passwordHash;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  const bcrypt = require('bcrypt');
  passwordHash = await bcrypt.hash(testPassword, 10);
  const adminResult = await pool.query(
    'INSERT INTO admins (login_id, password, name) VALUES ($1, $2, $3) RETURNING id',
    [testAdminLoginId, passwordHash, '관리자테스트'],
  );
  adminId = adminResult.rows[0].id;

  const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: testAdminLoginId, password: testPassword }),
  });
  ({ accessToken: adminAccessToken } = await adminLoginRes.json());

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

  const userLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: testUserLoginId, password: testPassword }),
  });
  ({ accessToken: userAccessToken } = await userLoginRes.json());

  // GET 목록 검증용: UPCOMING/ONGOING/ENDED 각 1개씩 seed
  let r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'DIRECT', '설명', now() + interval '1 day', now() + interval '2 day', 'UPCOMING', 1, $2) RETURNING id`,
    [`test_list_upcoming_${suffix}`, adminId],
  );
  promotionIds.listUpcoming = r.rows[0].id;

  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'DIRECT', '설명', now() - interval '1 day', now() + interval '1 day', 'ONGOING', 1, $2) RETURNING id`,
    [`test_list_ongoing_${suffix}`, adminId],
  );
  promotionIds.listOngoing = r.rows[0].id;

  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'DIRECT', '설명', now() - interval '2 day', now() - interval '1 day', 'ENDED', 1, $2) RETURNING id`,
    [`test_list_ended_${suffix}`, adminId],
  );
  promotionIds.listEnded = r.rows[0].id;

  // 조기종료(규칙9) 검증용: 별도 ONGOING 프로모션 + participations row
  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'DIRECT', '설명', now() - interval '1 day', now() + interval '1 day', 'ONGOING', 1, $2) RETURNING id`,
    [`test_end_target_${suffix}`, adminId],
  );
  promotionIds.endTarget = r.rows[0].id;

  r = await pool.query(
    `INSERT INTO participations (user_id, promotion_id, status, attempt_count, result)
     VALUES ($1, $2, 'APPLIED', 1, 'PENDING') RETURNING id, user_id, promotion_id, status, attempt_count, result`,
    [userId, promotionIds.endTarget],
  );
  participationIds.push(r.rows[0].id);
  promotionIds.endTargetParticipationSnapshot = r.rows[0];

  // PUT 부분수정 검증용
  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'DIRECT', '원래 설명', now() - interval '1 day', now() + interval '1 day', 'ONGOING', 1, $2) RETURNING id`,
    [`test_put_target_${suffix}`, adminId],
  );
  promotionIds.putTarget = r.rows[0].id;

  // GET /admin/promotions/:id/participations 검증용
  async function createParticipant(loginKey, businessName, name) {
    const loginId = `test_${loginKey}_${suffix}`;
    const res = await pool.query(
      'INSERT INTO users (login_id, password, business_name, name, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [loginId, passwordHash, businessName, name, '010-0000-0000'],
    );
    extraUserLoginIds.push(loginId);
    return res.rows[0].id;
  }

  // DIRECT 프로모션: APPLIED 1명 + CANCELLED 1명
  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'DIRECT', '설명', now() - interval '1 day', now() + interval '1 day', 'ONGOING', 1, $2) RETURNING id`,
    [`test_participations_direct_${suffix}`, adminId],
  );
  promotionIds.participationsDirect = r.rows[0].id;

  const directAppliedUserId = await createParticipant('direct_applied', '디렉트사업1', '김직접1');
  r = await pool.query(
    `INSERT INTO participations (user_id, promotion_id, status, attempt_count, result)
     VALUES ($1, $2, 'APPLIED', 1, 'PENDING') RETURNING id`,
    [directAppliedUserId, promotionIds.participationsDirect],
  );
  participationIds.push(r.rows[0].id);

  const directCancelledUserId = await createParticipant('direct_cancelled', '디렉트사업2', '김직접2');
  r = await pool.query(
    `INSERT INTO participations (user_id, promotion_id, status, attempt_count, result)
     VALUES ($1, $2, 'CANCELLED', 1, 'PENDING') RETURNING id`,
    [directCancelledUserId, promotionIds.participationsDirect],
  );
  participationIds.push(r.rows[0].id);

  // ROULETTE 프로모션: attempt 2건(최신 WIN) / attempt 1건(LOSE) / attempt 0건
  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'ROULETTE', '설명', now() - interval '1 day', now() + interval '1 day', 'ONGOING', 2, $2) RETURNING id`,
    [`test_participations_roulette_${suffix}`, adminId],
  );
  promotionIds.participationsRoulette = r.rows[0].id;

  const rouletteUserAId = await createParticipant('roulette_a', '룰렛사업A', '이룰렛A');
  r = await pool.query(
    `INSERT INTO participations (user_id, promotion_id, status, attempt_count, result)
     VALUES ($1, $2, 'APPLIED', 2, 'PENDING') RETURNING id`,
    [rouletteUserAId, promotionIds.participationsRoulette],
  );
  const rouletteParticipationA = r.rows[0].id;
  participationIds.push(rouletteParticipationA);
  await pool.query(
    'INSERT INTO participation_attempts (participation_id, attempt_no, result) VALUES ($1, 1, $2), ($1, 2, $3)',
    [rouletteParticipationA, 'LOSE', 'WIN'],
  );

  const rouletteUserBId = await createParticipant('roulette_b', '룰렛사업B', '이룰렛B');
  r = await pool.query(
    `INSERT INTO participations (user_id, promotion_id, status, attempt_count, result)
     VALUES ($1, $2, 'APPLIED', 1, 'PENDING') RETURNING id`,
    [rouletteUserBId, promotionIds.participationsRoulette],
  );
  const rouletteParticipationB = r.rows[0].id;
  participationIds.push(rouletteParticipationB);
  await pool.query('INSERT INTO participation_attempts (participation_id, attempt_no, result) VALUES ($1, 1, $2)', [
    rouletteParticipationB,
    'LOSE',
  ]);

  const rouletteUserCId = await createParticipant('roulette_c', '룰렛사업C', '이룰렛C');
  r = await pool.query(
    `INSERT INTO participations (user_id, promotion_id, status, attempt_count, result)
     VALUES ($1, $2, 'APPLIED', 0, 'PENDING') RETURNING id`,
    [rouletteUserCId, promotionIds.participationsRoulette],
  );
  const rouletteParticipationC = r.rows[0].id;
  participationIds.push(rouletteParticipationC);
});

after(async () => {
  if (participationIds.length > 0) {
    await pool.query('ALTER TABLE participation_attempts DISABLE TRIGGER trg_participation_attempts_no_mutation');
    try {
      await pool.query('DELETE FROM participation_attempts WHERE participation_id = ANY($1::uuid[])', [
        participationIds,
      ]);
    } finally {
      await pool.query('ALTER TABLE participation_attempts ENABLE TRIGGER trg_participation_attempts_no_mutation');
    }
    await pool.query('DELETE FROM participations WHERE id = ANY($1::uuid[])', [participationIds]);
  }
  const promoIds = Object.values(promotionIds)
    .filter((v) => typeof v === 'string')
    .concat(
      // POST로 생성된 프로모션들도 정리
      Object.entries(promotionIds)
        .filter(([k]) => k.startsWith('created_'))
        .map(([, v]) => v),
    );
  if (promoIds.length > 0) {
    await pool.query('DELETE FROM promotions WHERE id = ANY($1::uuid[])', [promoIds]);
  }
  await pool.query('DELETE FROM users WHERE login_id = $1', [testUserLoginId]);
  if (extraUserLoginIds.length > 0) {
    await pool.query('DELETE FROM users WHERE login_id = ANY($1::varchar[])', [extraUserLoginIds]);
  }
  await pool.query('DELETE FROM admins WHERE login_id = $1', [testAdminLoginId]);
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await pool.end();
});

function futureIso(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function trackCreated(id) {
  promotionIds[`created_${id}`] = id;
}

describe('인증/인가 (완료조건1)', () => {
  test('토큰 없이 GET /admin/promotions 호출 시 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions`);
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.code, 'UNAUTHORIZED');
  });

  test('토큰 없이 POST /admin/promotions 호출 시 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.code, 'UNAUTHORIZED');
  });

  test('토큰 없이 PUT /admin/promotions/:id 호출 시 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions/${promotionIds.putTarget}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.code, 'UNAUTHORIZED');
  });

  test('토큰 없이 PATCH /admin/promotions/:id/end 호출 시 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions/${promotionIds.putTarget}/end`, {
      method: 'PATCH',
    });
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.code, 'UNAUTHORIZED');
  });

  test('User 토큰으로 GET /admin/promotions 호출 시 403 FORBIDDEN', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions`, {
      headers: { Authorization: `Bearer ${userAccessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.code, 'FORBIDDEN');
  });

  test('User 토큰으로 POST /admin/promotions 호출 시 403 FORBIDDEN', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAccessToken}` },
      body: JSON.stringify({}),
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.code, 'FORBIDDEN');
  });

  test('User 토큰으로 PUT /admin/promotions/:id 호출 시 403 FORBIDDEN', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions/${promotionIds.putTarget}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAccessToken}` },
      body: JSON.stringify({}),
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.code, 'FORBIDDEN');
  });

  test('User 토큰으로 PATCH /admin/promotions/:id/end 호출 시 403 FORBIDDEN', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions/${promotionIds.putTarget}/end`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${userAccessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.code, 'FORBIDDEN');
  });

  test('토큰 없이 GET /admin/promotions/:id/participations 호출 시 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions/${promotionIds.participationsDirect}/participations`);
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.code, 'UNAUTHORIZED');
  });

  test('User 토큰으로 GET /admin/promotions/:id/participations 호출 시 403 FORBIDDEN', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions/${promotionIds.participationsDirect}/participations`, {
      headers: { Authorization: `Bearer ${userAccessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 403);
    assert.equal(body.code, 'FORBIDDEN');
  });
});

describe('POST /admin/promotions (완료조건2,3)', () => {
  test('startAt이 미래이면 status는 UPCOMING이다', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminAccessToken}` },
      body: JSON.stringify({
        title: `test_create_upcoming_${suffix}`,
        type: 'DIRECT',
        description: '설명',
        startAt: futureIso(1),
        endAt: futureIso(2),
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.status, 'UPCOMING');
    trackCreated(body.id);
  });

  test('startAt이 과거이고 endAt이 미래이면 status는 ONGOING이다', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminAccessToken}` },
      body: JSON.stringify({
        title: `test_create_ongoing_${suffix}`,
        type: 'DIRECT',
        description: '설명',
        startAt: futureIso(-1),
        endAt: futureIso(1),
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.status, 'ONGOING');
    trackCreated(body.id);
  });

  test('endAt이 과거이면 400을 반환한다', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminAccessToken}` },
      body: JSON.stringify({
        title: `test_create_past_end_${suffix}`,
        type: 'DIRECT',
        description: '설명',
        startAt: futureIso(-2),
        endAt: futureIso(-1),
      }),
    });
    assert.equal(res.status, 400);
  });

  test('startAt >= endAt이면 400을 반환한다', async () => {
    const same = futureIso(1);
    const res = await fetch(`${baseUrl}/admin/promotions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminAccessToken}` },
      body: JSON.stringify({
        title: `test_create_start_ge_end_${suffix}`,
        type: 'DIRECT',
        description: '설명',
        startAt: same,
        endAt: same,
      }),
    });
    assert.equal(res.status, 400);
  });

  test('ROULETTE + maxParticipationCount=5이면 응답에 5가 그대로 저장된다', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminAccessToken}` },
      body: JSON.stringify({
        title: `test_create_roulette_5_${suffix}`,
        type: 'ROULETTE',
        description: '설명',
        startAt: futureIso(-1),
        endAt: futureIso(1),
        maxParticipationCount: 5,
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.maxParticipationCount, 5);
    trackCreated(body.id);
  });

  test('ROULETTE + maxParticipationCount 미지정이면 기본값 1이다', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminAccessToken}` },
      body: JSON.stringify({
        title: `test_create_roulette_default_${suffix}`,
        type: 'ROULETTE',
        description: '설명',
        startAt: futureIso(-1),
        endAt: futureIso(1),
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.maxParticipationCount, 1);
    trackCreated(body.id);
  });

  test('ROULETTE + maxParticipationCount=0이면 400을 반환한다', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminAccessToken}` },
      body: JSON.stringify({
        title: `test_create_roulette_zero_${suffix}`,
        type: 'ROULETTE',
        description: '설명',
        startAt: futureIso(-1),
        endAt: futureIso(1),
        maxParticipationCount: 0,
      }),
    });
    assert.equal(res.status, 400);
  });

  test('DIRECT + maxParticipationCount=5을 보내도 응답은 1로 강제된다', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminAccessToken}` },
      body: JSON.stringify({
        title: `test_create_direct_forced_${suffix}`,
        type: 'DIRECT',
        description: '설명',
        startAt: futureIso(-1),
        endAt: futureIso(1),
        maxParticipationCount: 5,
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.maxParticipationCount, 1);
    trackCreated(body.id);
  });
});

describe('PUT /admin/promotions/:id', () => {
  test('title만 전송하면 title만 바뀌고 나머지 필드는 기존값을 유지한다', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions/${promotionIds.putTarget}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminAccessToken}` },
      body: JSON.stringify({ title: `test_put_target_updated_${suffix}` }),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.title, `test_put_target_updated_${suffix}`);
    assert.equal(body.description, '원래 설명');
  });

  test('존재하지 않는 id면 404를 반환한다', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions/00000000-0000-0000-0000-000000000000`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminAccessToken}` },
      body: JSON.stringify({ title: '없는거' }),
    });
    assert.equal(res.status, 404);
  });
});

describe('PATCH /admin/promotions/:id/end (완료조건4)', () => {
  test('정상 종료 시 status가 ENDED로 바뀌고, 기존 participations row는 변경/삭제되지 않는다(규칙9)', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions/${promotionIds.endTarget}/end`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.status, 'ENDED');

    const dbResult = await pool.query(
      'SELECT id, user_id, promotion_id, status, attempt_count, result FROM participations WHERE id = $1',
      [promotionIds.endTargetParticipationSnapshot.id],
    );
    assert.equal(dbResult.rows.length, 1);
    const snapshot = promotionIds.endTargetParticipationSnapshot;
    const after = dbResult.rows[0];
    assert.equal(after.user_id, snapshot.user_id);
    assert.equal(after.promotion_id, snapshot.promotion_id);
    assert.equal(after.status, snapshot.status);
    assert.equal(after.attempt_count, snapshot.attempt_count);
    assert.equal(after.result, snapshot.result);
  });

  test('존재하지 않는 id면 404를 반환한다', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions/00000000-0000-0000-0000-000000000000/end`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    assert.equal(res.status, 404);
  });
});

describe('GET /admin/promotions', () => {
  test('UPCOMING/ONGOING/ENDED 상태 무관하게 전부 응답에 포함된다', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(body));

    const ids = body.map((p) => p.id);
    assert.ok(ids.includes(promotionIds.listUpcoming));
    assert.ok(ids.includes(promotionIds.listOngoing));
    assert.ok(ids.includes(promotionIds.listEnded));
  });
});

describe('GET /admin/promotions/:id/participations (B8)', () => {
  test('존재하지 않는 promotionId면 404를 반환한다', async () => {
    const res = await fetch(
      `${baseUrl}/admin/promotions/00000000-0000-0000-0000-000000000000/participations`,
      { headers: { Authorization: `Bearer ${adminAccessToken}` } },
    );
    assert.equal(res.status, 404);
  });

  test('DIRECT: totalCount는 상태 무관 전체 참여자 수이고, winCount/loseCount 필드는 없으며, CANCELLED도 포함된다', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions/${promotionIds.participationsDirect}/participations`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.totalCount, 2);
    assert.equal('winCount' in body, false);
    assert.equal('loseCount' in body, false);
    assert.equal(body.items.length, 2);

    const applied = body.items.find((it) => it.businessName === '디렉트사업1');
    assert.ok(applied);
    assert.equal(applied.name, '김직접1');
    assert.equal(applied.status, 'APPLIED');
    assert.equal(applied.result, 'PENDING');
    assert.ok(applied.participatedAt);
    assert.ok(applied.participationId);

    const cancelled = body.items.find((it) => it.businessName === '디렉트사업2');
    assert.ok(cancelled);
    assert.equal(cancelled.name, '김직접2');
    assert.equal(cancelled.status, 'CANCELLED');
    assert.equal(cancelled.result, 'PENDING');
  });

  test('ROULETTE: winCount/loseCount는 각 참여자의 최신 시도 결과 기준으로 집계되고, 시도 없는 참여자의 result는 null이다', async () => {
    const res = await fetch(`${baseUrl}/admin/promotions/${promotionIds.participationsRoulette}/participations`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.totalCount, 3);
    assert.equal(body.winCount, 1);
    assert.equal(body.loseCount, 1);
    assert.equal(body.items.length, 3);

    const userA = body.items.find((it) => it.businessName === '룰렛사업A');
    assert.ok(userA);
    assert.equal(userA.result, 'WIN');

    const userB = body.items.find((it) => it.businessName === '룰렛사업B');
    assert.ok(userB);
    assert.equal(userB.result, 'LOSE');

    const userC = body.items.find((it) => it.businessName === '룰렛사업C');
    assert.ok(userC);
    assert.equal(userC.result, null);
  });
});
