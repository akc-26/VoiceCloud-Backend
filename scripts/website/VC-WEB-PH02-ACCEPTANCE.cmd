@echo off
setlocal

echo [VC-WEB-PH02] Installing locked dependencies...
call npm ci
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH02] PH01 protected foundation check...
call npm run web:ph01:source-check
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH02] Authentication source check...
call npm run web:ph02:source-check
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH02] Website TypeScript check...
call npm run typecheck:website
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH02] Website build...
call npm run build:website
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH02] Protected R11 regression...
call npm run wp09:r11:source-check
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH02] Full monolith build...
call npm run build
if errorlevel 1 exit /b %errorlevel%

echo [PASS] VC-WEB-PH02-R05 acceptance commands completed successfully.
exit /b 0
