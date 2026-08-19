@echo off
setlocal

echo [VC-WEB-PH01] Installing locked dependencies...
call npm ci
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH01] Website source check...
call npm run web:ph01:source-check
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH01] Website TypeScript check...
call npm run typecheck:website
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH01] Website build...
call npm run build:website
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH01] Protected R11 source regression...
call npm run wp09:r11:source-check
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH01] Full monolith build...
call npm run build
if errorlevel 1 exit /b %errorlevel%

echo [PASS] VC-WEB-PH01-R01 acceptance commands completed successfully.
exit /b 0
