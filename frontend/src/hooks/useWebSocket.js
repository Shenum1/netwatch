import { useEffect, useRef, useCallback } from "react";
import { useEventStore } from "../store/useEventStore.js";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:4000/ws";
const RECONNECT_DELAY = 3000;
const MAX_RETRIES = 10;

/**
 * useWebSocket — mounts once at app level (called in App.jsx).
 * Manages connection lifecycle, exponential-ish backoff, and
 * pipes incoming messages into the Zustand event store.
 */
export function useWebSocket() {
  const ws = useRef(null);
  const retries = useRef(0);
  const reconnectTimer = useRef(null);
  const { setConnected, pushEvent } = useEventStore();

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen = () => {
      retries.current = 0;
      setConnected(true);
    };

    socket.onclose = () => {
      setConnected(false);
      ws.current = null;
      if (retries.current < MAX_RETRIES) {
        const delay = Math.min(RECONNECT_DELAY * 2 ** retries.current, 30_000);
        retries.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };

    socket.onerror = () => socket.close();

    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "event") pushEvent(msg.payload);
      } catch {
        // ignore malformed frames
      }
    };
  }, [setConnected, pushEvent]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);
}
