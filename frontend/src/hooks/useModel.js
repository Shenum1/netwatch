import { useQuery } from "@tanstack/react-query";
import { fetchModelStatus } from "../utils/api.js";
import { useState, useRef, useCallback } from "react";

export function useModelStatus() {
  return useQuery({
    queryKey: ["model-status"],
    queryFn: fetchModelStatus,
    refetchInterval: 10_000,
  });
}

/**
 * useTraining — triggers a training run and streams SSE log lines.
 * Returns { train, lines, training, done, error }
 */
export function useTraining() {
  const [lines, setLines] = useState([]);
  const [training, setTraining] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const esRef = useRef(null);

  const train = useCallback(async (params = {}) => {
    setLines([]);
    setDone(false);
    setError(null);
    setTraining(true);

    // POST to start training, receive SSE stream
    const body = JSON.stringify({
      synthetic: true,
      n_samples: params.nSamples ?? 50_000,
      anomaly_ratio: params.anomalyRatio ?? 0.08,
      n_estimators: params.nEstimators ?? 200,
      contamination: params.contamination ?? 0.05,
    });

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/model/train`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body }
      );

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();
        for (const part of parts) {
          if (!part.startsWith("data:")) continue;
          try {
            const payload = JSON.parse(part.replace(/^data:\s*/, ""));
            if (payload.line !== undefined) {
              setLines((prev) => [...prev, payload.line]);
            }
            if (payload.status) {
              setDone(true);
              setTraining(false);
              if (payload.status === "error") setError("Training failed.");
            }
          } catch {
            // skip malformed frame
          }
        }
      }
    } catch (e) {
      setError(e.message);
      setTraining(false);
    }
  }, []);

  return { train, lines, training, done, error };
}
