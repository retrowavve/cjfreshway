const promotionsRepo = require("../db/promotionsRepo");
const participationsRepo = require("../db/participationsRepo");

function toPromotionResponse(row) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    description: row.description,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status,
    maxParticipationCount: row.max_participation_count,
    createdBy: row.created_by,
  };
}

async function listOngoing() {
  const rows = await promotionsRepo.findOngoing();
  return rows.map(toPromotionResponse);
}

async function getById(id, userId) {
  const row = await promotionsRepo.findById(id);
  if (!row) {
    const err = new Error("프로모션을 찾을 수 없습니다.");
    err.status = 404;
    err.code = "PROMOTION_NOT_FOUND";
    throw err;
  }

  const promotion = toPromotionResponse(row);

  if (row.type === "ROULETTE" && userId) {
    promotion.myAttemptCount = await participationsRepo.findAttemptCount(userId, id);
  }

  return promotion;
}

async function listAll() {
  const rows = await promotionsRepo.findAll();
  return rows.map(toPromotionResponse);
}

function validateCreateInput({ title, type, startAt, endAt }) {
  if (!title || !type || !startAt || !endAt) {
    const err = new Error("필수 입력값이 누락되었습니다.");
    err.status = 400;
    err.code = "INVALID_INPUT";
    throw err;
  }
  if (type !== "DIRECT" && type !== "ROULETTE") {
    const err = new Error("type은 DIRECT 또는 ROULETTE여야 합니다.");
    err.status = 400;
    err.code = "INVALID_INPUT";
    throw err;
  }
  if (new Date(startAt) >= new Date(endAt)) {
    const err = new Error("startAt은 endAt보다 이전이어야 합니다.");
    err.status = 400;
    err.code = "INVALID_INPUT";
    throw err;
  }
  if (new Date(endAt) <= new Date()) {
    const err = new Error("endAt은 현재 시각 이후여야 합니다.");
    err.status = 400;
    err.code = "INVALID_INPUT";
    throw err;
  }
}

function validateMaxParticipationCount(value) {
  if (!Number.isInteger(value) || value < 1) {
    const err = new Error("maxParticipationCount는 1 이상의 정수여야 합니다.");
    err.status = 400;
    err.code = "INVALID_INPUT";
    throw err;
  }
}

async function create({ title, type, description, startAt, endAt, maxParticipationCount, createdBy }) {
  validateCreateInput({ title, type, startAt, endAt });

  let count = 1;
  if (type === "ROULETTE" && maxParticipationCount !== undefined) {
    validateMaxParticipationCount(maxParticipationCount);
    count = maxParticipationCount;
  }

  const status = new Date() < new Date(startAt) ? "UPCOMING" : "ONGOING";

  const inserted = await promotionsRepo.insert({
    title,
    type,
    description,
    startAt,
    endAt,
    maxParticipationCount: count,
    status,
    createdBy,
  });

  const row = await promotionsRepo.findById(inserted.id);
  return toPromotionResponse(row);
}

async function update(id, { title, description, startAt, endAt, maxParticipationCount }) {
  const existing = await promotionsRepo.findById(id);
  if (!existing) {
    const err = new Error("프로모션을 찾을 수 없습니다.");
    err.status = 404;
    err.code = "PROMOTION_NOT_FOUND";
    throw err;
  }

  const finalStartAt = startAt !== undefined ? startAt : existing.start_at;
  const finalEndAt = endAt !== undefined ? endAt : existing.end_at;
  if (new Date(finalStartAt) >= new Date(finalEndAt)) {
    const err = new Error("startAt은 endAt보다 이전이어야 합니다.");
    err.status = 400;
    err.code = "INVALID_INPUT";
    throw err;
  }

  let count = maxParticipationCount;
  if (existing.type === "DIRECT") {
    count = undefined;
  } else if (count !== undefined) {
    validateMaxParticipationCount(count);
  }

  await promotionsRepo.updateById(id, {
    title,
    description,
    startAt,
    endAt,
    maxParticipationCount: count,
  });

  const row = await promotionsRepo.findById(id);
  return toPromotionResponse(row);
}

async function endEarly(id) {
  const existing = await promotionsRepo.findById(id);
  if (!existing) {
    const err = new Error("프로모션을 찾을 수 없습니다.");
    err.status = 404;
    err.code = "PROMOTION_NOT_FOUND";
    throw err;
  }

  await promotionsRepo.endById(id);

  const row = await promotionsRepo.findById(id);
  return toPromotionResponse(row);
}

async function getAdminParticipationSummary(promotionId) {
  const promotion = await promotionsRepo.findById(promotionId);
  if (!promotion) {
    const err = new Error("프로모션을 찾을 수 없습니다.");
    err.status = 404;
    err.code = "PROMOTION_NOT_FOUND";
    throw err;
  }

  const rows = await participationsRepo.findAdminSummaryByPromotionId(promotionId);
  const items = rows.map((row) => ({
    participationId: row.participation_id,
    businessName: row.business_name,
    name: row.name,
    status: row.status,
    result: row.result,
    participatedAt: row.participated_at,
  }));

  const summary = { totalCount: items.length, items };
  if (promotion.type === "ROULETTE") {
    summary.winCount = items.filter((i) => i.result === "WIN").length;
    summary.loseCount = items.filter((i) => i.result === "LOSE").length;
  }
  return summary;
}

module.exports = { listOngoing, getById, listAll, create, update, endEarly, getAdminParticipationSummary };
