@echo off
setlocal
set APP_DIR=%~dp0gurukid.exe\GuruKid-win32-x64
set APP_EXE=%APP_DIR%\GuruKid.exe

if exist "%APP_EXE%" (
  start "GuruKid" "%APP_EXE%"
  exit /b 0
)

echo GuruKid runtime was not found.
echo Expected: %APP_EXE%
echo.
echo Rebuild package with:
echo   npm run package:win:portable
pause
exit /b 1
