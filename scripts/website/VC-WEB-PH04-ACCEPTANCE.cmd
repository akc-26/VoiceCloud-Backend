@echo off
setlocal

echo [VC-WEB-PH04] Installing locked dependencies...
call npm ci
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH04] PH01 protected foundation check...
call npm run web:ph01:source-check
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH04] PH02 protected authentication check...
call npm run web:ph02:source-check
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH04] PH03 protected discovery/profile/social check...
call npm run web:ph03:source-check
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH04] Communities/events/messaging/notifications source check...
call npm run web:ph04:source-check
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH04] Website TypeScript check...
call npm run typecheck:website
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH04] Website build...
call npm run build:website
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH04] Protected R11 source regression...
call npm run wp09:r11:source-check
if errorlevel 1 exit /b %errorlevel%

echo [VC-WEB-PH04] Full monolith build...
call npm run build
if errorlevel 1 exit /b %errorlevel%

echo [PASS] VC-WEB-PH04-R03 acceptance commands completed successfully.
exit /b 0
