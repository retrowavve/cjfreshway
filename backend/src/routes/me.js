const express = require("express");
const participationService = require("../services/participationService");
const authService = require("../services/authService");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/participations", authMiddleware, async (req, res, next) => {
  try {
    const participations = await participationService.listMyParticipations(req.user.id);
    res.status(200).json(participations);
  } catch (err) {
    next(err);
  }
});

router.get("/", authMiddleware, async (req, res, next) => {
  try {
    res.status(200).json(await authService.getMe(req.user));
  } catch (err) {
    next(err);
  }
});

router.put("/", authMiddleware, async (req, res, next) => {
  try {
    res.status(200).json(await authService.updateMe(req.user, req.body || {}));
  } catch (err) {
    next(err);
  }
});

router.put("/password", authMiddleware, async (req, res, next) => {
  try {
    await authService.changePassword(req.user, req.body || {});
    res.status(200).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
