"""
Syslog collector — parses structured syslog dicts into flow features.
Register with source="syslog".

Expected raw fields:
  severity, facility, msg_len, hostname,
  pid (optional), timestamp_ms (optional)

Anomaly signals in syslog: repeated auth failures, severity spikes,
high message rates from a single host.
"""
from features.pipeline import register_extractor

SOURCE_NAME = "syslog"

SEVERITY_MAP = {
    "emerg": 0, "alert": 1, "crit": 2, "err": 3,
    "warning": 4, "notice": 5, "info": 6, "debug": 7,
}


def extract(raw: dict) -> dict:
    sev_str = str(raw.get("severity", "info")).lower()
    sev_num = float(SEVERITY_MAP.get(sev_str, 6))
    msg_len = float(raw.get("msg_len", len(str(raw.get("message", "")))))

    return {
        "bytes_in":     msg_len,
        "bytes_out":    0.0,
        "packet_count": 1.0,
        "duration_ms":  1.0,
        "src_port":     0.0,
        "dst_port":     0.0,
        # Encode severity as protocol field — lower sev = more critical
        "protocol":     sev_num,
    }


register_extractor(SOURCE_NAME, extract)
