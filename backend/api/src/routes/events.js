import { Router } from "express";
import { getPool } from "../db/postgres.js";
import { ingestQueue } from "../queue/worker.js";

const router = Router();

router.post("/ingest", async (req, res) => {
  const { raw, source = "api" } = req.body;
  if (!raw) return res.status(400).json({ error: "raw payload required" });
  await ingestQueue.add("flow", { raw, source }, { removeOnComplete: 100 });
  res.json({ queued: true });
});

router.get("/", async (req, res) => {
  const pool = getPool();
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const offset = Number(req.query.offset) || 0;
  const anomalyOnly = req.query.anomaly_only === "true";
  const where = anomalyOnly ? "WHERE is_anomaly = true" : "";
  const { rows } = await pool.query(
    `SELECT id, source, anomaly_score, is_anomaly, geo, features, shap, created_at
     FROM events ${where}
     ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  res.json({ data: rows, limit, offset });
});

router.get("/:id", async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query("SELECT * FROM events WHERE id = $1", [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

export default router;
