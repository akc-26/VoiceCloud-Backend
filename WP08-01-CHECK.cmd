@echo off
setlocal
cd /d "%~dp0"
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\wp08\wp08-01-check.ps1"
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo ============================================================
  echo WP08-01 CHECK FAILED - exit code %EXIT_CODE%
  echo ============================================================
  exit /b %EXIT_CODE%
)
echo.
echo WP08-01 verification completed successfully.
exit /b 0
