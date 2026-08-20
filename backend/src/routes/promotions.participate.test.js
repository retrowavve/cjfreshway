const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const app = require('../app');
const pool = require('../db/pool');

let server;
let baseUrl;

const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
const testAdminLoginId = `test_admin_part_${suffix}`;
const testPassword = 'Passw0rd!23';

let adminId;

// 참여마다 별도 유저를 만들어 (user_id, promotion_id) 유일성 제약과 충돌하지 않게 한다.
const users = {}; // key -> { id, accessToken }

const promotionIds = {};
const allPromotionKeys = [];
const allUserKeys = [];

async function createUser(key, loginIdSuffix) {
  const loginId = `test_user_part_${loginIdSuffix}_${suffix}`;
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

  users[key] = { id: signupBody.id, loginId, accessToken };
}

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

  await Promise.all([
    createUser('upcoming', 'upcoming'),
    createUser('ended', 'ended'),
    createUser('directNormal', 'direct_normal'),
    createUser('typeMismatch1', 'type_mismatch1'),
    createUser('typeMismatch2', 'type_mismatch2'),
    createUser('roulette', 'roulette'),
    createUser('directConcurrency', 'direct_concurrency'),
    createUser('rouletteConcurrency', 'roulette_concurrency'),
  ]);
  allUserKeys.push(
    'upcoming',
    'ended',
    'directNormal',
    'typeMismatch1',
    'typeMismatch2',
    'roulette',
    'directConcurrency',
    'rouletteConcurrency',
  );

  let r;

  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'DIRECT', '설명', now() + interval '1 day', now() + interval '2 day', 'UPCOMING', 1, $2) RETURNING id`,
    [`test_participate_upcoming_${suffix}`, adminId],
  );
  promotionIds.upcoming = r.rows[0].id;
  allPromotionKeys.push('upcoming');

  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'DIRECT', '설명', now() - interval '2 day', now() - interval '1 day', 'ENDED', 1, $2) RETURNING id`,
    [`test_participate_ended_${suffix}`, adminId],
  );
  promotionIds.ended = r.rows[0].id;
  allPromotionKeys.push('ended');

  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'DIRECT', '설명', now() - interval '1 day', now() + interval '1 day', 'ONGOING', 1, $2) RETURNING id`,
    [`test_participate_direct_${suffix}`, adminId],
  );
  promotionIds.ongoingDirect = r.rows[0].id;
  allPromotionKeys.push('ongoingDirect');

  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'ROULETTE', '설명', now() - interval '1 day', now() + interval '1 day', 'ONGOING', 1, $2) RETURNING id`,
    [`test_participate_roulette_for_mismatch_${suffix}`, adminId],
  );
  promotionIds.ongoingRouletteForMismatch = r.rows[0].id;
  allPromotionKeys.push('ongoingRouletteForMismatch');

  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'DIRECT', '설명', now() - interval '1 day', now() + interval '1 day', 'ONGOING', 1, $2) RETURNING id`,
    [`test_participate_direct_concurrency_${suffix}`, adminId],
  );
  promotionIds.ongoingDirectConcurrency = r.rows[0].id;
  allPromotionKeys.push('ongoingDirectConcurrency');

  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'ROULETTE', '설명', now() - interval '1 day', now() + interval '1 day', 'ONGOING', 2, $2) RETURNING id`,
    [`test_participate_roulette2_${suffix}`, adminId],
  );
  promotionIds.ongoingRoulette2 = r.rows[0].id;
  allPromotionKeys.push('ongoingRoulette2');

  r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'ROULETTE', '설명', now() - interval '1 day', now() + interval '1 day', 'ONGOING', 5, $2) RETURNING id`,
    [`test_participate_roulette5_${suffix}`, adminId],
  );
  promotionIds.ongoingRoulette5 = r.rows[0].id;
  allPromotionKeys.push('ongoingRoulette5');
});

after(async () => {
  const allPromotionIds = allPromotionKeys.map((k) => promotionIds[k]);
  const allLoginIds = allUserKeys.map((k) => users[k].loginId);

  // participation_attempts는 append-only 트리거(BEFORE UPDATE OR DELETE)로 삭제가 막혀 있으므로,
  // 테스트 픽스처 정리 시에만 트리거를 잠깐 비활성화했다가 정리 후 즉시 재활성화한다.
  await pool.query('ALTER TABLE participation_attempts DISABLE TRIGGER trg_participation_attempts_no_mutation');
  try {
    if (allPromotionIds.length > 0) {
      await pool.query(
        'DELETE FROM participation_attempts WHERE participation_id IN (SELECT id FROM participations WHERE promotion_id = ANY($1::uuid[]))',
        [allPromotionIds],
      );
      await pool.query('DELETE FROM participations WHERE promotion_id = ANY($1::uuid[])', [allPromotionIds]);
      await pool.query('DELETE FROM promotions WHERE id = ANY($1::uuid[])', [allPromotionIds]);
    }
  } finally {
    await pool.query('ALTER TABLE participation_attempts ENABLE TRIGGER trg_participation_attempts_no_mutation');
  }

  if (allLoginIds.length > 0) {
    await pool.query('DELETE FROM users WHERE login_id = ANY($1::varchar[])', [allLoginIds]);
  }
  await pool.query('DELETE FROM admins WHERE login_id = $1', [testAdminLoginId]);

  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe('POST /promotions/:id/participate', () => {
  test('비로그인 상태로 호출하면 401을 반환한다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.ongoingDirect}/participate`, {
      method: 'POST',
    });
    assert.equal(res.status, 401);
  });

  test('UPCOMING 프로모션에 참여 요청하면 409 PROMOTION_NOT_ONGOING을 반환한다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.upcoming}/participate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${users.upcoming.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 409);
    assert.equal(body.code, 'PROMOTION_NOT_ONGOING');
  });

  test('ENDED 프로모션에 참여 요청하면 409 PROMOTION_NOT_ONGOING을 반환한다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.ended}/participate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${users.ended.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 409);
    assert.equal(body.code, 'PROMOTION_NOT_ONGOING');
  });

  test('존재하지 않는 프로모션에 참여 요청하면 404를 반환한다', async () => {
    const res = await fetch(`${baseUrl}/promotions/00000000-0000-0000-0000-000000000000/participate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${users.directNormal.accessToken}` },
    });
    assert.equal(res.status, 404);
  });

  test('DIRECT 프로모션에 정상 응모하면 201과 함께 APPLIED/attemptCount=1/result=PENDING을 반환한다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.ongoingDirect}/participate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${users.directNormal.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.userId, users.directNormal.id);
    assert.equal(body.promotionId, promotionIds.ongoingDirect);
    assert.equal(body.promotionType, 'DIRECT');
    assert.equal(body.status, 'APPLIED');
    assert.equal(body.attemptCount, 1);
    assert.equal(body.result, 'PENDING');
  });

  test('같은 유저가 같은 DIRECT 프로모션에 재응모하면 409 ALREADY_PARTICIPATED를 반환한다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.ongoingDirect}/participate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${users.directNormal.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 409);
    assert.equal(body.code, 'ALREADY_PARTICIPATED');
  });

  test('ROULETTE 프로모션에 /participate를 호출하면 409 PROMOTION_TYPE_MISMATCH를 반환한다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.ongoingRouletteForMismatch}/participate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${users.typeMismatch1.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 409);
    assert.equal(body.code, 'PROMOTION_TYPE_MISMATCH');
  });
});

