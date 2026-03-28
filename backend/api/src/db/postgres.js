import pg from "pg";
const { Pool } = pg;

let pool;

export async function connectDB() {
  pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id          SERIAL PRIMARY KEY,
      source      TEXT,
      anomaly_score FLOAT,
      is_anomaly  BOOLEAN,
      features    JSONB,
      shap        JSONB,
      raw         JSONB,
      geo         JSONB,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id            SERIAL PRIMARY KEY,
      event_id      INT REFERENCES events(id),
      severity      TEXT,
      message       TEXT,
      acknowledged  BOOLEAN DEFAULT FALSE,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log("PostgreSQL connected");
}

export function getPool() { return pool; }
