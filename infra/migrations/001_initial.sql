-- Migration 001: initial schema
-- Run: psql $POSTGRES_URL -f infra/migrations/001_initial.sql

CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    username   TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    salt       TEXT NOT NULL,
    role       TEXT DEFAULT 'analyst',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
    id            SERIAL PRIMARY KEY,
    source        TEXT,
    anomaly_score FLOAT,
    is_anomaly    BOOLEAN,
    features      JSONB,
    shap          JSONB,
    raw           JSONB,
    geo           JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_created_at  ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_is_anomaly  ON events(is_anomaly);
CREATE INDEX IF NOT EXISTS idx_events_score       ON events(anomaly_score DESC);

CREATE TABLE IF NOT EXISTS alerts (
    id           SERIAL PRIMARY KEY,
    event_id     INT REFERENCES events(id) ON DELETE CASCADE,
    severity     TEXT,
    message      TEXT,
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_created_at    ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged  ON alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_severity      ON alerts(severity);
