const pool = require("./pool");

async function findByLoginId(loginId) {
  const result = await pool.query(
    "SELECT id, login_id, password, name, created_at FROM admins WHERE login_id = $1",
    [loginId]
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await pool.query("SELECT * FROM admins WHERE id = $1", [id]);
  return result.rows[0] || null;
}

async function updateById(id, { name }) {
  const result = await pool.query(
    `UPDATE admins SET name = COALESCE($2, name) WHERE id = $1 RETURNING *`,
    [id, name === undefined ? null : name]
  );
  return result.rows[0];
}

async function updatePassword(id, passwordHash) {
  await pool.query("UPDATE admins SET password = $2 WHERE id = $1", [id, passwordHash]);
}

module.exports = { findByLoginId, findById, updateById, updatePassword };
