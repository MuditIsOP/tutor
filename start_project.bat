@echo off
setlocal

set "ROOT=%~dp0"
set "DRY_RUN=0"

if /I "%~1"=="--dry-run" set "DRY_RUN=1"

call :resolve_python
if errorlevel 1 exit /b 1

call :resolve_npm
if errorlevel 1 exit /b 1

call :ensure_backend_dependencies
if errorlevel 1 exit /b 1

if not exist "%ROOT%backend\.env" (
    echo backend\.env was not found.
    echo Run first_time_setup.bat first or create backend\.env manually.
    exit /b 1
)

call :is_port_listening 8002 BACKEND_RUNNING
call :is_port_listening 5174 FRONTEND_RUNNING

echo.
if "%DRY_RUN%"=="1" (
    echo Dry run mode:
    if "%BACKEND_RUNNING%"=="1" (
        echo - Backend already appears to be running on port 8002.
    ) else (
        echo - Would start backend with: %PYTHON_CMD% -m uvicorn main:app --app-dir . --host 127.0.0.1 --port 8002
    )
    if "%FRONTEND_RUNNING%"=="1" (
        echo - Frontend already appears to be running on port 5174.
    ) else (
        echo - Would start frontend with: %NPM_CMD% run dev -- --host 127.0.0.1 --port 5174
    )
    exit /b 0
)

if "%BACKEND_RUNNING%"=="1" (
    echo Backend already appears to be running on port 8002.
) else (
    echo Starting backend on port 8002...
    start "Virtual Tutor Backend" cmd /k "pushd ""%ROOT%backend"" && %PYTHON_CMD% -m uvicorn main:app --app-dir . --host 127.0.0.1 --port 8002"
)

if "%FRONTEND_RUNNING%"=="1" (
    echo Frontend already appears to be running on port 5174.
) else (
    echo Starting frontend on port 5174...
    start "Virtual Tutor Frontend" cmd /k "pushd ""%ROOT%frontend"" && call %NPM_CMD% run dev -- --host 127.0.0.1 --port 5174"
)

echo.
echo Project URLs:
echo - Frontend: http://localhost:5174
echo - Backend:  http://127.0.0.1:8002
echo - Docs:     http://127.0.0.1:8002/docs
exit /b 0

:resolve_python
py -3.11 --version >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_CMD=py -3.11"
    exit /b 0
)

py -3.10 --version >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_CMD=py -3.10"
    exit /b 0
)

where py >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_CMD=py -3"
    exit /b 0
)

where python >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_CMD=python"
    exit /b 0
)

echo Python was not found. Install Python 3 and try again.
exit /b 1

:resolve_npm
where npm >nul 2>nul
if not errorlevel 1 (
    set "NPM_CMD=npm"
    exit /b 0
)

echo npm was not found. Install Node.js and try again.
exit /b 1

:ensure_backend_dependencies
pushd "%ROOT%backend" >nul
%PYTHON_CMD% -c "import fastapi, uvicorn, sqlalchemy, email_validator, multipart, openpyxl, dotenv" >nul 2>nul
if errorlevel 1 (
    echo Backend dependencies missing. Installing from backend\requirements.txt...
    %PYTHON_CMD% -m pip install -r requirements.txt
    if errorlevel 1 (
        popd >nul
        echo Backend dependency install failed.
        exit /b 1
    )
)
popd >nul
exit /b 0

:is_port_listening
set "%~2=0"
for /f %%A in ('powershell -NoProfile -Command "(Get-NetTCPConnection -State Listen -LocalPort %~1 -ErrorAction SilentlyContinue | Measure-Object).Count"') do (
    if not "%%A"=="0" set "%~2=1"
)
exit /b 0
