@echo off
setlocal EnableExtensions

set "REPO_ROOT=%~dp0\..\.."
pushd "%REPO_ROOT%" >nul 2>&1
if errorlevel 1 (
  echo [FAIL] Could not enter repository root: %REPO_ROOT%
  exit /b 1
)

echo [VC-WEB-PH06-R02] Installing locked dependencies...
call npm ci
if errorlevel 1 goto :dependency_failed

echo [VC-WEB-PH06-R02] Running direct cross-platform comprehensive acceptance...
node scripts\website\web-ph06-comprehensive-acceptance.mjs
set "ACCEPTANCE_RC=%ERRORLEVEL%"
popd
exit /b %ACCEPTANCE_RC%

:dependency_failed
echo [FAIL] Dependency installation failed. Post-install gates cannot run reliably.
popd
exit /b 1
