import { NavLink, useNavigate } from "react-router-dom";
import { Activity, Bell, Cpu, RefreshCw, Map, LogOut, Code2 } from "lucide-react";
import { useWebSocket } from "../../hooks/useWebSocket.js";
import { useAlertStats } from "../../hooks/useAlerts.js";
import { useEventStore } from "../../store/useEventStore.js";
import { useAuthStore } from "../../store/useAuthStore.js";
import api from "../../utils/api.js";

const NAV = [
  { to: "/",        icon: Activity, label: "Dashboard" },
  { to: "/alerts",  icon: Bell,     label: "Alerts",    badge: true },
  { to: "/geo",     icon: Map,      label: "GeoIP map" },
  { to: "/model",   icon: Cpu,      label: "Model" },
  { to: "/scripts", icon: Code2,    label: "Scripts" },
];

const navStyle = (isActive) => ({
  display: "flex", alignItems: "center", gap: 9, padding: "7px 10px",
  borderRadius: 8, fontSize: 11, textDecoration: "none", marginBottom: 2,
  fontFamily: "var(--font-mono,monospace)", transition: "all .15s",
  background: isActive ? "var(--color-background-info)" : "transparent",
  color: isActive ? "var(--color-text-info)" : "var(--color-text-tertiary)",
});

const btnStyle = {
  width: "100%", padding: "6px 10px", fontSize: 10,
  fontFamily: "var(--font-mono,monospace)",
  border: "0.5px solid var(--color-border-tertiary)",
  borderRadius: 7, background: "none",
  color: "var(--color-text-tertiary)", cursor: "pointer",
  textAlign: "left", display: "flex", alignItems: "center", gap: 7,
  marginBottom: 4,
};

export default function Sidebar() {
  const connected = useEventStore((s) => s.connected);
  const { data: stats } = useAlertStats();
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const openAlerts = stats
    ? Number(stats.open_critical || 0) + Number(stats.open_warning || 0)
    : 0;

  useWebSocket();

  return (
    <aside style={{
      width: 190, display: "flex", flexDirection: "column", flexShrink: 0,
      background: "var(--color-background-secondary)",
      borderRight: "0.5px solid var(--color-border-tertiary)",
    }}>
      {/* Logo */}
      <div style={{ padding: "18px 16px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ fontFamily: "var(--font-mono,monospace)", fontSize: 11, fontWeight: 500,
          letterSpacing: ".14em", color: "var(--color-text-info)" }}>NETWATCH</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%",
            background: connected ? "#1D9E75" : "#E24B4A", display: "inline-block",
            animation: connected ? "pulse 2s infinite" : "none" }} />
          <span style={{ fontSize: 10, color: "var(--color-text-tertiary)",
            fontFamily: "var(--font-mono,monospace)" }}>
            {connected ? "live" : "reconnecting…"}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 8px" }}>
        {NAV.map(({ to, icon: Icon, label, badge }) => (
          <NavLink key={to} to={to} end={to === "/"}
            style={({ isActive }) => navStyle(isActive)}>
            <Icon size={14} />
            <span style={{ flex: 1 }}>{label}</span>
            {badge && openAlerts > 0 && (
              <span style={{ background: "var(--color-background-danger)",
                color: "var(--color-text-danger)", borderRadius: 10,
                padding: "1px 6px", fontSize: 9 }}>{openAlerts}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + actions */}
      <div style={{ padding: "10px 8px", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
        {user && (
          <div style={{ padding: "4px 10px 8px", fontSize: 10,
            color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono,monospace)" }}>
            {user.username} · {user.role}
          </div>
        )}
        <button style={btnStyle}
          onClick={() => api.post("/api/scripts/reload").catch(() => {})}>
          <RefreshCw size={11} /> reload scripts
        </button>
        <button style={{ ...btnStyle, color: "var(--color-text-danger)",
          borderColor: "var(--color-border-danger)", marginBottom: 0 }}
          onClick={() => { clearAuth(); navigate("/login"); }}>
          <LogOut size={11} /> sign out
        </button>
      </div>
    </aside>
  );
}
