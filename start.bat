@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Signal Dashboard

REM ===== Python Path Configuration =====
REM Modify PYTHON_PATH if your Python is elsewhere
set PYTHON_PATH=
if exist "C:\Users\johntcho\Antigravity\.agent\skills\Toolset\python\python.exe" (
    set PYTHON_PATH=C:\Users\johntcho\Antigravity\.agent\skills\Toolset\python\python.exe
)
if "!PYTHON_PATH!"=="" (
    where python >nul 2>nul
    if !ERRORLEVEL!==0 (set PYTHON_PATH=python) else (
        where py >nul 2>nul
        if !ERRORLEVEL!==0 (set PYTHON_PATH=py)
    )
)
if "!PYTHON_PATH!"=="" (
    echo.
    echo  ERROR: Python not found.
    echo  Edit start.bat and set PYTHON_PATH to your python.exe location.
    echo  Or install Python 3: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM ===== Port Configuration =====
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
echo  Python: !PYTHON_PATH!
echo  URL:    http://localhost:!PORT!
echo  Press Ctrl+C to stop.
echo.

start "" "http://localhost:!PORT!"
"!PYTHON_PATH!" -m http.server !PORT!
