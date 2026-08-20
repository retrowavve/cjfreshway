const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const app = require('../app');
const pool = require('../db/pool');
const authMiddleware = require('../middlewares/authMiddleware');

let server;
let baseUrl;

const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
const testUserLoginId = `test_user_${suffix}`;
const testAdminLoginId = `test_admin_${suffix}`;
const testPassword = 'Passw0rd!23';

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await pool.query('DELETE FROM users WHERE login_id = $1', [testUserLoginId]);
  await pool.query('DELETE FROM admins WHERE login_id = $1', [testAdminLoginId]);
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await pool.end();
});

describe('POST /auth/signup', () => {
  test('필수값이 모두 있으면 201과 함께 password 없는 유저 정보를 반환하고, DB에는 bcrypt 해시가 저장된다', async () => {
    const res = await fetch(`${baseUrl}/auth/signup`, {
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
    const body = await res.json();

    assert.equal(res.status, 201);
    assert.equal(body.loginId, testUserLoginId);
    assert.equal(body.businessName, '테스트상회');
    assert.equal(body.name, '홍길동');
    assert.equal(body.phone, '010-1234-5678');
    assert.ok(body.id);
    assert.ok(body.createdAt);
    assert.equal('password' in body, false);

    const dbResult = await pool.query('SELECT password FROM users WHERE login_id = $1', [testUserLoginId]);
    const storedPassword = dbResult.rows[0].password;
    assert.ok(storedPassword.startsWith('$2'), 'password는 bcrypt 해시($2 접두)여야 한다');
    assert.notEqual(storedPassword, testPassword);
  });

  test('필수값(businessName)이 누락되면 400을 반환한다', async () => {
    const res = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: `${testUserLoginId}_missing`,
        password: testPassword,
        name: '홍길동',
      }),
    });
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.ok(typeof body.code === 'string');
    assert.ok(typeof body.message === 'string');
  });

  test('이미 사용 중인 loginId로 재가입하면 409 LOGIN_ID_DUPLICATE를 반환한다', async () => {
    const res = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginId: testUserLoginId,
        password: testPassword,
        businessName: '테스트상회2',
        name: '홍길동2',
      }),
    });
    const body = await res.json();

    assert.equal(res.status, 409);
    assert.equal(body.code, 'LOGIN_ID_DUPLICATE');
  });
});

describe('POST /auth/login', () => {
  test('가입한 유저 정보로 로그인하면 200과 accessToken/refreshToken을 반환하고, accessToken payload의 role은 USER이다', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: testUserLoginId, password: testPassword }),
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(typeof body.accessToken, 'string');
    assert.equal(typeof body.refreshToken, 'string');

    const payload = jwt.verify(body.accessToken, process.env.JWT_ACCESS_SECRET);
    assert.equal(payload.role, 'USER');
    assert.ok(payload.sub);
  });

  test('비밀번호가 틀리면 401을 반환한다', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: testUserLoginId, password: 'wrong-password' }),
    });
    const body = await res.json();

    assert.equal(res.status, 401);
    assert.ok(typeof body.code === 'string');
  });

  test('존재하지 않는 loginId면 401을 반환한다', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: `no-such-user-${suffix}`, password: testPassword }),
    });

    assert.equal(res.status, 401);
  });
});

describe('POST /auth/refresh', () => {
  test('유효한 refreshToken으로 요청하면 200과 함께 새 accessToken을 발급한다', async () => {
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: testUserLoginId, password: testPassword }),
    });
    const { refreshToken } = await loginRes.json();

    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(typeof body.accessToken, 'string');
    assert.equal(typeof body.refreshToken, 'string');

    const payload = jwt.verify(body.accessToken, process.env.JWT_ACCESS_SECRET);
    assert.equal(payload.role, 'USER');
  });

  test('위조된 refreshToken이면 401 INVALID_TOKEN을 반환한다', async () => {
    const forged = jwt.sign({ sub: 'forged', role: 'USER' }, 'wrong-secret', { expiresIn: '7d' });

    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: forged }),
    });
    const body = await res.json();

    assert.equal(res.status, 401);
    assert.equal(body.code, 'INVALID_TOKEN');
  });

  test('만료된 refreshToken이면 401을 반환한다', async () => {
    const expired = jwt.sign({ sub: 'someone', role: 'USER' }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: -10,
    });

    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: expired }),
    });

    assert.equal(res.status, 401);
  });
});

describe('authMiddleware', () => {
  function mockRes() {
    return { statusCode: null, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  }

  test('Authorization 헤더가 없으면 401 UNAUTHORIZED로 next(err)를 호출한다', () => {
    let passedErr;
    authMiddleware({ headers: {} }, mockRes(), (err) => { passedErr = err; });

    assert.ok(passedErr);
    assert.equal(passedErr.status, 401);
    assert.equal(passedErr.code, 'UNAUTHORIZED');
  });

  test('위조된 access token이면 401 INVALID_TOKEN으로 next(err)를 호출한다', () => {
    const forged = jwt.sign({ sub: 'x', role: 'USER' }, 'wrong-secret');
    let passedErr;
    authMiddleware(
      { headers: { authorization: `Bearer ${forged}` } },
      mockRes(),
      (err) => { passedErr = err; },
    );

    assert.ok(passedErr);
    assert.equal(passedErr.status, 401);
    assert.equal(passedErr.code, 'INVALID_TOKEN');
  });

  test('유효한 access token이면 req.user에 {id, role}을 주입하고 next()를 에러 없이 호출한다', async () => {
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: testUserLoginId, password: testPassword }),
    });
    const { accessToken } = await loginRes.json();

    const req = { headers: { authorization: `Bearer ${accessToken}` } };
    let nextCalled = false;
    let passedErr = 'not-called';
    authMiddleware(req, mockRes(), (err) => { nextCalled = true; passedErr = err; });

    assert.equal(nextCalled, true);
    assert.equal(passedErr, undefined);
    assert.ok(req.user.id);
    assert.equal(req.user.role, 'USER');
  });
});

describe('Admin 로그인', () => {
  before(async () => {
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(testPassword, 10);
    await pool.query(
      'INSERT INTO admins (login_id, password, name) VALUES ($1, $2, $3)',
      [testAdminLoginId, passwordHash, '관리자테스트'],
    );
  });

  test('admin 계정으로 로그인하면 accessToken payload의 role이 ADMIN이다', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: testAdminLoginId, password: testPassword }),
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    const payload = jwt.verify(body.accessToken, process.env.JWT_ACCESS_SECRET);
    assert.equal(payload.role, 'ADMIN');
  });
});
