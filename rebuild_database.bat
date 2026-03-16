@echo off
setlocal

set "ROOT=%~dp0"

call :resolve_python
if errorlevel 1 exit /b 1

echo.
echo Rebuilding backend\virtual_tutor.db from:
echo - Book1.xlsx
echo - modules_cleaned.csv
echo.

pushd "%ROOT%backend" >nul
%PYTHON_CMD% -c "import sqlalchemy, openpyxl, fastapi" >nul 2>nul
if errorlevel 1 (
    popd >nul
    echo Required backend packages are missing.
    echo Run first_time_setup.bat once, or install dependencies with:
    echo   cd backend ^&^& pip install -r requirements.txt
    exit /b 1
)

%PYTHON_CMD% seed.py
set "EXIT_CODE=%ERRORLEVEL%"
popd >nul

if not "%EXIT_CODE%"=="0" (
    echo.
    echo Database rebuild failed.
    exit /b %EXIT_CODE%
)

echo.
echo Database rebuild complete.
exit /b 0

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
