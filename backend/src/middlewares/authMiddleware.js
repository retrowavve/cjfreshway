const authService = require("../services/authService");

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    const err = new Error("인증이 필요합니다.");
    err.status = 401;
    err.code = "UNAUTHORIZED";
    return next(err);
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = authService.verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authMiddleware;
