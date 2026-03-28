-- Migration 002: performance indexes and source column index
-- Run after 001_initial.sql

CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);

-- Partial index for anomalies only — faster anomaly queries
CREATE INDEX IF NOT EXISTS idx_events_anomalies
    ON events(created_at DESC)
    WHERE is_anomaly = true;

-- Add last_login to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
