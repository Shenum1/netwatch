import { create } from "zustand";

const MAX_EVENTS = 500;

export const useEventStore = create((set, get) => ({
  events: [],
  connected: false,

  setConnected: (connected) => set({ connected }),

  pushEvent: (event) =>
    set((s) => ({
      events: [event, ...s.events].slice(0, MAX_EVENTS),
    })),

  clearEvents: () => set({ events: [] }),

  anomalies: () => get().events.filter((e) => e.is_anomaly),
  avgScore: () => {
    const evs = get().events;
    if (!evs.length) return 0;
    return evs.reduce((s, e) => s + e.anomaly_score, 0) / evs.length;
  },
}));
