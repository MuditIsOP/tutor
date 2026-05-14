@echo off
setlocal

set "ROOT=%~dp0"

cd /d "%ROOT%"

echo Starting backend on http://127.0.0.1:8002 ...
start "Virtual Tutor Backend" /B cmd /c "pushd ""%ROOT%backend"" && py -3.11 -m uvicorn main:app --app-dir . --reload --host 127.0.0.1 --port 8002"

echo Starting frontend on http://127.0.0.1:5174 ...
pushd "%ROOT%frontend"
call npm run dev -- --host 127.0.0.1 --port 5174
set "EXIT_CODE=%ERRORLEVEL%"
popd

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Frontend process exited with an error.
  pause
)

exit /b %EXIT_CODE%
