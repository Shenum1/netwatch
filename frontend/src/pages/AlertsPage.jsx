import { useState } from "react";
import { useAlerts, useAcknowledge } from "../hooks/useAlerts.js";
import { CheckCheck, AlertTriangle, XOctagon } from "lucide-react";
import clsx from "clsx";

const SEVERITY_CFG = {
  critical: {
    label: "Critical",
    icon: XOctagon,
    bg: "bg-red-950/50",
    text: "text-red-400",
    border: "border-red-900/60",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    bg: "bg-amber-950/40",
    text: "text-amber-400",
    border: "border-amber-900/60",
  },
};

export default function AlertsPage() {
  const [filter, setFilter] = useState("all"); // all | critical | warning | open
  const { data, isLoading } = useAlerts({
    severity: filter === "critical" || filter === "warning" ? filter : undefined,
    acknowledged: filter === "open" ? false : undefined,
    limit: 100,
  });
  const ack = useAcknowledge();

  const alerts = data?.data || [];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-mono font-medium text-gray-100 tracking-wide">
          Alerts
        </h1>
        <div className="flex gap-2">
          {["all", "critical", "warning", "open"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors",
                filter === f
                  ? "bg-brand-700/30 text-brand-500 border-brand-700/50"
                  : "text-gray-500 border-gray-700 hover:text-gray-300 hover:bg-gray-800"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        {isLoading && (
          <p className="text-sm text-gray-500 font-mono text-center py-12">
            loading…
          </p>
        )}

        {!isLoading && alerts.length === 0 && (
          <div className="text-center py-16 text-gray-600 font-mono text-sm">
            No alerts matching filter
          </div>
        )}

        {alerts.map((alert) => {
          const cfg = SEVERITY_CFG[alert.severity] || SEVERITY_CFG.warning;
          const Icon = cfg.icon;
          return (
            <div
              key={alert.id}
              className={clsx(
                "flex items-start gap-4 p-4 rounded-xl border transition-opacity",
                cfg.bg,
                cfg.border,
                alert.acknowledged && "opacity-40"
              )}
            >
              <Icon size={16} className={clsx("mt-0.5 shrink-0", cfg.text)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={clsx("text-xs font-mono font-medium", cfg.text)}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                  {alert.source && (
                    <span className="text-xs text-gray-600 font-mono">
                      · {alert.source}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-300 font-mono truncate">
                  {alert.message}
                </p>
                {alert.geo?.country && (
                  <p className="text-xs text-gray-600 font-mono mt-1">
                    {alert.geo.country}
                    {alert.anomaly_score != null && (
                      <> · score {Number(alert.anomaly_score).toFixed(3)}</>
                    )}
                  </p>
                )}
              </div>
              <div className="shrink-0">
                {alert.acknowledged ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-mono">
                    <CheckCheck size={12} /> acked
                  </span>
                ) : (
                  <button
                    onClick={() => ack.mutate(alert.id)}
                    disabled={ack.isPending}
                    className="text-xs font-mono px-3 py-1.5 border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    acknowledge
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
