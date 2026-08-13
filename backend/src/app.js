const express = require("express");
const cors = require("cors");
const pool = require("./db/pool");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", async (req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", db: "connected" });
  } catch (err) {
    err.status = 503;
    err.code = "DB_UNAVAILABLE";
    next(err);
  }
});

app.use((req, res) => {
  res.status(404).json({ code: "NOT_FOUND", message: "요청한 리소스를 찾을 수 없습니다." });
});

app.use(errorHandler);

module.exports = app;
