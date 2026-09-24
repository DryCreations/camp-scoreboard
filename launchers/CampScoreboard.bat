@echo off
rem Camp Scoreboard: double-click to install, update and run everything (Windows).
rem
rem The first run downloads the app into %USERPROFILE%\CampScoreboard, plus a
rem private copy of Node.js if this PC doesn't have one. Every run after that
rem pulls the latest code, starts OBS and starts the scoreboard. The real work
rem happens in scripts\launch.mjs inside the app folder.
rem
rem Tip: install this on the Desktop by pasting into PowerShell:
rem   iwr https://raw.githubusercontent.com/DryCreations/camp-scoreboard/main/launchers/CampScoreboard.bat -OutFile "$([Environment]::GetFolderPath('Desktop'))\CampScoreboard.bat"

setlocal EnableExtensions
title Camp Scoreboard
set "REPO_SLUG=DryCreations/camp-scoreboard"
if not defined CAMP_BRANCH set "CAMP_BRANCH=main"
if not defined CAMP_NODE_MAJOR set "CAMP_NODE_MAJOR=22"
if not defined CAMP_HOME set "CAMP_HOME=%USERPROFILE%\CampScoreboard"
set "CURL=%SystemRoot%\System32\curl.exe"
set "TAR=%SystemRoot%\System32\tar.exe"

rem When this file is inside a copy of the repo (launchers\), run that copy.
set "APP_DIR=%CAMP_HOME%\camp-scoreboard"
if exist "%~dp0..\scripts\launch.mjs" for %%I in ("%~dp0..") do set "APP_DIR=%%~fI"

rem ---- 1. Get the app (first run only) ----
if exist "%APP_DIR%\package.json" goto :find_node
echo First run: downloading Camp Scoreboard into %APP_DIR%
if not exist "%CAMP_HOME%" mkdir "%CAMP_HOME%"
where git >nul 2>nul
if errorlevel 1 goto :download_app
git clone --branch "%CAMP_BRANCH%" "https://github.com/%REPO_SLUG%.git" "%APP_DIR%"
if errorlevel 1 goto :fail_app
goto :find_node

:download_app
set "TMPD=%TEMP%\camp-scoreboard-%RANDOM%"
mkdir "%TMPD%"
"%CURL%" -fL --retry 3 -o "%TMPD%\src.tar.gz" "https://codeload.github.com/%REPO_SLUG%/tar.gz/refs/heads/%CAMP_BRANCH%"
if errorlevel 1 goto :fail_app
mkdir "%APP_DIR%"
"%TAR%" -xzf "%TMPD%\src.tar.gz" -C "%APP_DIR%" --strip-components=1
if errorlevel 1 goto :fail_app
rmdir /s /q "%TMPD%"

rem ---- 2. Find Node.js 20+, or download a private copy ----
:find_node
set "NODE_EXE=%CAMP_HOME%\node\node.exe"
call :node_ok && goto :run
set "NODE_EXE="
for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
if defined NODE_EXE call :node_ok && goto :run

echo Downloading Node.js %CAMP_NODE_MAJOR% (one time only)...
set "NODE_ARCH=x64"
if /i "%PROCESSOR_ARCHITECTURE%"=="ARM64" set "NODE_ARCH=arm64"
if /i "%PROCESSOR_ARCHITEW6432%"=="ARM64" set "NODE_ARCH=arm64"
set "NODE_BASE=https://nodejs.org/dist/latest-v%CAMP_NODE_MAJOR%.x"
set "TMPN=%TEMP%\camp-node-%RANDOM%"
mkdir "%TMPN%"
"%CURL%" -fsSL -o "%TMPN%\SHASUMS256.txt" "%NODE_BASE%/SHASUMS256.txt"
if errorlevel 1 goto :fail_node
set "NODE_ZIP="
set "NODE_SUM="
for /f "tokens=1,2" %%A in ('findstr /l /c:"-win-%NODE_ARCH%.zip" "%TMPN%\SHASUMS256.txt"') do (
	set "NODE_SUM=%%A"
	set "NODE_ZIP=%%B"
)
if not defined NODE_ZIP goto :fail_node
"%CURL%" -fL --retry 3 -o "%TMPN%\%NODE_ZIP%" "%NODE_BASE%/%NODE_ZIP%"
if errorlevel 1 goto :fail_node
set "GOT_SUM="
for /f "skip=1 delims=" %%H in ('certutil -hashfile "%TMPN%\%NODE_ZIP%" SHA256') do if not defined GOT_SUM set "GOT_SUM=%%H"
set "GOT_SUM=%GOT_SUM: =%"
if /i not "%GOT_SUM%"=="%NODE_SUM%" goto :fail_node
if exist "%CAMP_HOME%\node" rmdir /s /q "%CAMP_HOME%\node"
mkdir "%CAMP_HOME%\node"
"%TAR%" -xf "%TMPN%\%NODE_ZIP%" -C "%CAMP_HOME%\node" --strip-components=1
if errorlevel 1 goto :fail_node
rmdir /s /q "%TMPN%"
set "NODE_EXE=%CAMP_HOME%\node\node.exe"

rem ---- 3. Hand off to the shared launcher ----
:run
for %%I in ("%NODE_EXE%") do set "PATH=%%~dpI;%PATH%"
cd /d "%APP_DIR%"
rem Copies installed before the launcher existed need one pull to get it.
if not exist "scripts\launch.mjs" if exist ".git" git pull --ff-only
if not exist "scripts\launch.mjs" (
	echo ERROR: %APP_DIR% is missing scripts\launch.mjs. Delete that folder and run this again.
	pause
	exit /b 1
)
"%NODE_EXE%" scripts\launch.mjs %*
if errorlevel 1 (
	echo.
	echo Something went wrong - see the messages above.
	pause
)
exit /b

:node_ok
if not exist "%NODE_EXE%" exit /b 1
"%NODE_EXE%" -e "process.exit(+process.versions.node.split('.')[0]>=20?0:1)" >nul 2>nul
exit /b

:fail_app
echo.
echo ERROR: Could not download the app. Check the internet connection and try again.
pause
exit /b 1

:fail_node
echo.
echo ERROR: Could not download Node.js. Check the internet connection and try again,
echo or install Node.js 20+ from https://nodejs.org
pause
exit /b 1
