@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Signal Dashboard

REM ===== Port Configuration =====
REM Default port. Override: start.bat 9000
if "%1" NEQ "" (set PORT=%1) else (if "!PORT!"=="" set PORT=8443)

echo.
echo  Signal Dashboard
echo  ================
echo.

REM Auto-detect available port
for %%P in (!PORT! 8443 9443 8080 9000 5000 3000 4000 4443) do (
    netstat -an 2>nul | findstr ":%%P " | findstr "LISTENING" >nul 2>nul
    if !ERRORLEVEL! NEQ 0 (
        set PORT=%%P
        goto :start
    )
)
echo  ERROR: No available port found.
pause
exit /b 1

:start
echo  URL: http://localhost:!PORT!
echo  Press Ctrl+C to stop.
echo.

start "" "http://localhost:!PORT!"

where python >nul 2>nul
if !ERRORLEVEL!==0 (
    python -m http.server !PORT!
) else (
    where py >nul 2>nul
    if !ERRORLEVEL!==0 (
        py -m http.server !PORT!
    ) else (
        echo.
        echo  ERROR: Python not found.
        echo  Install Python 3: https://www.python.org/downloads/
        pause
    )
)
