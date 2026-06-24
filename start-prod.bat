@echo off
REM ===== Chay Visual Notebook o che do PRODUCTION =====
cd /d "%~dp0"

REM Cai dependencies neu chua co
if not exist "node_modules" (
    echo [*] Chua co node_modules, dang chay npm install...
    call npm install
    if errorlevel 1 (
        echo [!] npm install that bai. Dung lai.
        pause
        exit /b 1
    )
)

REM Build ban production
echo [*] Dang build production...
call npm run build
if errorlevel 1 (
    echo [!] Build that bai. Dung lai.
    pause
    exit /b 1
)

REM Mo trinh duyet sau vai giay
start "" cmd /c "timeout /t 4 >nul & start http://localhost:3333"

REM Chay server production (port 3333)
echo [*] Khoi dong production server tai http://localhost:3333 ...
call npm run start
