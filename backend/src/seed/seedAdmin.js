// Admin 초기 계정 seed (docs/9-plan.md D1)
// 실행: node src/seed/seedAdmin.js
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedAdmin() {
  const loginId = process.env.SEED_ADMIN_LOGIN_ID || "admin";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const name = process.env.SEED_ADMIN_NAME || "시스템관리자";

  const hash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO admins (login_id, password, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (login_id) DO NOTHING
     RETURNING id, login_id`,
    [loginId, hash, name]
  );

  if (result.rowCount === 0) {
    console.log(`Admin '${loginId}' already exists, skipped.`);
  } else {
    console.log(`Admin seeded: ${result.rows[0].login_id} (${result.rows[0].id})`);
  }

  await pool.end();
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
