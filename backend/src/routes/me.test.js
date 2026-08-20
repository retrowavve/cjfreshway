const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const app = require('../app');
const pool = require('../db/pool');

let server;
let baseUrl;

const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
const testAdminLoginId = `test_admin_me_${suffix}`;
const testPassword = 'Passw0rd!23';

let adminId;

const users = {}; // key -> { id, loginId, accessToken }
const promotionIds = {};
const allPromotionKeys = [];
const allUserKeys = [];

async function createUser(key, loginIdSuffix) {
  const loginId = `test_user_me_${loginIdSuffix}_${suffix}`;
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
    [`test_me_${titleSuffix}_${suffix}`, adminId],
  );
  promotionIds[key] = r.rows[0].id;
  allPromotionKeys.push(key);
}

async function createOngoingRoulette(key, titleSuffix, maxCount) {
  const r = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, status, max_participation_count, created_by)
     VALUES ($1, 'ROULETTE', '설명', now() - interval '1 day', now() + interval '1 day', 'ONGOING', $2, $3) RETURNING id`,
    [`test_me_${titleSuffix}_${suffix}`, maxCount, adminId],
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
    createUser('direct', 'direct'),
    createUser('roulette', 'roulette'),
    createUser('ended', 'ended'),
    createUser('mixed', 'mixed'),
    createUser('userA', 'user_a'),
    createUser('userB', 'user_b'),
    createUser('noAuth', 'no_auth'),
  ]);
  allUserKeys.push('direct', 'roulette', 'ended', 'mixed', 'userA', 'userB', 'noAuth');

  await Promise.all([
    createOngoingDirect('directPromo', 'direct_promo'),
    createOngoingRoulette('roulettePromo', 'roulette_promo', 3),
    createOngoingDirect('endedPromo', 'ended_promo'),
    createOngoingDirect('mixedDirectPromo', 'mixed_direct_promo'),
    createOngoingRoulette('mixedRoulettePromo', 'mixed_roulette_promo', 2),
    createOngoingDirect('userAPromo', 'user_a_promo'),
    createOngoingDirect('userBPromo', 'user_b_promo'),
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
  return res.json();
}

async function roulette(promotionKey, user) {
  const res = await fetch(`${baseUrl}/promotions/${promotionIds[promotionKey]}/roulette`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user.accessToken}` },
  });
  assert.equal(res.status, 201);
  return res.json();
}

