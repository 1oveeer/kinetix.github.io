@echo off
chcp 65001 > nul
echo ===================================================
echo   Запуск предпросмотра сайта NIGHTSHIFT CLIENT
echo ===================================================
echo.
python run_preview.py
if %ERRORLEVEL% NEQ 0 (
    echo [!] Python не найден, открываем файл index.html напрямую в браузере...
    start index.html
)
pause
