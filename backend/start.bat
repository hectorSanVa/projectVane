@echo off
echo ========================================
echo  Iniciando Kiosco Educativo Backend
echo ========================================
echo.

if not exist node_modules (
    echo ERROR: No se encontraron las dependencias
    echo Por favor, ejecuta setup.bat primero
    pause
    exit /b 1
)

if not exist .env (
    echo ERROR: No se encontro el archivo .env
    echo Por favor, crea el archivo .env con las configuraciones necesarias
    pause
    exit /b 1
)

echo Iniciando servidor...
echo.
call npm start

