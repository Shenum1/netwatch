import { useMemo } from "react";
import GeoMap from "../components/map/GeoMap.jsx";
import { useEventStore } from "../store/useEventStore.js";

export default function GeoPage() {
  const events = useEventStore((s) => s.events);

  const countries = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      const key = e.geo?.country || "Unknown";
      if (!map[key]) map[key] = { country: key, total: 0, anomalies: 0 };
      map[key].total++;
      if (e.is_anomaly) map[key].anomalies++;
    });
    return Object.values(map)
      .sort((a, b) => b.anomalies - a.anomalies || b.total - a.total)
      .slice(0, 20);
  }, [events]);

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-lg font-mono font-medium text-gray-100 tracking-wide">
        GeoIP map
      </h1>

      {/* Full-height map */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden" style={{ height: 380 }}>
        <GeoMap />
      </div>

      {/* Country breakdown table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
            Country breakdown
          </span>
        </div>
        <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="text-gray-500 uppercase tracking-widest" style={{ fontSize: 10 }}>
              {["Country", "Total events", "Anomalies", "Anomaly rate", "Threat level"].map((h) => (
                <th key={h} className="text-left px-5 py-2" style={{ fontWeight: 400, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {countries.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-600">
                  No data yet — events will appear as traffic comes in
                </td>
              </tr>
            )}
            {countries.map((c) => {
              const rate = c.total > 0 ? c.anomalies / c.total : 0;
              const level = rate > 0.4 ? "critical" : rate > 0.15 ? "warning" : "low";
              const levelCfg = {
                critical: { text: "text-red-400", bg: "bg-red-950/50", label: "critical" },
                warning:  { text: "text-amber-400", bg: "bg-amber-950/40", label: "warning" },
                low:      { text: "text-green-500", bg: "bg-green-950/30", label: "low" },
              }[level];
              return (
                <tr key={c.country} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-2.5 font-mono text-gray-300">{c.country}</td>
                  <td className="px-5 py-2.5 text-gray-400">{c.total}</td>
                  <td className="px-5 py-2.5 text-red-400 font-mono">{c.anomalies}</td>
                  <td className="px-5 py-2.5 font-mono text-gray-400">
                    {(rate * 100).toFixed(1)}%
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-mono ${levelCfg.text} ${levelCfg.bg}`}>
                      {levelCfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
