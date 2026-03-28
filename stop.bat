@echo off
title NetWatch — Shutting Down
color 0C

echo.
echo  Shutting down NetWatch...
echo.

:: Stop frontend window
taskkill /fi "WindowTitle eq NetWatch Frontend" /f >nul 2>&1

:: Stop Docker services
docker compose -f "%~dp0docker-compose.yml" down

echo.
echo  NetWatch stopped. Goodbye!
echo.
pause
