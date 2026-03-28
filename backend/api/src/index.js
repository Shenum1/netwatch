import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { initWebSocket } from "./ws/server.js";
import { connectDB } from "./db/postgres.js";
import { startWorker, ingestQueue } from "./queue/worker.js";
import { requireAuth } from "./middleware/auth.js";
import { rateLimit, ingestRateLimit } from "./middleware/rateLimit.js";
import eventsRouter  from "./routes/events.js";
import alertsRouter  from "./routes/alerts.js";
import scriptsRouter from "./routes/scripts.js";
import modelRouter   from "./routes/model.js";
import authRouter, { ensureUsersTable } from "./routes/auth.js";

const app = express();

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3003", "http://localhost:5173"],
  credentials: true,
}));

app.use(express.json());
app.set("trust proxy", 1);
app.use(rateLimit({ windowMs: 60_000, max: 500 }));

// ── Public routes ─────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.get("/health", (_, res) => res.json({ status: "ok" }));

// Ingest is public — no auth needed for collectors
app.post("/api/events/ingest", ingestRateLimit, async (req, res) => {
  const { raw, source = "api" } = req.body;
  if (!raw) return res.status(400).json({ error: "raw payload required" });
  await ingestQueue.add("flow", { raw, source }, { removeOnComplete: 100 });
  res.json({ queued: true });
});

// ── Protected routes ──────────────────────────────────────────────────────────
app.use("/api/events",  requireAuth, eventsRouter);
app.use("/api/alerts",  requireAuth, alertsRouter);
app.use("/api/scripts", requireAuth, scriptsRouter);
app.use("/api/model",   requireAuth, modelRouter);

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

const server = createServer(app);
initWebSocket(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, async () => {
  await connectDB();
  await ensureUsersTable();
  await startWorker();
  console.log(`NetWatch API running on :${PORT}`);
});
