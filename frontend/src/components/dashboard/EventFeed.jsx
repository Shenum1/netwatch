import { useState } from "react";
import { useEventStore } from "../../store/useEventStore.js";
import EventDrawer from "../events/EventDrawer.jsx";

function ScoreBadge({ score }) {
  const color = score > 0.85 ? "var(--color-text-danger)"
    : score > 0.5 ? "var(--color-text-warning)"
    : "var(--color-text-success)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 52, height: 4, background: "var(--color-border-tertiary)", borderRadius: 2 }}>
        <div style={{ width: `${score * 100}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 10, color, minWidth: 36, fontFamily: "var(--font-mono,monospace)" }}>
        {score.toFixed(3)}
      </span>
    </div>
  );
}

function StatusBadge({ isAnomaly, score }) {
  const label = isAnomaly ? (score > 0.85 ? "critical" : "warning") : "normal";
  const styles = {
    critical: { background: "var(--color-background-danger)", color: "var(--color-text-danger)" },
    warning:  { background: "var(--color-background-warning)", color: "var(--color-text-warning)" },
    normal:   { background: "var(--color-background-success)", color: "var(--color-text-success)" },
  }[label];
  return (
    <span style={{ ...styles, padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 500 }}>
      {label}
    </span>
  );
}

export default function EventFeed({ compact = false }) {
  const events = useEventStore((s) => s.events);
  const [selectedId, setSelectedId] = useState(null);
  const limit = compact ? 12 : 50;
  const cols = compact
    ? ["TIME", "SRC IP", "SCORE", "STATUS"]
    : ["TIME", "SRC IP", "COUNTRY", "PROTOCOL", "SCORE", "STATUS"];

  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {cols.map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "6px 14px", fontSize: 10,
                  color: "var(--color-text-tertiary)", fontWeight: 400, letterSpacing: ".06em",
                  borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr><td colSpan={cols.length} style={{ padding: "28px 14px", textAlign: "center",
                color: "var(--color-text-tertiary)", fontSize: 12 }}>
                Waiting for events…
              </td></tr>
            )}
            {events.slice(0, limit).map((ev) => (
              <tr key={ev.id}
                onClick={() => ev.id && setSelectedId(ev.id)}
                style={{
                  borderBottom: "0.5px solid var(--color-border-tertiary)",
                  background: ev.is_anomaly ? "rgba(226,75,74,.04)" : "transparent",
                  cursor: ev.id ? "pointer" : "default",
                  transition: "background .1s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-background-secondary)"}
                onMouseLeave={(e) => e.currentTarget.style.background = ev.is_anomaly ? "rgba(226,75,74,.04)" : "transparent"}
              >
                <td style={{ padding: "6px 14px", fontFamily: "var(--font-mono,monospace)",
                  color: "var(--color-text-tertiary)", fontSize: 10 }}>
                  {new Date(ev.ts || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </td>
                <td style={{ padding: "6px 14px", fontFamily: "var(--font-mono,monospace)",
                  color: "var(--color-text-primary)" }}>{ev.raw?.src_ip || "—"}</td>
                {!compact && <>
                  <td style={{ padding: "6px 14px", color: "var(--color-text-secondary)" }}>{ev.geo?.country || "—"}</td>
                  <td style={{ padding: "6px 14px", color: "var(--color-text-tertiary)" }}>{ev.raw?.protocol || "—"}</td>
                </>}
                <td style={{ padding: "6px 14px" }}><ScoreBadge score={ev.anomaly_score} /></td>
                <td style={{ padding: "6px 14px" }}><StatusBadge isAnomaly={ev.is_anomaly} score={ev.anomaly_score} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EventDrawer eventId={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}
