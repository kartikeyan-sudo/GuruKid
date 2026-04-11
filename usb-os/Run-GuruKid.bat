@echo off
setlocal
set BASE=%~dp0
set APP_EXE_PACKAGER=%BASE%gurukid.exe\GuruKid-win32-x64\GuruKid.exe
set APP_EXE_BUILDER=%BASE%gurukid.exe\win-unpacked\GuruKid.exe

if exist "%APP_EXE_PACKAGER%" (
  start "GuruKid" "%APP_EXE_PACKAGER%"
  exit /b 0
)

if exist "%APP_EXE_BUILDER%" (
  start "GuruKid" "%APP_EXE_BUILDER%"
  exit /b 0
)

echo GuruKid packaged runtime was not found.
echo.
echo Checked:
echo   %APP_EXE_PACKAGER%
echo   %APP_EXE_BUILDER%
echo.
echo This USB launcher works only with packaged output.
echo Do not run npm dev mode from pendrive.
echo.
echo Build once on your dev PC:
echo   npm.cmd install
echo   npm.cmd run package:win:portable
pause
exit /b 1
