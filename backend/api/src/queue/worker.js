import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import axios from "axios";
import geoip from "geoip-lite";
import { getPool } from "../db/postgres.js";
import { broadcast } from "../ws/server.js";
import { triggerAlerts } from "../alerts/engine.js";

const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

/** Expose so collector endpoints can enqueue flows. */
export const ingestQueue = new Queue("ingest", { connection });

export async function startWorker() {
  const worker = new Worker(
    "ingest",
    async (job) => {
      const { raw, source } = job.data;

      // 1. ML prediction + SHAP explanation
      const { data } = await axios.post(
        `${process.env.ML_SERVICE_URL}/api/explain`,
        { raw, source }
      );

      // 2. GeoIP enrichment
      const geo = geoip.lookup(raw.src_ip || "") || {};

      // 3. Persist event
      const pool = getPool();
      const { rows } = await pool.query(
        `INSERT INTO events (source, anomaly_score, is_anomaly, features, shap, raw, geo)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [
          source,
          data.anomaly_score,
          data.is_anomaly,
          JSON.stringify(data.features),
          JSON.stringify(data.shap),
          JSON.stringify(raw),
          JSON.stringify(geo),
        ]
      );

      const event = { id: rows[0].id, ...data, geo, raw, source, ts: new Date() };

      // 4. Push to all dashboard clients
      broadcast({ type: "event", payload: event });

      // 5. Fire alerts if anomalous
      if (data.is_anomaly) await triggerAlerts(event, pool);
    },
    { connection, concurrency: 8 }
  );

  worker.on("failed", (job, err) =>
    console.error(`Job ${job?.id} failed:`, err.message)
  );

  console.log("BullMQ ingest worker started");
}
