const pool = require("./pool");

async function findByLoginId(loginId) {
  const result = await pool.query(
    "SELECT id, login_id, password, business_name, name, phone, created_at FROM users WHERE login_id = $1",
    [loginId]
  );
  return result.rows[0] || null;
}

async function insertUser({ loginId, passwordHash, businessName, name, phone }) {
  const result = await pool.query(
    `INSERT INTO users (login_id, password, business_name, name, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, login_id, business_name, name, phone, created_at`,
    [loginId, passwordHash, businessName, name, phone || null]
  );
  return result.rows[0];
}

async function findById(id) {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] || null;
}

async function updateById(id, { businessName, name, phone }) {
  const result = await pool.query(
    `UPDATE users
     SET business_name = COALESCE($2, business_name),
         name = COALESCE($3, name),
         phone = COALESCE($4, phone)
     WHERE id = $1
     RETURNING *`,
    [
      id,
      businessName === undefined ? null : businessName,
      name === undefined ? null : name,
      phone === undefined ? null : phone,
    ]
  );
  return result.rows[0];
}

async function updatePassword(id, passwordHash) {
  await pool.query("UPDATE users SET password = $2 WHERE id = $1", [id, passwordHash]);
}

module.exports = { findByLoginId, insertUser, findById, updateById, updatePassword };
