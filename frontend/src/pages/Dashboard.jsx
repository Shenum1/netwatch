import { useMemo } from "react";
import { useEventStore } from "../store/useEventStore.js";
import { useAlertStats } from "../hooks/useAlerts.js";
import StatCard from "../components/dashboard/StatCard.jsx";
import EventFeed from "../components/dashboard/EventFeed.jsx";
import TopSourcesTable from "../components/dashboard/TopSourcesTable.jsx";
import AnomalyScoreChart from "../components/charts/AnomalyScoreChart.jsx";
import ProtocolChart from "../components/charts/ProtocolChart.jsx";
import GeoMap from "../components/map/GeoMap.jsx";

export default function Dashboard() {
  const events = useEventStore((s) => s.events);
  const { data: alertStats } = useAlertStats();

  const stats = useMemo(() => {
    const anomalies = events.filter((e) => e.is_anomaly);
    const avg = events.length
      ? events.reduce((s, e) => s + e.anomaly_score, 0) / events.length
      : 0;
    return {
      total: events.length,
      anomalies: anomalies.length,
      avgScore: avg.toFixed(3),
      openAlerts:
        (Number(alertStats?.open_critical) || 0) +
        (Number(alertStats?.open_warning) || 0),
    };
  }, [events, alertStats]);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-mono font-medium text-gray-100 tracking-wide">
            Overview
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Real-time network anomaly detection
          </p>
        </div>
        <span className="text-xs font-mono text-gray-600">
          {new Date().toLocaleString()}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total events" value={stats.total.toLocaleString()} />
        <StatCard label="Anomalies" value={stats.anomalies.toLocaleString()} color="danger" />
        <StatCard label="Avg score" value={stats.avgScore} color="warn" />
        <StatCard label="Open alerts" value={stats.openAlerts} color="danger" />
      </div>

      {/* Score chart + protocol breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">
            Anomaly score — last 60 events
          </p>
          <AnomalyScoreChart />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">
            Protocol breakdown
          </p>
          <ProtocolChart />
        </div>
      </div>

      {/* GeoIP map */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
            GeoIP — anomaly origins
          </span>
        </div>
        <div style={{ height: 220 }}>
          <GeoMap />
        </div>
      </div>

      {/* Bottom row: feed + top sources */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800">
            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
              Live feed
            </span>
          </div>
          <EventFeed compact />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800">
            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
              Top anomalous sources
            </span>
          </div>
          <TopSourcesTable />
        </div>
      </div>
    </div>
  );
}
