import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from "recharts";

export default function ShapChart({ shap = [] }) {
  if (!shap.length) return (
    <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
      No SHAP data
    </div>
  );

  const data = shap.slice(0, 10).map((d) => ({
    name: d.feature,
    value: d.shap_value,
  }));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-sm font-medium text-gray-300 mb-4">
        SHAP feature importance
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
          <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            width={110}
          />
          <Tooltip
            contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
            labelStyle={{ color: "#e5e7eb" }}
            formatter={(v) => [v.toFixed(4), "SHAP value"]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.value > 0 ? "#E24B4A" : "#378ADD"}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-600 mt-2">
        Red = pushes toward anomaly · Blue = pushes toward normal
      </p>
    </div>
  );
}
