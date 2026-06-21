@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   PantryPilot launcher
echo ============================================
echo.
echo Building (first run / after code changes)...
call npm run build
if errorlevel 1 (
  echo.
  echo Build failed. See the messages above.
  pause
  exit /b 1
)

REM Find this PC's Wi-Fi/LAN IPv4 address (the one with a default gateway).
set "LANIP="
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-NetIPConfiguration ^| Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } ^| Select-Object -First 1 -ExpandProperty IPv4Address).IPAddress"') do set "LANIP=%%i"

echo.
echo Starting servers in two new windows...
start "PantryPilot API" /d "%~dp0" cmd /k "node apps\api\dist\index.js"
start "PantryPilot Web" /d "%~dp0apps\web" cmd /k "npx next start -p 3000 -H 0.0.0.0"

echo.
echo PantryPilot is running.
echo   On this PC:                 http://localhost:3000
if defined LANIP echo   On your phone (same Wi-Fi):  http://%LANIP%:3000
echo.
echo To stop PantryPilot, close the two "PantryPilot API" and
echo "PantryPilot Web" windows that just opened.
echo.
pause
endlocal
