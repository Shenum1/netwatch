@echo off
title NetWatch — Injecting Anomalies
color 0E

echo.
echo  Injecting anomaly events into NetWatch...
echo.

:: Data exfiltration
echo  [1] Data exfiltration attempt from 185.220.101.45...
curl -s -X POST http://localhost:4000/api/events/ingest -H "Content-Type: application/json" -d "{\"raw\": {\"src_ip\": \"185.220.101.45\", \"bytes_in\": 200, \"bytes_out\": 80000000, \"packet_count\": 50000, \"duration_ms\": 1000, \"src_port\": 12345, \"dst_port\": 22, \"protocol\": \"tcp\"}, \"source\": \"pcap\"}" >nul 2>&1

:: Port scan
echo  [2] Port scan from 103.21.244.0...
curl -s -X POST http://localhost:4000/api/events/ingest -H "Content-Type: application/json" -d "{\"raw\": {\"src_ip\": \"103.21.244.0\", \"bytes_in\": 64, \"bytes_out\": 64, \"packet_count\": 2, \"duration_ms\": 10, \"src_port\": 44444, \"dst_port\": 8080, \"protocol\": \"tcp\"}, \"source\": \"pcap\"}" >nul 2>&1

:: C2 beacon
echo  [3] C2 beacon from 198.51.100.22...
curl -s -X POST http://localhost:4000/api/events/ingest -H "Content-Type: application/json" -d "{\"raw\": {\"src_ip\": \"198.51.100.22\", \"bytes_in\": 500, \"bytes_out\": 500, \"packet_count\": 5, \"duration_ms\": 30000, \"src_port\": 55123, \"dst_port\": 4444, \"protocol\": \"tcp\"}, \"source\": \"pcap\"}" >nul 2>&1

:: DDoS burst
echo  [4] DDoS burst from 45.33.32.156...
curl -s -X POST http://localhost:4000/api/events/ingest -H "Content-Type: application/json" -d "{\"raw\": {\"src_ip\": \"45.33.32.156\", \"bytes_in\": 1400, \"bytes_out\": 0, \"packet_count\": 900000, \"duration_ms\": 2000, \"src_port\": 53, \"dst_port\": 80, \"protocol\": \"udp\"}, \"source\": \"pcap\"}" >nul 2>&1

:: Brute force
echo  [5] SSH brute force from 91.108.4.0...
curl -s -X POST http://localhost:4000/api/events/ingest -H "Content-Type: application/json" -d "{\"raw\": {\"src_ip\": \"91.108.4.0\", \"bytes_in\": 400, \"bytes_out\": 400, \"packet_count\": 8, \"duration_ms\": 1500, \"src_port\": 61234, \"dst_port\": 22, \"protocol\": \"tcp\"}, \"source\": \"pcap\"}" >nul 2>&1

:: Normal traffic
echo  [6] Normal web traffic from 8.8.8.8...
curl -s -X POST http://localhost:4000/api/events/ingest -H "Content-Type: application/json" -d "{\"raw\": {\"src_ip\": \"8.8.8.8\", \"bytes_in\": 15000, \"bytes_out\": 3000, \"packet_count\": 25, \"duration_ms\": 120, \"src_port\": 52341, \"dst_port\": 443, \"protocol\": \"tcp\"}, \"source\": \"pcap\"}" >nul 2>&1

echo.
echo  Done! Check your dashboard at http://localhost:3001
echo.
pause
