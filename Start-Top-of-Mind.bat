@echo off
rem Top of Mind - double-click to install (first run) and start.
rem Then use the app at http://localhost:8000
title Top of Mind
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Python is not installed. Get it from https://www.python.org/downloads/
  echo  During install, tick "Add python.exe to PATH". Then run this again.
  echo.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed. Get the LTS version from https://nodejs.org/
  echo  Then run this again.
  echo.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo [1/4] Creating Python environment...
  python -m venv .venv || goto :fail
)
echo [2/4] Installing hub packages...
".venv\Scripts\python.exe" -m pip install -q --disable-pip-version-check -r hub\requirements.txt || goto :fail

if not exist "hub\.env" (
  copy /y "hub\.env.example" "hub\.env" >nul
  echo.
  echo  Created hub\.env - open it in Notepad and paste in your API keys.
  echo  The Echo lane works without any key, so you can try it right away.
  echo.
)

echo [3/4] Building the app...
pushd frontend\top-of-mind
if not exist "node_modules" (
  call npm install --no-audit --no-fund || (popd & goto :fail)
)
call npm run build || (popd & goto :fail)
popd

echo [4/4] Starting Top of Mind at http://localhost:8000  (close this window to stop)
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:8000"
".venv\Scripts\python.exe" -m uvicorn hub.app:app --host 127.0.0.1 --port 8000
goto :eof

:fail
echo.
echo  Something went wrong above. Copy the red text and send it to Claude.
pause
exit /b 1
