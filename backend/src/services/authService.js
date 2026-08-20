const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const usersRepo = require("../db/usersRepo");
const adminsRepo = require("../db/adminsRepo");

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  err.code = "INVALID_INPUT";
  return err;
}

function toUserResponse(row) {
  return {
    id: row.id,
    loginId: row.login_id,
    businessName: row.business_name,
    name: row.name,
    phone: row.phone,
    createdAt: row.created_at,
  };
}

function toAdminResponse(row) {
  return {
    id: row.id,
    loginId: row.login_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

function unauthorized() {
  const err = new Error("인증이 필요합니다.");
  err.status = 401;
  err.code = "UNAUTHORIZED";
  return err;
}

async function signup({ loginId, password, businessName, name, phone }) {
  if (!loginId || !password || !businessName || !name) {
    throw badRequest("필수 입력값이 누락되었습니다.");
  }

  const existing = await usersRepo.findByLoginId(loginId);
  if (existing) {
    const err = new Error("이미 사용 중인 아이디입니다.");
    err.status = 409;
    err.code = "LOGIN_ID_DUPLICATE";
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await usersRepo.insertUser({ loginId, passwordHash, businessName, name, phone });
  return toUserResponse(created);
}

function invalidCredentials() {
  const err = new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  err.status = 401;
  err.code = "INVALID_CREDENTIALS";
  return err;
}

function issueTokens({ sub, role, loginId }) {
  const payload = { sub, role, loginId };
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}

async function login({ loginId, password }) {
  if (!loginId || !password) {
    throw badRequest("아이디와 비밀번호를 입력해 주세요.");
  }

  const admin = await adminsRepo.findByLoginId(loginId);
  let account = admin;
  let role = "ADMIN";

  if (!account) {
    account = await usersRepo.findByLoginId(loginId);
    role = "USER";
  }

  if (!account) {
    throw invalidCredentials();
  }

  const matched = await bcrypt.compare(password, account.password);
  if (!matched) {
    throw invalidCredentials();
  }

  return issueTokens({ sub: account.id, role, loginId: account.login_id });
}

async function refresh({ refreshToken }) {
  if (!refreshToken) {
    throw badRequest("refreshToken이 필요합니다.");
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (e) {
    const err = new Error("유효하지 않거나 만료된 토큰입니다.");
    err.status = 401;
    err.code = "INVALID_TOKEN";
    throw err;
  }

  const accessToken = jwt.sign(
    { sub: payload.sub, role: payload.role, loginId: payload.loginId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" }
  );

  return { accessToken, refreshToken };
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (e) {
    const err = new Error("유효하지 않거나 만료된 토큰입니다.");
    err.status = 401;
    err.code = "INVALID_TOKEN";
    throw err;
  }
}

async function getMe(currentUser) {
  if (currentUser.role === "ADMIN") {
    const admin = await adminsRepo.findById(currentUser.id);
    if (!admin) throw unauthorized();
    return toAdminResponse(admin);
  }
  const user = await usersRepo.findById(currentUser.id);
  if (!user) throw unauthorized();
  return toUserResponse(user);
}

async function updateMe(currentUser, body) {
  if (currentUser.role === "ADMIN") {
    const updated = await adminsRepo.updateById(currentUser.id, { name: body.name });
    return toAdminResponse(updated);
  }
  const updated = await usersRepo.updateById(currentUser.id, {
    businessName: body.businessName,
    name: body.name,
    phone: body.phone,
  });
  return toUserResponse(updated);
}

async function changePassword(currentUser, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) {
    throw badRequest("현재 비밀번호와 새 비밀번호를 입력해 주세요.");
  }

  const repo = currentUser.role === "ADMIN" ? adminsRepo : usersRepo;
  const account = await repo.findById(currentUser.id);
  if (!account) throw unauthorized();

  const matches = await bcrypt.compare(currentPassword, account.password);
  if (!matches) {
    const err = new Error("현재 비밀번호가 올바르지 않습니다.");
    err.status = 401;
    err.code = "INVALID_CURRENT_PASSWORD";
    throw err;
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await repo.updatePassword(currentUser.id, hash);
}

module.exports = { signup, login, refresh, verifyAccessToken, getMe, updateMe, changePassword };
