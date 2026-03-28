import { Router } from "express";
import jwt from "jsonwebtoken";
import { getPool } from "../db/postgres.js";
import { authRateLimit } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/auth.js";
import crypto from "crypto";

const router = Router();
const SECRET     = process.env.JWT_SECRET || "change_me_in_production";
const TOKEN_TTL  = "8h";
const REFRESH_TTL = "7d";

// ── Helpers ──────────────────────────────────────────────────────────────────

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function signTokens(user) {
  const payload = { id: user.id, username: user.username, role: user.role };
  const accessToken  = jwt.sign(payload, SECRET, { expiresIn: TOKEN_TTL });
  const refreshToken = jwt.sign({ id: user.id }, SECRET, { expiresIn: REFRESH_TTL });
  return { accessToken, refreshToken };
}

// ── Schema (auto-creates users table) ────────────────────────────────────────

export async function ensureUsersTable() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      username   TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      salt       TEXT NOT NULL,
      role       TEXT DEFAULT 'analyst',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

// ── POST /api/auth/register ───────────────────────────────────────────────────

router.post("/register", authRateLimit, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const pool = getPool();
  const salt = generateSalt();
  const hashed = hashPassword(password, salt);

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (username, password, salt) VALUES ($1, $2, $3) RETURNING id, username, role`,
      [username.trim().toLowerCase(), hashed, salt]
    );
    const tokens = signTokens(rows[0]);
    res.status(201).json({ user: rows[0], ...tokens });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username already taken" });
    }
    throw err;
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────

router.post("/login", authRateLimit, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT * FROM users WHERE username = $1`,
    [username.trim().toLowerCase()]
  );

  if (!rows.length) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = rows[0];
  const hashed = hashPassword(password, user.salt);

  if (hashed !== user.password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const tokens = signTokens(user);
  res.json({
    user: { id: user.id, username: user.username, role: user.role },
    ...tokens,
  });
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken required" });
  }
  try {
    const payload = jwt.verify(refreshToken, SECRET);
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT id, username, role FROM users WHERE id = $1`,
      [payload.id]
    );
    if (!rows.length) return res.status(401).json({ error: "User not found" });
    const tokens = signTokens(rows[0]);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

router.get("/me", requireAuth, async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, username, role, created_at FROM users WHERE id = $1`,
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: "User not found" });
  res.json(rows[0]);
});

export default router;
