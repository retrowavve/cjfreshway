function adminOnlyMiddleware(req, res, next) {
  if (req.user.role !== "ADMIN") {
    const err = new Error("관리자 권한이 필요합니다.");
    err.status = 403;
    err.code = "FORBIDDEN";
    return next(err);
  }
  next();
}

module.exports = adminOnlyMiddleware;
