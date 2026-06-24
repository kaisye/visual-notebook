@echo off
REM ===== Quick-open Visual Notebook project =====
cd /d "%~dp0"

REM Mo project trong VS Code
where code >nul 2>nul
if %ERRORLEVEL%==0 (
    start "" code .
) else (
    echo [!] Khong tim thay 'code' trong PATH, bo qua buoc mo VS Code.
)

REM Cai dependencies neu chua co
if not exist "node_modules" (
    echo [*] Chua co node_modules, dang chay npm install...
    call npm install
)

REM Mo trinh duyet sau vai giay
start "" cmd /c "timeout /t 4 >nul & start http://localhost:3333"

REM Chay dev server (port 3333)
echo [*] Khoi dong dev server tai http://localhost:3333 ...
call npm run dev
