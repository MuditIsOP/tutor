@echo off
setlocal

set "ROOT=%~dp0"
set "NO_START=0"

if /I "%~1"=="--no-start" set "NO_START=1"

call :resolve_python
if errorlevel 1 exit /b 1

call :resolve_npm
if errorlevel 1 exit /b 1

echo.
echo [1/4] Preparing backend environment file...
if not exist "%ROOT%backend\.env" (
    if exist "%ROOT%backend\.env.example" (
        copy /Y "%ROOT%backend\.env.example" "%ROOT%backend\.env" >nul
        echo Created backend\.env from backend\.env.example
        echo Please review backend\.env and add a valid AI API key before using AI features.
    ) else (
        echo backend\.env.example was not found.
        exit /b 1
    )
) else (
    echo backend\.env already exists.
)

echo.
echo [2/4] Installing backend dependencies...
pushd "%ROOT%backend" >nul
%PYTHON_CMD% -m pip install -r requirements.txt
if errorlevel 1 (
    popd >nul
    echo Backend dependency install failed.
    exit /b 1
)
popd >nul

echo.
echo [3/4] Installing frontend dependencies...
pushd "%ROOT%frontend" >nul
call %NPM_CMD% install
if errorlevel 1 (
    popd >nul
    echo Frontend dependency install failed.
    exit /b 1
)
popd >nul

echo.
echo [4/4] First-time setup complete.
if "%NO_START%"=="1" (
    echo Launch skipped because --no-start was provided.
    exit /b 0
)

call "%ROOT%start_project.bat"
exit /b %errorlevel%

:resolve_python
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