describe('GET /me/participations', () => {
  test('비로그인 상태로 호출하면 401을 반환한다', async () => {
    const res = await fetch(`${baseUrl}/me/participations`);
    assert.equal(res.status, 401);
  });

  test('DIRECT 참여 후 조회하면 목록에 포함되고 attempts 필드가 없다 (완료조건1)', async () => {
    const created = await participate('directPromo', users.direct);

    const res = await fetch(`${baseUrl}/me/participations`, {
      headers: { Authorization: `Bearer ${users.direct.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200);

    const item = body.find((p) => p.id === created.id);
    assert.ok(item, '참여 항목이 목록에 존재해야 한다');
    assert.equal(item.promotionId, promotionIds.directPromo);
    assert.equal(item.promotionType, 'DIRECT');
    assert.ok(typeof item.promotionTitle === 'string' && item.promotionTitle.length > 0);
    assert.equal(item.status, 'APPLIED');
    assert.ok(item.participatedAt);
    assert.equal(item.result, 'PENDING');
    assert.equal(item.attempts, undefined);
  });

  test('ROULETTE 3회 시도 후 조회하면 attempts 배열이 순서대로 3개 포함된다 (완료조건2)', async () => {
    const first = await roulette('roulettePromo', users.roulette);
    const second = await roulette('roulettePromo', users.roulette);
    const third = await roulette('roulettePromo', users.roulette);

    const res = await fetch(`${baseUrl}/me/participations`, {
      headers: { Authorization: `Bearer ${users.roulette.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200);

    const item = body.find((p) => p.promotionId === promotionIds.roulettePromo);
    assert.ok(item, '참여 항목이 목록에 존재해야 한다');
    assert.equal(item.promotionType, 'ROULETTE');
    assert.ok(Array.isArray(item.attempts));
    assert.equal(item.attempts.length, 3);
    assert.deepEqual(item.attempts.map((a) => a.attemptNo), [1, 2, 3]);
    item.attempts.forEach((a, idx) => {
      assert.ok(a.result === 'WIN' || a.result === 'LOSE');
      assert.ok(a.attemptedAt);
      assert.ok(typeof a.id === 'string');
    });
    assert.equal(item.attempts[0].result, first.result);
    assert.equal(item.attempts[1].result, second.result);
    assert.equal(item.attempts[2].result, third.result);
  });

  test('ONGOING 상태에서 만든 참여를 프로모션이 ENDED로 전환된 뒤 조회해도 목록에 남아있다 (완료조건3, 규칙7)', async () => {
    const created = await participate('endedPromo', users.ended);
    await endPromotion('endedPromo');

    const res = await fetch(`${baseUrl}/me/participations`, {
      headers: { Authorization: `Bearer ${users.ended.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200);

    const item = body.find((p) => p.id === created.id);
    assert.ok(item, 'ENDED로 전환된 프로모션의 참여 이력도 목록에 남아있어야 한다');
    assert.equal(item.promotionId, promotionIds.endedPromo);
  });

  test('DIRECT+ROULETTE 여러 건을 가진 유저의 목록 길이와 필드 구성이 올바르다', async () => {
    const directCreated = await participate('mixedDirectPromo', users.mixed);
    await roulette('mixedRoulettePromo', users.mixed);
    await roulette('mixedRoulettePromo', users.mixed);

    const res = await fetch(`${baseUrl}/me/participations`, {
      headers: { Authorization: `Bearer ${users.mixed.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.length, 2);

    const directItem = body.find((p) => p.id === directCreated.id);
    assert.equal(directItem.promotionType, 'DIRECT');
    assert.equal(directItem.attempts, undefined);

    const rouletteItem = body.find((p) => p.promotionId === promotionIds.mixedRoulettePromo);
    assert.equal(rouletteItem.promotionType, 'ROULETTE');
    assert.equal(rouletteItem.attempts.length, 2);
  });

  test('유저 A의 조회 결과에 유저 B의 참여 항목이 섞이지 않는다', async () => {
    const createdA = await participate('userAPromo', users.userA);
    const createdB = await participate('userBPromo', users.userB);

    const res = await fetch(`${baseUrl}/me/participations`, {
      headers: { Authorization: `Bearer ${users.userA.accessToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200);

    assert.ok(body.some((p) => p.id === createdA.id));
    assert.ok(!body.some((p) => p.id === createdB.id));
    assert.ok(!body.some((p) => p.promotionId === promotionIds.userBPromo));
  });
});

async function adminLogin() {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: testAdminLoginId, password: testPassword }),
  });
  const body = await res.json();
  return body.accessToken;
}

describe('GET /me', () => {
  test('비로그인 상태로 호출하면 401을 반환한다', async () => {
    const res = await fetch(`${baseUrl}/me`);
    assert.equal(res.status, 401);
  });

  test('user로 로그인 후 조회하면 businessName/name/phone/loginId/createdAt이 있고 password는 없다', async () => {
    const res = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${users.direct.accessToken}` },
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.loginId, users.direct.loginId);
    assert.equal(body.businessName, '테스트상회');
    assert.equal(body.name, '홍길동');
    assert.equal(body.phone, '010-1234-5678');
    assert.ok(body.createdAt);
    assert.equal('password' in body, false);
  });

  test('admin으로 로그인 후 조회하면 name/loginId/createdAt만 있고 businessName/password는 없다', async () => {
    const accessToken = await adminLogin();
    const res = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.loginId, testAdminLoginId);
    assert.equal(body.name, '관리자테스트');
    assert.ok(body.createdAt);
    assert.equal('businessName' in body, false);
    assert.equal('password' in body, false);
  });
});

describe('PUT /me', () => {
  test('비로그인 상태로 호출하면 401을 반환한다', async () => {
    const res = await fetch(`${baseUrl}/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '새이름' }),
    });
    assert.equal(res.status, 401);
  });

  test('user가 name만 부분수정하면 name만 바뀌고 businessName/phone은 유지된다 (완료조건3)', async () => {
    const res = await fetch(`${baseUrl}/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${users.direct.accessToken}` },
      body: JSON.stringify({ name: '새이름' }),
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.name, '새이름');
    assert.equal(body.businessName, '테스트상회');
    assert.equal(body.phone, '010-1234-5678');
  });

  test('admin이 name을 수정하면 정상 반영된다 (완료조건4)', async () => {
    const accessToken = await adminLogin();
    const res = await fetch(`${baseUrl}/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ name: '새관리자이름' }),
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.name, '새관리자이름');
  });

  test('admin에게 허용 안 된 필드(businessName)를 보내도 무시되고 name만 반영된다 (완료조건5)', async () => {
    const accessToken = await adminLogin();
    const res = await fetch(`${baseUrl}/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ businessName: '무시되어야함', name: '정상반영' }),
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.name, '정상반영');
    assert.equal('businessName' in body, false);
  });
});

describe('PUT /me/password', () => {
  before(async () => {
    await Promise.all([createUser('pwOk', 'pw_ok'), createUser('pwFail', 'pw_fail')]);
    allUserKeys.push('pwOk', 'pwFail');
  });

  test('비로그인 상태로 호출하면 401을 반환한다', async () => {
    const res = await fetch(`${baseUrl}/me/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: testPassword, newPassword: 'New1234!' }),
    });
    assert.equal(res.status, 401);
  });

  test('currentPassword가 맞으면 비밀번호가 변경되고, 새 비밀번호로 로그인 성공/기존 비밀번호로 로그인 실패한다 (완료조건6)', async () => {
    const res = await fetch(`${baseUrl}/me/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${users.pwOk.accessToken}` },
      body: JSON.stringify({ currentPassword: testPassword, newPassword: 'New1234!' }),
    });
    assert.equal(res.status, 200);

    const loginNew = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: users.pwOk.loginId, password: 'New1234!' }),
    });
    const loginNewBody = await loginNew.json();
    assert.equal(loginNew.status, 200);
    assert.equal(typeof loginNewBody.accessToken, 'string');

    const loginOld = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: users.pwOk.loginId, password: testPassword }),
    });
    assert.equal(loginOld.status, 401);
  });

  test('currentPassword가 틀리면 401을 반환하고 비밀번호는 변경되지 않는다 (완료조건7)', async () => {
    const res = await fetch(`${baseUrl}/me/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${users.pwFail.accessToken}` },
      body: JSON.stringify({ currentPassword: 'wrong', newPassword: 'New1234!' }),
    });
    assert.equal(res.status, 401);

    const loginOld = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: users.pwFail.loginId, password: testPassword }),
    });
    assert.equal(loginOld.status, 200);
  });
});
