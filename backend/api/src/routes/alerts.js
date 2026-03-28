import { Router } from "express";
import { getPool } from "../db/postgres.js";

const router = Router();

/** GET /api/alerts — recent alerts, optionally filtered by severity */
router.get("/", async (req, res) => {
  const pool = getPool();
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const { severity, acknowledged } = req.query;
  const conditions = [];
  const params = [];

  if (severity) { params.push(severity); conditions.push(`severity = $${params.length}`); }
  if (acknowledged !== undefined) { params.push(acknowledged === "true"); conditions.push(`acknowledged = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(limit);

  const { rows } = await pool.query(
    `SELECT a.*, e.anomaly_score, e.source, e.geo
     FROM alerts a JOIN events e ON a.event_id = e.id
     ${where} ORDER BY a.created_at DESC LIMIT $${params.length}`,
    params
  );
  res.json({ data: rows });
});

/** PATCH /api/alerts/:id/acknowledge */
router.patch("/:id/acknowledge", async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query(
    `UPDATE alerts SET acknowledged = true WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

/** GET /api/alerts/stats — counts for dashboard widgets */
router.get("/stats", async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE severity = 'critical' AND acknowledged = false) AS open_critical,
      COUNT(*) FILTER (WHERE severity = 'warning'  AND acknowledged = false) AS open_warning,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')        AS last_hour,
      COUNT(*)                                                                AS total
    FROM alerts
  `);
  res.json(rows[0]);
});

export default router;
