import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { useEventStore } from "../../store/useEventStore.js";
import { useMemo } from "react";

export default function AnomalyScoreChart() {
  const events = useEventStore((s) => s.events);

  const data = useMemo(() => {
    return [...events]
      .reverse()
      .slice(-60)
      .map((e, i) => ({
        i,
        score: e.anomaly_score,
        time: new Date(e.ts || Date.now()).toLocaleTimeString([], {
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        }),
        anomaly: e.is_anomaly,
      }));
  }, [events]);

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#378ADD" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#378ADD" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="anomGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#E24B4A" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#E24B4A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />
        <XAxis dataKey="time" tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis domain={[0, 1]} tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }} tickCount={5} />
        <Tooltip
          contentStyle={{
            background: "var(--color-background-secondary)",
            border: "0.5px solid var(--color-border-secondary)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--color-text-secondary)" }}
          formatter={(v) => [v.toFixed(4), "score"]}
        />
        <ReferenceLine y={0.5} stroke="#EF9F27" strokeDasharray="4 4" strokeWidth={1} />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#378ADD"
          strokeWidth={1.5}
          fill="url(#scoreGrad)"
          dot={false}
          activeDot={{ r: 3, fill: "#378ADD" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
