@echo off
setlocal DisableDelayedExpansion
title Magic-Game
cd /d "%~dp0"
if errorlevel 1 goto directory_error
if not exist "package.json" goto project_error

where node.exe >nul 2>&1
if errorlevel 1 goto node_error
where npm.cmd >nul 2>&1
if errorlevel 1 goto npm_error
node.exe -e "const v=process.versions.node.split('.').map(Number);process.exit(v[0]>22||(v[0]===22&&v[1]>=12)||(v[0]===20&&v[1]>=19)?0:1)"
if errorlevel 1 goto version_error

if exist "node_modules\vite\package.json" goto run_game
echo [1/2] Installing dependencies from package-lock.json...
call npm.cmd ci
if errorlevel 1 goto install_error

:run_game
echo [2/2] Starting Magic-Game. Your browser will open when Vite is ready.
echo Keep this window open while playing. Press Ctrl+C to stop the server.
call npm.cmd run dev -- --host 127.0.0.1 --open
if errorlevel 1 goto server_error
exit /b 0

:directory_error
echo [ERROR] Cannot open the game directory.
goto failed

:project_error
echo [ERROR] package.json is missing. Extract the entire ZIP before running START.bat.
goto failed

:node_error
echo [ERROR] Node.js was not found. Install Node.js LTS from https://nodejs.org/
echo Close this window and run START.bat again after installation.
goto failed

:npm_error
echo [ERROR] npm.cmd was not found. Repair the Node.js LTS installation.
goto failed

:version_error
echo [ERROR] This Node.js version cannot run Vite 7:
node.exe --version
echo Install the current Node.js LTS from https://nodejs.org/
goto failed

:install_error
echo [ERROR] Dependency installation failed. See the npm error above.
goto failed

:server_error
echo [ERROR] The game server stopped with an error. See the message above.
goto failed

:failed
pause
exit /b 1
