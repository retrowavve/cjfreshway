const pool = require("./pool");

const STATUS_CASE = `CASE
    WHEN status = 'ENDED' THEN 'ENDED'
    WHEN now() < start_at THEN 'UPCOMING'
    WHEN now() >= end_at THEN 'ENDED'
    ELSE 'ONGOING'
  END`;

async function findOngoingAndUpcoming() {
  const result = await pool.query(
    `SELECT id, title, type, description, start_at, end_at, ${STATUS_CASE} AS status,
            max_participation_count, created_by
     FROM promotions
     WHERE (${STATUS_CASE}) IN ('ONGOING', 'UPCOMING')
     ORDER BY CASE WHEN (${STATUS_CASE}) = 'ONGOING' THEN 0 ELSE 1 END, start_at`
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT id, title, type, description, start_at, end_at, ${STATUS_CASE} AS status,
            max_participation_count, created_by
     FROM promotions
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function findAll() {
  const result = await pool.query(
    `SELECT id, title, type, description, start_at, end_at, ${STATUS_CASE} AS status,
            max_participation_count, created_by
     FROM promotions
     ORDER BY id`
  );
  return result.rows;
}

async function insert({ title, type, description, startAt, endAt, maxParticipationCount, status, createdBy }) {
  const result = await pool.query(
    `INSERT INTO promotions (title, type, description, start_at, end_at, max_participation_count, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [title, type, description, startAt, endAt, maxParticipationCount, status, createdBy]
  );
  return result.rows[0];
}

async function updateById(id, { title, description, startAt, endAt, maxParticipationCount }) {
  const result = await pool.query(
    `UPDATE promotions
     SET title = COALESCE($2, title),
         description = COALESCE($3, description),
         start_at = COALESCE($4, start_at),
         end_at = COALESCE($5, end_at),
         max_participation_count = COALESCE($6, max_participation_count)
     WHERE id = $1
     RETURNING id`,
    [
      id,
      title === undefined ? null : title,
      description === undefined ? null : description,
      startAt === undefined ? null : startAt,
      endAt === undefined ? null : endAt,
      maxParticipationCount === undefined ? null : maxParticipationCount,
    ]
  );
  return result.rows[0];
}

async function endById(id) {
  const result = await pool.query(
    `UPDATE promotions SET status = 'ENDED' WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.rows[0];
}

module.exports = { findOngoingAndUpcoming, findById, findAll, insert, updateById, endById };
