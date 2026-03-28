import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api.js";
import { Upload, Trash2, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import clsx from "clsx";

const EXAMPLE_SCRIPTS = [
  { name: "pcap_collector.py",    source: "pcap",    desc: "Packet capture — raw pcap fields" },
  { name: "netflow_collector.py", source: "netflow", desc: "NetFlow v9 — flow records" },
  { name: "syslog_collector.py",  source: "syslog",  desc: "Syslog — severity + message length" },
  { name: "dns_collector.py",     source: "dns",     desc: "DNS query log — qname, qtype, payload" },
  { name: "http_collector.py",    source: "http",    desc: "HTTP access log — method, status, bytes" },
];

function StatusBadge({ loaded }) {
  return loaded ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10,
      background: "var(--color-background-success)", color: "var(--color-text-success)",
      padding: "2px 8px", borderRadius: 10 }}>
      <CheckCircle size={10} /> active
    </span>
  ) : (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10,
      background: "var(--color-background-tertiary)", color: "var(--color-text-tertiary)",
      padding: "2px 8px", borderRadius: 10 }}>
      <AlertCircle size={10} /> not loaded
    </span>
  );
}

export default function ScriptsPage() {
  const qc       = useQueryClient();
  const fileRef  = useRef(null);
  const [msg, setMsg] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["scripts"],
    queryFn: () => api.get("/api/scripts/list").then((r) => r.data),
    refetchInterval: 5000,
  });

  const reload = useMutation({
    mutationFn: () => api.post("/api/scripts/reload").then((r) => r.data),
    onSuccess: (d) => {
      setMsg({ type: "ok", text: `Reloaded ${d.reloaded?.length || 0} scripts` });
      qc.invalidateQueries({ queryKey: ["scripts"] });
    },
  });

  const remove = useMutation({
    mutationFn: (name) => api.delete(`/api/scripts/${name}`).then((r) => r.data),
    onSuccess: (_, name) => {
      setMsg({ type: "ok", text: `Deleted ${name}` });
      qc.invalidateQueries({ queryKey: ["scripts"] });
    },
    onError: (e) => setMsg({ type: "err", text: e.response?.data?.error || "Delete failed" }),
  });

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      const { data: d } = await api.post("/api/scripts/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMsg({ type: "ok", text: `Uploaded ${d.filename} — ${d.status}` });
      qc.invalidateQueries({ queryKey: ["scripts"] });
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.error || "Upload failed" });
    }
    e.target.value = "";
  }

  const scripts   = data?.scripts || [];
  const loaded    = new Set(data?.loaded_extractors || []);

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", fontFamily: "var(--font-mono,monospace)" }}>
            Collector scripts
          </div>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 3, fontFamily: "var(--font-mono,monospace)" }}>
            Drop a .py file to add a new data source — no restart needed
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => reload.mutate()}
            disabled={reload.isPending}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", fontSize: 11,
              fontFamily: "var(--font-mono,monospace)", border: "0.5px solid var(--color-border-secondary)",
              borderRadius: 8, background: "none", color: "var(--color-text-secondary)", cursor: "pointer" }}>
            <RefreshCw size={12} />{reload.isPending ? "reloading…" : "reload all"}
          </button>
          <button onClick={() => fileRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", fontSize: 11,
              fontFamily: "var(--font-mono,monospace)", border: "0.5px solid var(--color-border-info)",
              borderRadius: 8, background: "var(--color-background-info)", color: "var(--color-text-info)", cursor: "pointer" }}>
            <Upload size={12} /> upload script
          </button>
          <input ref={fileRef} type="file" accept=".py" style={{ display: "none" }} onChange={handleUpload} />
        </div>
      </div>

      {/* Status message */}
      {msg && (
        <div style={{
          padding: "8px 14px", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono,monospace)",
          background: msg.type === "ok" ? "var(--color-background-success)" : "var(--color-background-danger)",
          color: msg.type === "ok" ? "var(--color-text-success)" : "var(--color-text-danger)",
          border: `0.5px solid ${msg.type === "ok" ? "var(--color-border-success)" : "var(--color-border-danger)"}`,
        }}>
          {msg.text}
        </div>
      )}

      {/* Scripts table */}
      <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)",
          background: "var(--color-background-secondary)", fontSize: 10,
          color: "var(--color-text-tertiary)", letterSpacing: ".06em", fontFamily: "var(--font-mono,monospace)" }}>
          INSTALLED SCRIPTS — {scripts.length} files · {loaded.size} active extractors
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {["SCRIPT", "SOURCE", "STATUS", ""].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "6px 16px", fontSize: 10,
                  color: "var(--color-text-tertiary)", fontWeight: 400, letterSpacing: ".06em",
                  borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={4} style={{ padding: "24px 16px", textAlign: "center",
                color: "var(--color-text-tertiary)", fontSize: 12 }}>loading…</td></tr>
            )}
            {scripts.map((name) => {
              const source = name.replace("_collector.py", "");
              const isLoaded = loaded.has(source);
              const example = EXAMPLE_SCRIPTS.find((e) => e.name === name);
              return (
                <tr key={name} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <td style={{ padding: "10px 16px", fontFamily: "var(--font-mono,monospace)",
                    color: "var(--color-text-primary)" }}>{name}</td>
                  <td style={{ padding: "10px 16px", color: "var(--color-text-secondary)" }}>{source}</td>
                  <td style={{ padding: "10px 16px" }}><StatusBadge loaded={isLoaded} /></td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>
                    <button onClick={() => { if (confirm(`Delete ${name}?`)) remove.mutate(name); }}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px",
                        fontSize: 10, fontFamily: "var(--font-mono,monospace)",
                        border: "0.5px solid var(--color-border-danger)", borderRadius: 6,
                        background: "none", color: "var(--color-text-danger)", cursor: "pointer" }}>
                      <Trash2 size={10} /> delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {!isLoading && scripts.length === 0 && (
              <tr><td colSpan={4} style={{ padding: "24px 16px", textAlign: "center",
                color: "var(--color-text-tertiary)", fontSize: 12 }}>No scripts installed</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* How to write a script */}
      <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)",
          background: "var(--color-background-secondary)", fontSize: 10,
          color: "var(--color-text-tertiary)", letterSpacing: ".06em", fontFamily: "var(--font-mono,monospace)" }}>
          HOW TO WRITE A COLLECTOR SCRIPT
        </div>
        <pre style={{ padding: 16, fontSize: 11, color: "var(--color-text-secondary)",
          fontFamily: "var(--font-mono,monospace)", lineHeight: 1.7, overflowX: "auto",
          background: "var(--color-background-primary)" }}>{`from features.pipeline import register_extractor

SOURCE_NAME = "my_source"   # must be unique

def extract(raw: dict) -> dict:
    return {
        "bytes_in":     float(raw.get("in_bytes", 0)),
        "bytes_out":    float(raw.get("out_bytes", 0)),
        "packet_count": float(raw.get("packets", 1)),
        "duration_ms":  float(raw.get("duration", 1)),
        "src_port":     float(raw.get("sport", 0)),
        "dst_port":     float(raw.get("dport", 0)),
        "protocol":     6.0,  # 6=tcp 17=udp 1=icmp
    }

register_extractor(SOURCE_NAME, extract)`}</pre>
      </div>
    </div>
  );
}
