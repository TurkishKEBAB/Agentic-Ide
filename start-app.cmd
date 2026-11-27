@echo off
rem Windows launcher for Agentic IDE: double-click it, or run "start-app.cmd -Dev" for hot reload.
rem All work happens in scripts\start-app.ps1; arguments are passed through.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-app.ps1" %*
if errorlevel 1 (
  echo.
  echo Agentic IDE could not start. See the messages above.
  pause
  exit /b 1
)
