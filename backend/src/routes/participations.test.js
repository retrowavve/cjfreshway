const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const app = require('../app');
const pool = require('../db/pool');

let server;
let baseUrl;

const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
const testAdminLoginId = `test_admin_partc_${suffix}`;
const testPassword = 'Passw0rd!23';

let adminId;

const users = {}; // key -> { id, loginId, accessToken }
const promotionIds = {};
const allPromotionKeys = [];
const allUserKeys = [];

async function createUser(key, loginIdSuffix) {
  const loginId = `test_user_partc_${loginIdSuffix}_${suffix}`;
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

async function createOngoingDirect(key, titleSuffix) {
  const r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'DIRECT', '설명', now() - interval '1 day', now() + interval '1 day', 'ONGOING', 1, $2) RETURNING id`,
    [`test_participations_${titleSuffix}_${suffix}`, adminId],
  );
  promotionIds[key] = r.rows[0].id;
  allPromotionKeys.push(key);
}

async function createOngoingRoulette(key, titleSuffix, maxCount) {
  const r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'ROULETTE', '설명', now() - interval '1 day', now() + interval '1 day', 'ONGOING', $2, $3) RETURNING id`,
    [`test_participations_${titleSuffix}_${suffix}`, maxCount, adminId],
  );
  promotionIds[key] = r.rows[0].id;
  allPromotionKeys.push(key);
}

async function endPromotion(key) {
  await pool.query("UPDATE promotions SET status='ENDED' WHERE id=$1", [promotionIds[key]]);
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
    createUser('owner', 'owner'),
    createUser('other', 'other'),
    createUser('endedCancel', 'ended_cancel'),
    createUser('notFound', 'not_found'),
    createUser('cancelTwice', 'cancel_twice'),
    createUser('reapplyOwner', 'reapply_owner'),
    createUser('reapplyOther', 'reapply_other'),
    createUser('reapplyEnded', 'reapply_ended'),
    createUser('reapplyApplied', 'reapply_applied'),
    createUser('reapplyNotFound', 'reapply_not_found'),
    createUser('chain', 'chain'),
    createUser('attempt', 'attempt'),
  ]);
  allUserKeys.push(
    'owner',
    'other',
    'endedCancel',
    'notFound',
    'cancelTwice',
    'reapplyOwner',
    'reapplyOther',
    'reapplyEnded',
    'reapplyApplied',
    'reapplyNotFound',
    'chain',
    'attempt',
  );

  await Promise.all([
    createOngoingDirect('ongoing', 'ongoing'),
    createOngoingDirect('endedCancelPromo', 'ended_cancel_promo'),
    createOngoingDirect('cancelTwicePromo', 'cancel_twice_promo'),
    createOngoingDirect('reapplyPromo', 'reapply_promo'),
    createOngoingDirect('reapplyEndedPromo', 'reapply_ended_promo'),
    createOngoingDirect('reapplyAppliedPromo', 'reapply_applied_promo'),
    createOngoingDirect('chainPromo', 'chain_promo'),
    createOngoingRoulette('ongoingRoulette', 'ongoing_roulette', 2),
  ]);
});

