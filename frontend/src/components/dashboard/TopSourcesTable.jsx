import { useMemo } from "react";
import { useEventStore } from "../../store/useEventStore.js";

export default function TopSourcesTable() {
  const events = useEventStore((s) => s.events);

  const rows = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      const ip = e.raw?.src_ip || "unknown";
      if (!map[ip]) map[ip] = { ip, total: 0, anomalies: 0, maxScore: 0, country: e.geo?.country || "—" };
      map[ip].total++;
      if (e.is_anomaly) map[ip].anomalies++;
      if (e.anomaly_score > map[ip].maxScore) map[ip].maxScore = e.anomaly_score;
    });
    return Object.values(map)
      .filter((r) => r.anomalies > 0)
      .sort((a, b) => b.anomalies - a.anomalies)
      .slice(0, 8);
  }, [events]);

  return (
    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ color: "var(--color-text-tertiary)", fontSize: 10, letterSpacing: ".06em" }}>
          {["SOURCE IP", "COUNTRY", "TOTAL", "ANOMALIES", "PEAK SCORE"].map((h) => (
            <th key={h} style={{ textAlign: "left", padding: "6px 14px", fontWeight: 400, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr><td colSpan={5} style={{ padding: "24px 14px", color: "var(--color-text-tertiary)", fontSize: 12, textAlign: "center" }}>No anomalous sources yet</td></tr>
        )}
        {rows.map((r) => (
          <tr key={r.ip} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <td style={{ padding: "7px 14px", fontFamily: "var(--font-mono)", color: "var(--color-text-primary)" }}>{r.ip}</td>
            <td style={{ padding: "7px 14px", color: "var(--color-text-secondary)" }}>{r.country}</td>
            <td style={{ padding: "7px 14px", color: "var(--color-text-secondary)" }}>{r.total}</td>
            <td style={{ padding: "7px 14px" }}>
              <span style={{
                background: "var(--color-background-danger)",
                color: "var(--color-text-danger)",
                borderRadius: 10,
                padding: "2px 8px",
                fontSize: 11,
              }}>{r.anomalies}</span>
            </td>
            <td style={{ padding: "7px 14px", fontFamily: "var(--font-mono)", color: r.maxScore > 0.85 ? "var(--color-text-danger)" : "var(--color-text-warning)" }}>
              {r.maxScore.toFixed(3)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
