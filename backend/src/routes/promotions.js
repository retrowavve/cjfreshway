const express = require("express");
const authService = require("../services/authService");
const promotionService = require("../services/promotionService");
const participationService = require("../services/participationService");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const promotions = await promotionService.listOngoing();
    res.status(200).json(promotions);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    let userId;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const payload = authService.verifyAccessToken(authHeader.slice(7));
        userId = payload.sub;
      } catch (e) {
        // 비로그인으로 처리
      }
    }

    const promotion = await promotionService.getById(req.params.id, userId);
    res.status(200).json(promotion);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/participate", authMiddleware, async (req, res, next) => {
  try {
    const participation = await participationService.participateDirect(req.params.id, req.user.id);
    res.status(201).json(participation);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/roulette", authMiddleware, async (req, res, next) => {
  try {
    const result = await participationService.attemptRoulette(req.params.id, req.user.id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
