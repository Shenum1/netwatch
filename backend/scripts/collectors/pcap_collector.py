"""
Example collector: pcap / live packet capture.
Registers a custom feature extractor for source="pcap".

─────────────────────────────────────────────────────────
HOW TO ADD A NEW DATA SOURCE
─────────────────────────────────────────────────────────
1. Copy this file and rename it (e.g. netflow_collector.py)
2. Change SOURCE_NAME to your source identifier
3. Implement extract(raw: dict) -> dict[str, float]
   — return a flat dict of numeric feature values
4. Call register_extractor(SOURCE_NAME, extract) at module load
5. POST /api/scripts/reload  ← hot-loads with no restart
─────────────────────────────────────────────────────────
"""
from features.pipeline import register_extractor

SOURCE_NAME = "pcap"


def extract(raw: dict) -> dict[str, float]:
    length = float(raw.get("length", 0))
    return {
        "bytes_in":        length,
        "bytes_out":       0.0,
        "packet_count":    1.0,
        "duration_ms":     0.0,
        "src_port":        float(raw.get("sport", 0)),
        "dst_port":        float(raw.get("dport", 0)),
        "protocol":        float(raw.get("proto", 6)),
        "byte_rate":       0.0,
        "packet_size_avg": length,
        "ratio_out_in":    0.0,
    }


register_extractor(SOURCE_NAME, extract)
