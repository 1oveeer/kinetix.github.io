@echo off
chcp 65001 > nul
echo ===================================================
echo   Запуск сайта и REST API KINETIX CLIENT
echo ===================================================
echo.
python server.py --open
if %ERRORLEVEL% NEQ 0 (
    echo [!] Ошибка запуска server.py, открываем index.html напрямую...
    start index.html
)
pause
