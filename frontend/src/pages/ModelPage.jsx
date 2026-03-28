import { useState, useRef, useEffect } from "react";
import { useModelStatus, useTraining } from "../hooks/useModel.js";
import { useQueryClient } from "@tanstack/react-query";
import ShapChart from "../components/charts/ShapChart.jsx";
import { useEventStore } from "../store/useEventStore.js";
import { useMemo } from "react";
import clsx from "clsx";

function StatusPill({ trained }) {
  return (
    <span className={clsx(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono",
      trained
        ? "bg-green-950/50 text-green-400"
        : "bg-amber-950/40 text-amber-400"
    )}>
      <span className={clsx("w-1.5 h-1.5 rounded-full", trained ? "bg-green-400" : "bg-amber-400")} />
      {trained ? "model loaded" : "not trained"}
    </span>
  );
}

export default function ModelPage() {
  const { data: status, refetch } = useModelStatus();
  const { train, lines, training, done, error } = useTraining();
  const qc = useQueryClient();
  const logRef = useRef(null);

  const [params, setParams] = useState({
    nSamples: 50000,
    anomalyRatio: 0.08,
    nEstimators: 200,
    contamination: 0.05,
  });

  // Last anomalous event for SHAP display
  const events = useEventStore((s) => s.events);
  const lastAnom = useMemo(
    () => events.find((e) => e.is_anomaly && e.shap?.length),
    [events]
  );

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  // Refetch model status after training completes
  useEffect(() => {
    if (done) {
      refetch();
      qc.invalidateQueries({ queryKey: ["model-status"] });
    }
  }, [done, refetch, qc]);

  function ParamSlider({ id, label, min, max, step, value, format }) {
    return (
      <div className="flex items-center gap-3 py-3 border-b border-gray-800">
        <span className="text-xs font-mono text-gray-400 w-40 shrink-0">{label}</span>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => setParams((p) => ({ ...p, [id]: Number(e.target.value) }))}
          className="flex-1"
        />
        <span className="text-xs font-mono text-gray-300 w-20 text-right">
          {format ? format(value) : value}
        </span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-mono font-medium text-gray-100 tracking-wide">Model</h1>
        <StatusPill trained={status?.trained} />
      </div>

      {/* Model metadata */}
      {status?.trained && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Trees", value: status.n_estimators },
            { label: "Features", value: status.feature_names?.length },
            { label: "Trained samples", value: Number(status.n_samples || 0).toLocaleString() },
            { label: "Model size", value: `${status.model_size_kb} KB` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-mono uppercase tracking-widest mb-1">{label}</p>
              <p className="text-xl font-mono font-medium text-gray-100">{value ?? "—"}</p>
            </div>
          ))}
        </div>
      )}

      {/* Training config + trigger */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
          <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
            Training configuration
          </span>
          <button
            onClick={() => train(params)}
            disabled={training}
            className={clsx(
              "px-4 py-1.5 text-xs font-mono rounded-lg border transition-colors",
              training
                ? "border-gray-700 text-gray-600 cursor-not-allowed"
                : "border-brand-700/60 text-brand-500 hover:bg-brand-700/20"
            )}
          >
            {training ? "training…" : "▶ run training"}
          </button>
        </div>
        <div className="px-5">
          <ParamSlider id="nSamples" label="samples" min={5000} max={100000} step={5000}
            value={params.nSamples} format={(v) => Number(v).toLocaleString()} />
          <ParamSlider id="anomalyRatio" label="anomaly ratio" min={0.02} max={0.25} step={0.01}
            value={params.anomalyRatio} format={(v) => `${(v * 100).toFixed(0)}%`} />
          <ParamSlider id="nEstimators" label="trees (n_estimators)" min={50} max={500} step={50}
            value={params.nEstimators} />
          <ParamSlider id="contamination" label="iso contamination" min={0.01} max={0.2} step={0.01}
            value={params.contamination} format={(v) => `${(v * 100).toFixed(0)}%`} />
        </div>
      </div>

      {/* Training log */}
      {(lines.length > 0 || training) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Training log</span>
            {training && (
              <span className="flex items-center gap-1.5 text-xs font-mono text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                running
              </span>
            )}
            {done && !error && (
              <span className="text-xs font-mono text-green-400">✓ complete</span>
            )}
            {error && <span className="text-xs font-mono text-red-400">✗ {error}</span>}
          </div>
          <div
            ref={logRef}
            className="p-4 font-mono text-xs leading-relaxed overflow-y-auto"
            style={{ maxHeight: 280, background: "#0d1117", color: "#c9d1d9" }}
          >
            {lines.map((line, i) => {
              const color =
                line.startsWith("✓") || line.includes("Done") ? "#3fb950"
                : line.startsWith("──") ? "#79c0ff"
                : line.includes("Error") || line.includes("failed") ? "#f85149"
                : line.match(/^\s+\w+\s+:\s/) ? "#e3b341"
                : "#8b949e";
              return (
                <div key={i} style={{ color }}>
                  {line || "\u00A0"}
                </div>
              );
            })}
            {training && <span style={{ color: "#3fb950" }}>▋</span>}
          </div>
        </div>
      )}

      {/* SHAP — last anomalous event */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">
          SHAP explanation — last anomalous event
        </p>
        {lastAnom ? (
          <ShapChart shap={lastAnom.shap} />
        ) : (
          <p className="text-sm text-gray-600 font-mono text-center py-6">
            Waiting for an anomalous event…
          </p>
        )}
      </div>
    </div>
  );
}
