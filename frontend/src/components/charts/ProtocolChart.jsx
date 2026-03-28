import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useEventStore } from "../../store/useEventStore.js";
import { useMemo } from "react";

const COLORS = ["#378ADD", "#1D9E75", "#EF9F27", "#E24B4A", "#7F77DD", "#D85A30"];

export default function ProtocolChart() {
  const events = useEventStore((s) => s.events);

  const data = useMemo(() => {
    const counts = {};
    events.forEach((e) => {
      const p = e.raw?.protocol || "unknown";
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [events]);

  if (!data.length) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 140, color: "var(--color-text-tertiary)", fontSize: 13 }}>
      No data yet
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={42}
          outerRadius={62}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.85} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--color-background-secondary)",
            border: "0.5px solid var(--color-border-secondary)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: "var(--color-text-secondary)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
