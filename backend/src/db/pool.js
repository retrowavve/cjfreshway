const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DB_CONN_STRING,
});

module.exports = pool;
