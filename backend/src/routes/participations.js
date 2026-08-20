const express = require("express");
const participationService = require("../services/participationService");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.patch("/:id/cancel", authMiddleware, async (req, res, next) => {
  try {
    const participation = await participationService.cancel(req.params.id, req.user.id);
    res.status(200).json(participation);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/reapply", authMiddleware, async (req, res, next) => {
  try {
    const participation = await participationService.reapply(req.params.id, req.user.id);
    res.status(200).json(participation);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
