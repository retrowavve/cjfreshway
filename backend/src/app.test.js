const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// app.js가 자체적으로 dotenv를 로드하지 않는 경우를 대비해 테스트에서도 .env를 보장한다.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = require('./app');
const pool = require('./db/pool');

let server;
let baseUrl;

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
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await pool.end();
});

describe('GET /health', () => {
  test('DB 연결이 정상이면 200과 { status: "ok", db: "connected" }를 반환한다', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.deepEqual(body, { status: 'ok', db: 'connected' });
  });
});

describe('정의되지 않은 라우트', () => {
  test('GET /no-such-route → 404와 { code: "NOT_FOUND", message } 형태를 반환한다', async () => {
    const res = await fetch(`${baseUrl}/no-such-route`);
    const body = await res.json();

    assert.equal(res.status, 404);
    assert.equal(body.code, 'NOT_FOUND');
    assert.ok(typeof body.message === 'string' && body.message.length > 0);
  });
});