after(async () => {
  const allPromotionIds = allPromotionKeys.map((k) => promotionIds[k]);
  const allLoginIds = allUserKeys.map((k) => users[k].loginId);

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

async function participate(promotionKey, user) {
  const res = await fetch(`${baseUrl}/promotions/${promotionIds[promotionKey]}/participate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user.accessToken}` },
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  return body.id;
}

describe('PATCH /participations/:id/cancel', () => {
  test('APPLIED 상태를 cancel하면 200과 함께 CANCELLED를 반환하고 새 row가 생성되지 않는다 (완료조건1)', async () => {
    const participationId = await participate('ongoing', users.owner);

    const res = await fetch(`${baseUrl}/participations/${participationId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${users.owner.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.status, 'CANCELLED');
    assert.equal(body.id, participationId);

    const byId = await pool.query('SELECT count(*)::int AS count FROM participations WHERE id = $1', [participationId]);
    assert.equal(byId.rows[0].count, 1);

    const byUserPromotion = await pool.query(
      'SELECT count(*)::int AS count FROM participations WHERE user_id = $1 AND promotion_id = $2',
      [users.owner.id, promotionIds.ongoing],
    );
    assert.equal(byUserPromotion.rows[0].count, 1);
  });

  test('프로모션이 ENDED로 전환되어도 cancel은 200으로 성공한다', async () => {
    const participationId = await participate('endedCancelPromo', users.endedCancel);
    await endPromotion('endedCancelPromo');

    const res = await fetch(`${baseUrl}/participations/${participationId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${users.endedCancel.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.status, 'CANCELLED');
  });

  test('존재하지 않는 participation id를 cancel하면 404를 반환한다', async () => {
    const res = await fetch(`${baseUrl}/participations/00000000-0000-0000-0000-000000000000/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${users.notFound.accessToken}` },
    });
    assert.equal(res.status, 404);
  });

  test('다른 유저 소유의 participation을 cancel하면 403을 반환한다', async () => {
    const participationId = await participate('ongoing', users.other);

    const res = await fetch(`${baseUrl}/participations/${participationId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${users.owner.accessToken}` },
    });
    assert.equal(res.status, 403);
  });

  test('비로그인 상태로 cancel을 호출하면 401을 반환한다', async () => {
    const res = await fetch(`${baseUrl}/participations/00000000-0000-0000-0000-000000000000/cancel`, {
      method: 'PATCH',
    });
    assert.equal(res.status, 401);
  });

  test('이미 CANCELLED인 participation을 다시 cancel하면 409 INVALID_STATUS_TRANSITION을 반환한다', async () => {
    const participationId = await participate('cancelTwicePromo', users.cancelTwice);

    const first = await fetch(`${baseUrl}/participations/${participationId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${users.cancelTwice.accessToken}` },
    });
    assert.equal(first.status, 200);

    const second = await fetch(`${baseUrl}/participations/${participationId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${users.cancelTwice.accessToken}` },
    });
    const body = await second.json();
    assert.equal(second.status, 409);
    assert.equal(body.code, 'INVALID_STATUS_TRANSITION');
  });
});

