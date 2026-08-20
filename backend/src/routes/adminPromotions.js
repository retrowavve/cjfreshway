const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware");
const adminOnlyMiddleware = require("../middlewares/adminOnlyMiddleware");
const promotionService = require("../services/promotionService");

router.use(authMiddleware, adminOnlyMiddleware);

router.get("/", async (req, res, next) => {
  try {
    const promotions = await promotionService.listAll();
    res.status(200).json(promotions);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const promotion = await promotionService.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(promotion);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const promotion = await promotionService.update(req.params.id, req.body);
    res.status(200).json(promotion);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/participations", async (req, res, next) => {
  try {
    const summary = await promotionService.getAdminParticipationSummary(req.params.id);
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/end", async (req, res, next) => {
  try {
    const promotion = await promotionService.endEarly(req.params.id);
    res.status(200).json(promotion);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