describe('POST /promotions/:id/roulette', () => {
  test('비로그인 상태로 호출하면 401을 반환한다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.ongoingRoulette2}/roulette`, {
      method: 'POST',
    });
    assert.equal(res.status, 401);
  });

  test('UPCOMING 프로모션에 시도하면 409 PROMOTION_NOT_ONGOING을 반환한다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.upcoming}/roulette`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${users.upcoming.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 409);
    assert.equal(body.code, 'PROMOTION_NOT_ONGOING');
  });

  test('ENDED 프로모션에 시도하면 409 PROMOTION_NOT_ONGOING을 반환한다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.ended}/roulette`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${users.ended.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 409);
    assert.equal(body.code, 'PROMOTION_NOT_ONGOING');
  });

  test('존재하지 않는 프로모션에 시도하면 404를 반환한다', async () => {
    const res = await fetch(`${baseUrl}/promotions/00000000-0000-0000-0000-000000000000/roulette`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${users.roulette.accessToken}` },
    });
    assert.equal(res.status, 404);
  });

  test('DIRECT 프로모션에 /roulette를 호출하면 409 PROMOTION_TYPE_MISMATCH를 반환한다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.ongoingDirect}/roulette`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${users.typeMismatch2.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 409);
    assert.equal(body.code, 'PROMOTION_TYPE_MISMATCH');
  });

  test('ROULETTE 첫 시도는 201과 함께 attemptCount=1을 반환하고 participation_attempts에 attempt_no=1 row가 생성된다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.ongoingRoulette2}/roulette`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${users.roulette.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.attemptCount, 1);
    assert.equal(body.maxParticipationCount, 2);
    assert.ok(body.result === 'WIN' || body.result === 'LOSE');
    assert.ok(typeof body.participationId === 'string');

    const dbResult = await pool.query(
      'SELECT attempt_no, result FROM participation_attempts WHERE participation_id = $1 AND attempt_no = 1',
      [body.participationId],
    );
    assert.equal(dbResult.rows.length, 1);
    assert.equal(dbResult.rows[0].result, body.result);
  });

  test('같은 유저가 같은 ROULETTE에 두번째 시도하면 attemptCount=2가 되고 attempt_no=2 row가 생성된다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.ongoingRoulette2}/roulette`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${users.roulette.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.attemptCount, 2);

    const dbResult = await pool.query(
      'SELECT attempt_no FROM participation_attempts WHERE participation_id = $1 AND attempt_no = 2',
      [body.participationId],
    );
    assert.equal(dbResult.rows.length, 1);
  });

  test('max_participation_count(2)를 모두 소진한 뒤 세번째 시도하면 409 ATTEMPT_LIMIT_EXCEEDED를 반환한다', async () => {
    const res = await fetch(`${baseUrl}/promotions/${promotionIds.ongoingRoulette2}/roulette`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${users.roulette.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 409);
    assert.equal(body.code, 'ATTEMPT_LIMIT_EXCEEDED');
  });
});

