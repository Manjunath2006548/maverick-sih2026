@echo off
echo ============================================
echo   ISRO Burn-In Anomaly Detection System
echo   SIH 2026 - Smart Automation
echo ============================================
echo.

echo [1/3] Starting Python Backend (FastAPI)...
echo.

cd /d "%~dp0backend"

:: Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Please install Python 3.8+
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Install dependencies
echo Installing Python dependencies...
pip install -r requirements.txt -q
echo.

:: Start backend in background
echo Starting FastAPI backend on port 8001...
start "ISRO Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001"
echo Backend starting... waiting 5 seconds
timeout /t 5 /nobreak >nul

echo.
echo [2/3] Starting Next.js Frontend...
echo.

cd /d "%~dp0frontend"

:: Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js 18+
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

:: Install dependencies if needed
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
    echo.
)

:: Start frontend
echo Starting Next.js frontend on port 3000...
start "ISRO Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo.

echo ============================================
echo   System Starting...
echo ============================================
echo.
echo   Backend:  http://localhost:8001
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:8001/docs
echo.
echo   Demo Accounts (type these manually on login):
echo     admin@isro.gov.in / Admin@123!
echo     qa@isro.gov.in / Qa@123!
echo     engineer@isro.gov.in / Eng@123!
echo.
echo ============================================

timeout /t 3 /nobreak >nul
start http://localhost:3000

pause
