const pool = require("./pool");

async function findAttemptCount(userId, promotionId) {
  const result = await pool.query(
    "SELECT attempt_count FROM participations WHERE user_id = $1 AND promotion_id = $2",
    [userId, promotionId]
  );
  return result.rows[0] ? result.rows[0].attempt_count : 0;
}

async function findByUserAndPromotion(userId, promotionId, client) {
  const result = await (client ?? pool).query(
    "SELECT * FROM participations WHERE user_id = $1 AND promotion_id = $2",
    [userId, promotionId]
  );
  return result.rows[0] || null;
}

async function insertDirect(userId, promotionId, client) {
  const result = await (client ?? pool).query(
    `INSERT INTO participations (user_id, promotion_id, status, attempt_count, result)
     VALUES ($1, $2, 'APPLIED', 1, 'PENDING')
     RETURNING *`,
    [userId, promotionId]
  );
  return result.rows[0];
}

async function findOrCreateRouletteParticipation(client, userId, promotionId) {
  const inserted = await client.query(
    `INSERT INTO participations (user_id, promotion_id, status, attempt_count, result)
     VALUES ($1, $2, 'APPLIED', 0, NULL)
     ON CONFLICT (user_id, promotion_id) DO NOTHING
     RETURNING *`,
    [userId, promotionId]
  );
  if (inserted.rowCount > 0) {
    return inserted.rows[0];
  }
  const existing = await client.query(
    "SELECT * FROM participations WHERE user_id = $1 AND promotion_id = $2 FOR UPDATE",
    [userId, promotionId]
  );
  return existing.rows[0];
}

async function incrementAttempt(client, participationId) {
  const result = await client.query(
    "UPDATE participations SET attempt_count = attempt_count + 1, updated_at = now() WHERE id = $1 RETURNING attempt_count",
    [participationId]
  );
  return result.rows[0];
}

async function insertAttempt(client, participationId, attemptNo, result) {
  const inserted = await client.query(
    `INSERT INTO participation_attempts (participation_id, attempt_no, result)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [participationId, attemptNo, result]
  );
  return inserted.rows[0];
}

async function findById(id) {
  const result = await pool.query("SELECT * FROM participations WHERE id = $1", [id]);
  return result.rows[0] || null;
}

async function updateStatus(id, fromStatuses, toStatus) {
  const result = await pool.query(
    `UPDATE participations SET status = $3, updated_at = now()
     WHERE id = $1 AND status = ANY($2::varchar[])
     RETURNING *`,
    [id, fromStatuses, toStatus]
  );
  return result.rows[0] || null;
}

async function findByUserWithPromotion(userId) {
  const result = await pool.query(
    `SELECT p.id, p.user_id, p.promotion_id, p.status, p.participated_at, p.updated_at,
            p.attempt_count, p.result,
            pr.title AS promotion_title, pr.type AS promotion_type
     FROM participations p
     JOIN promotions pr ON pr.id = p.promotion_id
     WHERE p.user_id = $1
     ORDER BY p.participated_at DESC`,
    [userId]
  );
  return result.rows;
}

async function findAttemptsByParticipationIds(participationIds) {
  if (participationIds.length === 0) {
    return [];
  }
  const result = await pool.query(
    `SELECT id, participation_id, attempt_no, result, attempted_at
     FROM participation_attempts
     WHERE participation_id = ANY($1::uuid[])
     ORDER BY participation_id, attempt_no ASC`,
    [participationIds]
  );
  return result.rows;
}

async function findAdminSummaryByPromotionId(promotionId) {
  const { rows } = await pool.query(
    `SELECT
       p.id AS participation_id,
       u.business_name,
       u.name,
       p.status,
       p.participated_at,
       CASE WHEN pr.type = 'DIRECT' THEN p.result ELSE la.result END AS result
     FROM participations p
     JOIN users u ON u.id = p.user_id
     JOIN promotions pr ON pr.id = p.promotion_id
     LEFT JOIN (
       SELECT DISTINCT ON (participation_id) participation_id, result
       FROM participation_attempts
       ORDER BY participation_id, attempt_no DESC
     ) la ON la.participation_id = p.id
     WHERE p.promotion_id = $1
     ORDER BY p.participated_at DESC`,
    [promotionId]
  );
  return rows;
}

module.exports = {
  findAttemptCount,
  findByUserAndPromotion,
  insertDirect,
  findOrCreateRouletteParticipation,
  incrementAttempt,
  insertAttempt,
  findById,
  updateStatus,
  findByUserWithPromotion,
  findAttemptsByParticipationIds,
  findAdminSummaryByPromotionId,
};
