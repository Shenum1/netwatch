"""
NetFlow v9 collector — feature extractor for NetFlow records.
Register with source="netflow".

Expected raw fields from your NetFlow parser:
  in_bytes, out_bytes, in_pkts, first, last,
  protocol, l4_src_port, l4_dst_port, ipv4_src_addr
"""
from features.pipeline import register_extractor
import numpy as np

SOURCE_NAME = "netflow"


def extract(raw: dict) -> dict:
    in_b   = float(raw.get("in_bytes", 0))
    out_b  = float(raw.get("out_bytes", 0))
    pkts   = max(float(raw.get("in_pkts", 1)), 1)
    first  = float(raw.get("first", 0))
    last   = float(raw.get("last", 1))
    dur    = max(last - first, 1)
    proto  = float(raw.get("protocol", 6))

    return {
        "bytes_in":     in_b,
        "bytes_out":    out_b,
        "packet_count": pkts,
        "duration_ms":  dur,
        "src_port":     float(raw.get("l4_src_port", 0)),
        "dst_port":     float(raw.get("l4_dst_port", 0)),
        "protocol":     proto,
    }


register_extractor(SOURCE_NAME, extract)