describe('동시성', () => {
  test('DIRECT: 동일 유저의 동시 응모 2건 중 정확히 1건만 201, 나머지 1건은 409 ALREADY_PARTICIPATED이며 DB에는 1건만 남는다', async () => {
    const promotionId = promotionIds.ongoingDirectConcurrency;
    const { accessToken, id: userId } = users.directConcurrency;

    const [res1, res2] = await Promise.all([
      fetch(`${baseUrl}/promotions/${promotionId}/participate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`${baseUrl}/promotions/${promotionId}/participate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);
    const [body1, body2] = await Promise.all([res1.json(), res2.json()]);
    const statuses = [res1.status, res2.status].sort();
    assert.deepEqual(statuses, [201, 409]);

    const failedBody = res1.status === 409 ? body1 : body2;
    assert.equal(failedBody.code, 'ALREADY_PARTICIPATED');

    const dbResult = await pool.query(
      'SELECT count(*)::int AS count FROM participations WHERE user_id = $1 AND promotion_id = $2',
      [userId, promotionId],
    );
    assert.equal(dbResult.rows[0].count, 1);
  });

  test('ROULETTE: max_participation_count(5)인 프로모션에 동시 5건 요청 시 전부 201이고 attempt_count=5, attempt_no 1~5가 중복없이 기록된다', async () => {
    const promotionId = promotionIds.ongoingRoulette5;
    const { accessToken, id: userId } = users.rouletteConcurrency;

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        fetch(`${baseUrl}/promotions/${promotionId}/roulette`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        })),
    );
    responses.forEach((res) => assert.equal(res.status, 201));

    const participationResult = await pool.query(
      'SELECT id, attempt_count FROM participations WHERE user_id = $1 AND promotion_id = $2',
      [userId, promotionId],
    );
    assert.equal(participationResult.rows.length, 1);
    assert.equal(participationResult.rows[0].attempt_count, 5);

    const attemptsResult = await pool.query(
      'SELECT attempt_no FROM participation_attempts WHERE participation_id = $1 ORDER BY attempt_no',
      [participationResult.rows[0].id],
    );
    assert.equal(attemptsResult.rows.length, 5);
    assert.deepEqual(attemptsResult.rows.map((r) => r.attempt_no), [1, 2, 3, 4, 5]);
  });
});
