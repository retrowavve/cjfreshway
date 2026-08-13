const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const errorHandler = require('./errorHandler');

function mockRes() {
  const res = {};
  res.statusCode = null;
  res.body = null;
  res.status = function (code) {
    res.statusCode = code;
    return res;
  };
  res.json = function (payload) {
    res.body = payload;
    return res;
  };
  return res;
}

describe('errorHandler', () => {
  test('err.status/err.code가 있으면 해당 status/code로 응답한다', () => {
    const err = new Error('권한이 없습니다');
    err.status = 403;
    err.code = 'FORBIDDEN';
    const res = mockRes();

    errorHandler(err, {}, res, () => {});

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { code: 'FORBIDDEN', message: '권한이 없습니다' });
  });

  test('일반 Error는 500, INTERNAL_ERROR로 응답한다', () => {
    const err = new Error('boom');
    const res = mockRes();

    errorHandler(err, {}, res, () => {});

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.code, 'INTERNAL_ERROR');
    assert.ok('message' in res.body);
  });

  test('응답 바디는 정확히 { code, message } 형태만 가진다', () => {
    const err = new Error('DB 연결 실패');
    err.status = 503;
    err.code = 'DB_UNAVAILABLE';
    const res = mockRes();

    errorHandler(err, {}, res, () => {});

    assert.deepEqual(Object.keys(res.body).sort(), ['code', 'message']);
    assert.equal(res.body.code, 'DB_UNAVAILABLE');
    assert.equal(res.body.message, 'DB 연결 실패');
  });

  test('err.status만 있고 err.code가 없으면 status는 유지하고 code는 INTERNAL_ERROR로 폴백한다', () => {
    const err = new Error('알 수 없는 상태');
    err.status = 400;
    const res = mockRes();

    errorHandler(err, {}, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'INTERNAL_ERROR');
  });
});
