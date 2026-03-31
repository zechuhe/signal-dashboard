@echo off
chcp 65001 >/dev/null
echo Signal Dashboard - Starting...
echo.

REM Try port 8443 first, fallback to 443, then 8080
set PORT=8443

echo Starting HTTP server on port %PORT%...
echo Open browser: http://localhost:%PORT%
echo Press Ctrl+C to stop.
echo.

start "" "http://localhost:%PORT%"
python -m http.server %PORT%

if %ERRORLEVEL% NEQ 0 (
    echo Python not found. Trying py...
    py -m http.server %PORT%
)
