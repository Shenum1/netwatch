import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../utils/api.js";
import { useAuthStore } from "../store/useAuthStore.js";
import clsx from "clsx";

export default function LoginPage() {
  const [mode, setMode]         = useState("login"); // login | register
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const { setTokens }           = useAuthStore();
  const navigate                = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fn   = mode === "login" ? login : register;
      const data = await fn(username, password);
      setTokens(data.accessToken, data.refreshToken, data.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#080a10",
    }}>
      <div style={{
        width: 380, background: "#0f1117",
        border: "0.5px solid #1e2130", borderRadius: 16, padding: "36px 32px",
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div style={{
            fontFamily: "var(--font-mono,monospace)", fontSize: 13,
            fontWeight: 500, letterSpacing: ".14em", color: "#378ADD", marginBottom: 4,
          }}>
            NETWATCH
          </div>
          <div style={{ fontSize: 11, color: "#4a5068", fontFamily: "var(--font-mono,monospace)" }}>
            Network Anomaly Detector
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: "flex", background: "#080a10",
          borderRadius: 8, padding: 3, marginBottom: 24,
          border: "0.5px solid #1e2130",
        }}>
          {["login", "register"].map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(null); }}
              style={{
                flex: 1, padding: "6px 0", fontSize: 11, fontFamily: "var(--font-mono,monospace)",
                border: "none", borderRadius: 6, cursor: "pointer", transition: "all .15s",
                background: mode === m ? "#0f1e35" : "transparent",
                color: mode === m ? "#378ADD" : "#4a5068",
              }}>
              {m}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, color: "#4a5068", fontFamily: "var(--font-mono,monospace)", letterSpacing: ".06em", display: "block", marginBottom: 5 }}>
              USERNAME
            </label>
            <input
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              required autoFocus
              style={{
                width: "100%", padding: "9px 12px", fontSize: 12,
                fontFamily: "var(--font-mono,monospace)", background: "#080a10",
                border: "0.5px solid #1e2130", borderRadius: 8, color: "#c9d1d9",
                outline: "none",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#4a5068", fontFamily: "var(--font-mono,monospace)", letterSpacing: ".06em", display: "block", marginBottom: 5 }}>
              PASSWORD
            </label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={8}
              style={{
                width: "100%", padding: "9px 12px", fontSize: 12,
                fontFamily: "var(--font-mono,monospace)", background: "#080a10",
                border: "0.5px solid #1e2130", borderRadius: 8, color: "#c9d1d9",
                outline: "none",
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: "8px 12px", background: "rgba(226,75,74,.12)",
              border: "0.5px solid rgba(226,75,74,.3)", borderRadius: 8,
              fontSize: 11, color: "#E24B4A", fontFamily: "var(--font-mono,monospace)",
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{
              marginTop: 4, padding: "10px 0", fontSize: 12,
              fontFamily: "var(--font-mono,monospace)", fontWeight: 500,
              background: loading ? "#0f1e35" : "#185FA5",
              color: loading ? "#378ADD" : "#fff",
              border: "0.5px solid #185FA5", borderRadius: 8,
              cursor: loading ? "not-allowed" : "pointer", transition: "all .15s",
            }}>
            {loading ? "please wait…" : mode === "login" ? "sign in" : "create account"}
          </button>
        </form>

        {mode === "login" && (
          <p style={{ marginTop: 16, fontSize: 10, color: "#3a4055", textAlign: "center", fontFamily: "var(--font-mono,monospace)" }}>
            No account yet? Switch to register above.
          </p>
        )}
      </div>
    </div>
  );
}
