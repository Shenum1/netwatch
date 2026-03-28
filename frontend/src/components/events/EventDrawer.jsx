import { useQuery } from "@tanstack/react-query";
import { fetchEvent } from "../../utils/api.js";
import { X } from "lucide-react";
import ShapChart from "../charts/ShapChart.jsx";

export default function EventDrawer({ eventId, onClose }) {
  const { data: ev, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => fetchEvent(eventId),
    enabled: !!eventId,
  });

  if (!eventId) return null;

  const score = ev?.anomaly_score || 0;
  const scoreColor = score > 0.85 ? "var(--color-text-danger)"
    : score > 0.5 ? "var(--color-text-warning)"
    : "var(--color-text-success)";

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40,
      }} />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
        background: "var(--color-background-primary)",
        borderLeft: "0.5px solid var(--color-border-tertiary)",
        zIndex: 50, overflowY: "auto", display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--color-background-secondary)" }}>
          <span style={{ fontSize: 12, fontWeight: 500, fontFamily: "var(--font-mono,monospace)",
            color: "var(--color-text-primary)" }}>
            Event #{eventId}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer",
            color: "var(--color-text-tertiary)", display: "flex", alignItems: "center" }}>
            <X size={16} />
          </button>
        </div>

        {isLoading && (
          <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-tertiary)",
            fontSize: 12, fontFamily: "var(--font-mono,monospace)" }}>loading…</div>
        )}

        {ev && (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Score */}
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, background: "var(--color-background-secondary)",
                border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", letterSpacing: ".06em",
                  fontFamily: "var(--font-mono,monospace)", marginBottom: 5 }}>ANOMALY SCORE</div>
                <div style={{ fontSize: 28, fontWeight: 500, color: scoreColor,
                  fontFamily: "var(--font-mono,monospace)" }}>{score.toFixed(4)}</div>
              </div>
              <div style={{ flex: 1, background: "var(--color-background-secondary)",
                border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", letterSpacing: ".06em",
                  fontFamily: "var(--font-mono,monospace)", marginBottom: 5 }}>STATUS</div>
                <div style={{ fontSize: 14, fontWeight: 500, fontFamily: "var(--font-mono,monospace)",
                  color: ev.is_anomaly ? "var(--color-text-danger)" : "var(--color-text-success)" }}>
                  {ev.is_anomaly ? (score > 0.85 ? "critical" : "warning") : "normal"}
                </div>
              </div>
            </div>

            {/* Meta */}
            <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", background: "var(--color-background-secondary)",
                fontSize: 10, color: "var(--color-text-tertiary)", letterSpacing: ".06em",
                fontFamily: "var(--font-mono,monospace)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                EVENT DETAILS
              </div>
              {[
                ["Source IP",   ev.raw?.src_ip || "—"],
                ["Country",     ev.geo?.country || "—"],
                ["City",        ev.geo?.city || "—"],
                ["Protocol",    ev.raw?.protocol || "—"],
                ["Source",      ev.source || "—"],
                ["Timestamp",   ev.created_at ? new Date(ev.created_at).toLocaleString() : "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", padding: "7px 14px",
                  borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 11 }}>
                  <span style={{ width: 110, color: "var(--color-text-tertiary)",
                    fontFamily: "var(--font-mono,monospace)", flexShrink: 0 }}>{label}</span>
                  <span style={{ color: "var(--color-text-primary)",
                    fontFamily: "var(--font-mono,monospace)" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Features */}
            {ev.features && (
              <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "8px 14px", background: "var(--color-background-secondary)",
                  fontSize: 10, color: "var(--color-text-tertiary)", letterSpacing: ".06em",
                  fontFamily: "var(--font-mono,monospace)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  FEATURE VALUES
                </div>
                {Object.entries(ev.features).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", padding: "5px 14px",
                    borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 11 }}>
                    <span style={{ flex: 1, color: "var(--color-text-tertiary)",
                      fontFamily: "var(--font-mono,monospace)" }}>{k}</span>
                    <span style={{ color: "var(--color-text-primary)",
                      fontFamily: "var(--font-mono,monospace)" }}>
                      {typeof v === "number" ? v.toFixed(4) : v}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* SHAP */}
            {ev.shap?.length > 0 && (
              <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "8px 14px", background: "var(--color-background-secondary)",
                  fontSize: 10, color: "var(--color-text-tertiary)", letterSpacing: ".06em",
                  fontFamily: "var(--font-mono,monospace)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  SHAP EXPLANATION
                </div>
                <div style={{ padding: "8px 0" }}>
                  <ShapChart shap={ev.shap} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
