"""
DNS query log collector — extracts features from DNS query records.
Register with source="dns".

Expected raw fields:
  qname, qtype, response_code, answer_count,
  query_time_ms, src_ip, payload_size

Anomaly signals: high query rates, DGA-like domain names,
unusual qtypes (ANY, TXT used in tunnelling), large payload (DNS exfil).
"""
from features.pipeline import register_extractor
import math

SOURCE_NAME = "dns"

QTYPE_MAP = {"A": 1, "AAAA": 28, "MX": 15, "TXT": 16, "ANY": 255, "NS": 2, "CNAME": 5}
RCODE_MAP  = {"NOERROR": 0, "NXDOMAIN": 3, "SERVFAIL": 2, "REFUSED": 5}


def _domain_entropy(name: str) -> float:
    """Shannon entropy of domain label — high entropy suggests DGA."""
    if not name:
        return 0.0
    label = name.split(".")[0]
    freq = {}
    for c in label:
        freq[c] = freq.get(c, 0) + 1
    ent = 0.0
    for f in freq.values():
        p = f / len(label)
        ent -= p * math.log2(p)
    return round(ent, 4)


def extract(raw: dict) -> dict:
    qname    = str(raw.get("qname", ""))
    qtype    = str(raw.get("qtype", "A")).upper()
    rcode    = str(raw.get("response_code", "NOERROR")).upper()
    payload  = float(raw.get("payload_size", 60))
    qt_ms    = float(raw.get("query_time_ms", 1))
    answers  = float(raw.get("answer_count", 1))

    return {
        "bytes_in":     payload,
        "bytes_out":    payload * answers,
        "packet_count": 1.0,
        "duration_ms":  max(qt_ms, 1),
        "src_port":     float(raw.get("src_port", 0)),
        "dst_port":     53.0,
        # Encode qtype numerically — ANY/TXT used in tunnelling score higher
        "protocol":     float(QTYPE_MAP.get(qtype, 0)),
    }


register_extractor(SOURCE_NAME, extract)
