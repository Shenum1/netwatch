import clsx from "clsx";

export default function StatCard({ label, value, sub, color = "default" }) {
  const colors = {
    default: "text-gray-100",
    danger:  "text-red-400",
    warn:    "text-amber-400",
    success: "text-green-400",
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">{label}</p>
      <p className={clsx("text-3xl font-mono font-medium", colors[color])}>{value ?? "—"}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}
