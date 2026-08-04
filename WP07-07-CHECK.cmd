@echo off
setlocal

cd /d "%~dp0"

echo ============================================================
echo VoiceCloud WP07 Package 07 - Automated Acceptance Checks
echo ============================================================

echo.
echo [1/7] Installing locked dependencies...
call npm ci
if errorlevel 1 goto :failed

echo.
echo [2/7] Normalizing modified source with locked Prettier...
call npx prettier --write "src/**/*.ts" "admin/src/pages/LoginPage.tsx" "admin/src/services/auth.service.ts" "admin/src/store/auth.store.ts" "creator/src/pages/LoginPage.tsx" "creator/src/store/auth.store.ts"
if errorlevel 1 goto :failed

echo.
echo [3/7] Verifying Prettier formatting...
call npx prettier --check "src/**/*.ts" "admin/src/pages/LoginPage.tsx" "admin/src/services/auth.service.ts" "admin/src/store/auth.store.ts" "creator/src/pages/LoginPage.tsx" "creator/src/store/auth.store.ts"
if errorlevel 1 goto :failed

echo.
echo [4/7] Running ESLint...
call npx eslint "src/**/*.ts" --no-cache
if errorlevel 1 goto :failed

echo.
echo [5/7] Running focused authorization and authentication regressions...
call npx jest --runInBand --runTestsByPath "%CD%\src\modules\hosts\hosts.security.spec.ts" "%CD%\src\modules\auth\authentication-security.spec.ts"
if errorlevel 1 goto :failed

echo.
echo [6/7] Building backend, Landing, Admin and Creator portals...
call npm run build
if errorlevel 1 goto :failed

echo.
echo [7/7] Running all Jest tests...
call npm test -- --runInBand
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo ALL AUTOMATED CHECKS PASSED
echo ============================================================
echo Next command: npm run start:dev
echo.
echo Development-only local acceptance accounts:
echo   Admin:   admin@voicecloud.com / AdminPass123!
echo   Creator: creator@voicecloud.com / CreatorPass123!
echo.
echo Then verify:
echo   Landing: http://localhost:3000/
echo   Admin:   http://localhost:3000/admin
echo   Creator: http://localhost:3000/creator
echo.
echo Confirm random Creator text and unknown credentials are rejected.
echo Confirm Admin System Settings, Auth and Identity, and Hosts load without 403.
echo.
echo NOTE: npm deprecation, funding, audit and allow-scripts messages are
echo informational unless one of the seven commands returns a non-zero exit code.
exit /b 0

:failed
set "WP07_EXIT=%ERRORLEVEL%"
echo.
echo ============================================================
echo CHECK FAILED - exit code %WP07_EXIT%
echo ============================================================
exit /b %WP07_EXIT%