describe('PATCH /participations/:id/reapply', () => {
  test('CANCELLED 상태를 ONGOING 프로모션에서 reapply하면 200과 함께 REAPPLIED를 반환한다 (완료조건1)', async () => {
    const participationId = await participate('reapplyPromo', users.reapplyOwner);

    const cancelRes = await fetch(`${baseUrl}/participations/${participationId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${users.reapplyOwner.accessToken}` },
    });
    assert.equal(cancelRes.status, 200);

    const res = await fetch(`${baseUrl}/participations/${participationId}/reapply`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${users.reapplyOwner.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.status, 'REAPPLIED');
    assert.equal(body.id, participationId);
  });

  test('프로모션이 ENDED로 전환된 뒤 CANCELLED 상태에서 reapply하면 409 PROMOTION_NOT_ONGOING을 반환한다 (완료조건2)', async () => {
    const participationId = await participate('reapplyEndedPromo', users.reapplyEnded);

    const cancelRes = await fetch(`${baseUrl}/participations/${participationId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${users.reapplyEnded.accessToken}` },
    });
    assert.equal(cancelRes.status, 200);

    await endPromotion('reapplyEndedPromo');

    const res = await fetch(`${baseUrl}/participations/${participationId}/reapply`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${users.reapplyEnded.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 409);
    assert.equal(body.code, 'PROMOTION_NOT_ONGOING');
  });

  test('APPLIED 상태(CANCELLED 아님)에서 reapply하면 409 INVALID_STATUS_TRANSITION을 반환한다', async () => {
    const participationId = await participate('reapplyAppliedPromo', users.reapplyApplied);

    const res = await fetch(`${baseUrl}/participations/${participationId}/reapply`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${users.reapplyApplied.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 409);
    assert.equal(body.code, 'INVALID_STATUS_TRANSITION');
  });

  test('존재하지 않는 participation id를 reapply하면 404를 반환한다', async () => {
    const res = await fetch(`${baseUrl}/participations/00000000-0000-0000-0000-000000000000/reapply`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${users.reapplyNotFound.accessToken}` },
    });
    assert.equal(res.status, 404);
  });

  test('다른 유저 소유의 participation을 reapply하면 403을 반환한다', async () => {
    const participationId = await participate('ongoing', users.reapplyOther);

    const res = await fetch(`${baseUrl}/participations/${participationId}/reapply`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${users.reapplyOwner.accessToken}` },
    });
    assert.equal(res.status, 403);
  });

  test('비로그인 상태로 reapply를 호출하면 401을 반환한다', async () => {
    const res = await fetch(`${baseUrl}/participations/00000000-0000-0000-0000-000000000000/reapply`, {
      method: 'PATCH',
    });
    assert.equal(res.status, 401);
  });

  test('상태전이 체인: APPLIED -> cancel -> reapply -> cancel이 모두 성공한다 (§5 다이어그램 검증)', async () => {
    const participationId = await participate('chainPromo', users.chain);

    const cancel1 = await fetch(`${baseUrl}/participations/${participationId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${users.chain.accessToken}` },
    });
    const cancel1Body = await cancel1.json();
    assert.equal(cancel1.status, 200);
    assert.equal(cancel1Body.status, 'CANCELLED');

    const reapply = await fetch(`${baseUrl}/participations/${participationId}/reapply`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${users.chain.accessToken}` },
    });
    const reapplyBody = await reapply.json();
    assert.equal(reapply.status, 200);
    assert.equal(reapplyBody.status, 'REAPPLIED');

    const cancel2 = await fetch(`${baseUrl}/participations/${participationId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${users.chain.accessToken}` },
    });
    const cancel2Body = await cancel2.json();
    assert.equal(cancel2.status, 200);
    assert.equal(cancel2Body.status, 'CANCELLED');
  });

  test('ROULETTE의 ParticipationAttempt는 cancel/reapply 후에도 그대로 보존된다 (완료조건3)', async () => {
    const rouletteRes1 = await fetch(`${baseUrl}/promotions/${promotionIds.ongoingRoulette}/roulette`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${users.attempt.accessToken}` },
    });
    const rouletteBody1 = await rouletteRes1.json();
    assert.equal(rouletteRes1.status, 201);
    const participationId = rouletteBody1.participationId;

    const rouletteRes2 = await fetch(`${baseUrl}/promotions/${promotionIds.ongoingRoulette}/roulette`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${users.attempt.accessToken}` },
    });
    const rouletteBody2 = await rouletteRes2.json();
    assert.equal(rouletteRes2.status, 201);
    assert.equal(rouletteBody2.attemptCount, 2);

    const beforeAttempts = await pool.query(
      'SELECT attempt_no, result FROM participation_attempts WHERE participation_id = $1 ORDER BY attempt_no',
      [participationId],
    );
    assert.equal(beforeAttempts.rows.length, 2);
    assert.deepEqual(beforeAttempts.rows.map((r) => r.attempt_no), [1, 2]);
    assert.equal(beforeAttempts.rows[0].result, rouletteBody1.result);
    assert.equal(beforeAttempts.rows[1].result, rouletteBody2.result);

    const beforeParticipation = await pool.query('SELECT attempt_count FROM participations WHERE id = $1', [participationId]);
    assert.equal(beforeParticipation.rows[0].attempt_count, 2);

    const cancelRes = await fetch(`${baseUrl}/participations/${participationId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${users.attempt.accessToken}` },
    });
    assert.equal(cancelRes.status, 200);

    const reapplyRes = await fetch(`${baseUrl}/participations/${participationId}/reapply`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${users.attempt.accessToken}` },
    });
    assert.equal(reapplyRes.status, 200);

    const afterAttempts = await pool.query(
      'SELECT attempt_no, result FROM participation_attempts WHERE participation_id = $1 ORDER BY attempt_no',
      [participationId],
    );
    assert.equal(afterAttempts.rows.length, 2);
    assert.deepEqual(afterAttempts.rows.map((r) => r.attempt_no), [1, 2]);
    assert.equal(afterAttempts.rows[0].result, rouletteBody1.result);
    assert.equal(afterAttempts.rows[1].result, rouletteBody2.result);

    const afterParticipation = await pool.query('SELECT attempt_count FROM participations WHERE id = $1', [participationId]);
    assert.equal(afterParticipation.rows[0].attempt_count, 2);
  });
});
