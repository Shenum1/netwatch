@echo off
title NetWatch — Starting Up
color 0A

echo.
echo  ███╗   ██╗███████╗████████╗██╗    ██╗ █████╗ ████████╗ ██████╗██╗  ██╗
echo  ████╗  ██║██╔════╝╚══██╔══╝██║    ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║
echo  ██╔██╗ ██║█████╗     ██║   ██║ █╗ ██║███████║   ██║   ██║     ███████║
echo  ██║╚██╗██║██╔══╝     ██║   ██║███╗██║██╔══██║   ██║   ██║     ██╔══██║
echo  ██║ ╚████║███████╗   ██║   ╚███╔███╔╝██║  ██║   ██║   ╚██████╗██║  ██║
echo  ╚═╝  ╚═══╝╚══════╝   ╚═╝    ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝
echo.
echo  Network Anomaly Detector
echo  ─────────────────────────────────────────────────────────
echo.

:: ── Step 1: Check Docker is running ─────────────────────────────────────────
echo  [1/4] Checking Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Docker Desktop is not running.
    echo  Please open Docker Desktop, wait for the whale icon in your taskbar,
    echo  then run this script again.
    echo.
    pause
    exit /b 1
)
echo  Docker is running.
echo.

:: ── Step 2: Start backend services ──────────────────────────────────────────
echo  [2/4] Starting backend services (Postgres, Redis, ML core, API)...
docker compose -f "%~dp0docker-compose.yml" up -d
if %errorlevel% neq 0 (
    echo  ERROR: Failed to start Docker services.
    pause
    exit /b 1
)
echo  Backend services started.
echo.

:: ── Step 3: Wait for ML core to be ready then train ─────────────────────────
echo  [3/4] Waiting for ML core to be ready...
timeout /t 8 /nobreak >nul

echo  Training the anomaly detection model (takes ~60 seconds)...
docker compose -f "%~dp0docker-compose.yml" exec ml_core python train.py --synthetic --n-samples 50000 --report
echo  Model trained.
echo.

:: ── Step 4: Start frontend in a new window ───────────────────────────────────
echo  [4/4] Starting frontend...
start "NetWatch Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: ── Wait for Vite to start ───────────────────────────────────────────────────
timeout /t 5 /nobreak >nul

:: ── Open browser ─────────────────────────────────────────────────────────────
echo.
echo  ─────────────────────────────────────────────────────────
echo  NetWatch is ready!
echo  Opening dashboard at http://localhost:3001
echo  ─────────────────────────────────────────────────────────
echo.
start http://localhost:3001

:: ── Send 3 test anomaly events ───────────────────────────────────────────────
echo  Injecting test anomaly events...
timeout /t 3 /nobreak >nul

curl -s -X POST http://localhost:4000/api/events/ingest -H "Content-Type: application/json" -d "{\"raw\": {\"src_ip\": \"185.220.101.45\", \"bytes_in\": 200, \"bytes_out\": 80000000, \"packet_count\": 50000, \"duration_ms\": 1000, \"src_port\": 12345, \"dst_port\": 22, \"protocol\": \"tcp\"}, \"source\": \"pcap\"}" >nul 2>&1

curl -s -X POST http://localhost:4000/api/events/ingest -H "Content-Type: application/json" -d "{\"raw\": {\"src_ip\": \"103.21.244.0\", \"bytes_in\": 64, \"bytes_out\": 64, \"packet_count\": 2, \"duration_ms\": 10, \"src_port\": 44444, \"dst_port\": 8080, \"protocol\": \"tcp\"}, \"source\": \"pcap\"}" >nul 2>&1

curl -s -X POST http://localhost:4000/api/events/ingest -H "Content-Type: application/json" -d "{\"raw\": {\"src_ip\": \"198.51.100.22\", \"bytes_in\": 500, \"bytes_out\": 500, \"packet_count\": 5, \"duration_ms\": 30000, \"src_port\": 55123, \"dst_port\": 4444, \"protocol\": \"tcp\"}, \"source\": \"pcap\"}" >nul 2>&1

echo  Test events sent.
echo.
echo  ─────────────────────────────────────────────────────────
echo  To inject more anomalies during your presentation, run:
echo  inject_anomaly.bat
echo  ─────────────────────────────────────────────────────────
echo.
echo  To shut down NetWatch, run: stop.bat
echo.
pause
