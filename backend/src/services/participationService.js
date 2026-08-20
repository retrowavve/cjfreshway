const pool = require("../db/pool");
const promotionsRepo = require("../db/promotionsRepo");
const participationsRepo = require("../db/participationsRepo");

const ROULETTE_WIN_PROBABILITY = Number(process.env.ROULETTE_WIN_PROBABILITY) || 0.3;

function makeError(message, status, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

async function findOngoingPromotionOfType(promotionId, type) {
  const promotion = await promotionsRepo.findById(promotionId);
  if (!promotion) {
    throw makeError("프로모션을 찾을 수 없습니다.", 404, "PROMOTION_NOT_FOUND");
  }
  if (promotion.status !== "ONGOING") {
    throw makeError("진행 중인 프로모션이 아닙니다.", 409, "PROMOTION_NOT_ONGOING");
  }
  if (promotion.type !== type) {
    throw makeError("프로모션 타입이 일치하지 않습니다.", 409, "PROMOTION_TYPE_MISMATCH");
  }
  return promotion;
}

async function participateDirect(promotionId, userId) {
  const promotion = await findOngoingPromotionOfType(promotionId, "DIRECT");

  const existing = await participationsRepo.findByUserAndPromotion(userId, promotionId);
  if (existing) {
    throw makeError("이미 참여한 프로모션입니다.", 409, "ALREADY_PARTICIPATED");
  }

  const client = await pool.connect();
  let participation;
  try {
    await client.query("BEGIN");
    participation = await participationsRepo.insertDirect(userId, promotionId, client);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      throw makeError("이미 참여한 프로모션입니다.", 409, "ALREADY_PARTICIPATED");
    }
    throw err;
  } finally {
    client.release();
  }

  return {
    id: participation.id,
    userId: participation.user_id,
    promotionId: participation.promotion_id,
    promotionTitle: promotion.title,
    promotionType: promotion.type,
    status: participation.status,
    participatedAt: participation.participated_at,
    updatedAt: participation.updated_at,
    attemptCount: participation.attempt_count,
    result: participation.result,
  };
}

async function attemptRoulette(promotionId, userId) {
  const promotion = await findOngoingPromotionOfType(promotionId, "ROULETTE");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const participation = await participationsRepo.findOrCreateRouletteParticipation(
      client,
      userId,
      promotionId
    );

    if (participation.attempt_count >= promotion.max_participation_count) {
      throw makeError("응모 가능 횟수를 초과했습니다.", 409, "ATTEMPT_LIMIT_EXCEEDED");
    }

    const result = Math.random() < ROULETTE_WIN_PROBABILITY ? "WIN" : "LOSE";
    const updated = await participationsRepo.incrementAttempt(client, participation.id);
    const attemptNo = updated.attempt_count;
    await participationsRepo.insertAttempt(client, participation.id, attemptNo, result);

    await client.query("COMMIT");

    return {
      participationId: participation.id,
      attemptNo,
      result,
      attemptCount: attemptNo,
      maxParticipationCount: promotion.max_participation_count,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

function toResponse(participation, promotion) {
  return {
    id: participation.id,
    userId: participation.user_id,
    promotionId: participation.promotion_id,
    promotionTitle: promotion.title,
    promotionType: promotion.type,
    status: participation.status,
    participatedAt: participation.participated_at,
    updatedAt: participation.updated_at,
    attemptCount: participation.attempt_count,
    result: participation.result,
  };
}

async function cancel(participationId, userId) {
  const participation = await participationsRepo.findById(participationId);
  if (!participation) {
    throw makeError("참여 내역을 찾을 수 없습니다.", 404, "PARTICIPATION_NOT_FOUND");
  }
  if (participation.user_id !== userId) {
    throw makeError("본인의 참여 내역만 취소할 수 있습니다.", 403, "FORBIDDEN");
  }

  const updated = await participationsRepo.updateStatus(
    participationId,
    ["APPLIED", "REAPPLIED"],
    "CANCELLED"
  );
  if (!updated) {
    throw makeError("취소할 수 없는 상태입니다.", 409, "INVALID_STATUS_TRANSITION");
  }

  const promotion = await promotionsRepo.findById(updated.promotion_id);
  return toResponse(updated, promotion);
}

async function reapply(participationId, userId) {
  const participation = await participationsRepo.findById(participationId);
  if (!participation) {
    throw makeError("참여 내역을 찾을 수 없습니다.", 404, "PARTICIPATION_NOT_FOUND");
  }
  if (participation.user_id !== userId) {
    throw makeError("본인의 참여 내역만 재신청할 수 있습니다.", 403, "FORBIDDEN");
  }
  if (participation.status !== "CANCELLED") {
    throw makeError("재신청할 수 없는 상태입니다.", 409, "INVALID_STATUS_TRANSITION");
  }

  const promotion = await promotionsRepo.findById(participation.promotion_id);
  if (!promotion || promotion.status !== "ONGOING") {
    throw makeError("진행 중인 프로모션이 아닙니다.", 409, "PROMOTION_NOT_ONGOING");
  }

  const updated = await participationsRepo.updateStatus(
    participationId,
    ["CANCELLED"],
    "REAPPLIED"
  );
  if (!updated) {
    throw makeError("재신청할 수 없는 상태입니다.", 409, "INVALID_STATUS_TRANSITION");
  }

  return toResponse(updated, promotion);
}

function toListItemResponse(row, attemptsByParticipationId) {
  const base = {
    id: row.id,
    userId: row.user_id,
    promotionId: row.promotion_id,
    promotionTitle: row.promotion_title,
    promotionType: row.promotion_type,
    status: row.status,
    participatedAt: row.participated_at,
    updatedAt: row.updated_at,
    attemptCount: row.attempt_count,
    result: row.result,
  };
  if (row.promotion_type === "ROULETTE") {
    base.attempts = (attemptsByParticipationId.get(row.id) || []).map((a) => ({
      id: a.id,
      attemptNo: a.attempt_no,
      result: a.result,
      attemptedAt: a.attempted_at,
    }));
  }
  return base;
}

async function listMyParticipations(userId) {
  const rows = await participationsRepo.findByUserWithPromotion(userId);
  const rouletteIds = rows.filter((r) => r.promotion_type === "ROULETTE").map((r) => r.id);
  const attempts = rouletteIds.length
    ? await participationsRepo.findAttemptsByParticipationIds(rouletteIds)
    : [];
  const attemptsByParticipationId = new Map();
  for (const a of attempts) {
    const list = attemptsByParticipationId.get(a.participation_id) || [];
    list.push(a);
    attemptsByParticipationId.set(a.participation_id, list);
  }
  return rows.map((row) => toListItemResponse(row, attemptsByParticipationId));
}

module.exports = { participateDirect, attemptRoulette, cancel, reapply, listMyParticipations };
