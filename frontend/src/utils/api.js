import axios from "axios";
import { useAuthStore } from "../store/useAuthStore.js";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
  timeout: 10_000,
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { refreshToken, setTokens, clearAuth } = useAuthStore.getState();
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/auth/refresh`,
            { refreshToken }
          );
          setTokens(data.accessToken, data.refreshToken, null);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          clearAuth();
          window.location.href = "/login";
        }
      } else {
        clearAuth();
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export const fetchEvents      = (p) => api.get("/api/events", { params: p }).then((r) => r.data);
export const fetchEvent       = (id) => api.get(`/api/events/${id}`).then((r) => r.data);
export const fetchAlerts      = (p) => api.get("/api/alerts", { params: p }).then((r) => r.data);
export const fetchAlertStats  = () => api.get("/api/alerts/stats").then((r) => r.data);
export const acknowledgeAlert = (id) => api.patch(`/api/alerts/${id}/acknowledge`).then((r) => r.data);
export const fetchModelStatus = () => api.get("/api/model/status").then((r) => r.data);
export const reloadScripts    = () => api.post("/api/scripts/reload").then((r) => r.data);
export const ingestEvent      = (raw, source = "api") => api.post("/api/events/ingest", { raw, source }).then((r) => r.data);

export const login    = (u, p) => axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/auth/login`, { username: u, password: p }).then((r) => r.data);
export const register = (u, p) => axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/auth/register`, { username: u, password: p }).then((r) => r.data);
export const getMe    = () => api.get("/api/auth/me").then((r) => r.data);
