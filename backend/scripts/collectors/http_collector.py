"""
HTTP access log collector — parses HTTP access log dicts into features.
Register with source="http".

Expected raw fields (standard combined log format fields):
  method, status_code, bytes_sent, bytes_received,
  response_time_ms, src_ip, uri, user_agent

Anomaly signals: scanner-like URIs, 4xx/5xx spikes,
unusually large payloads, very fast request rates.
"""
from features.pipeline import register_extractor

SOURCE_NAME = "http"

METHOD_MAP = {"GET": 1, "POST": 2, "PUT": 3, "DELETE": 4,
              "HEAD": 5, "OPTIONS": 6, "PATCH": 7}


def extract(raw: dict) -> dict:
    status  = int(raw.get("status_code", 200))
    sent    = float(raw.get("bytes_sent", 0))
    recv    = float(raw.get("bytes_received", 0))
    rt_ms   = max(float(raw.get("response_time_ms", 1)), 1)
    method  = str(raw.get("method", "GET")).upper()

    # Encode status class as dst_port proxy (4xx→400, 5xx→500)
    status_class = float((status // 100) * 100)

    return {
        "bytes_in":     recv,
        "bytes_out":    sent,
        "packet_count": 1.0,
        "duration_ms":  rt_ms,
        "src_port":     float(raw.get("src_port", 0)),
        "dst_port":     status_class,
        "protocol":     float(METHOD_MAP.get(method, 0)),
    }


register_extractor(SOURCE_NAME, extract)
