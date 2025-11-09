@echo off
echo ========================================
echo   KIOSCO EDUCATIVO - INICIANDO
echo ========================================
echo.
echo Iniciando servidor backend en nueva ventana...
start cmd /k "cd /d %~dp0backend && npm start"
echo.
echo Esperando 10 segundos para que el servidor inicie...
timeout /t 10
echo.
echo Abriendo navegador...
start "" "%~dp0frontend/index.html"
echo.
echo ========================================
echo   Servidor iniciado en nueva ventana
echo   Navegador abierto
echo   Puedes cerrar esta ventana
echo ========================================
timeout /t 3 >nul
