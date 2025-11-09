#!/bin/bash

# Script de inicio rápido para Mac/Linux
# Kiosco Educativo - Iniciar servidor y abrir navegador

echo "========================================"
echo "  KIOSCO EDUCATIVO - INICIANDO"
echo "========================================"
echo ""

# Obtener el directorio del script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Verificar que Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no está instalado"
    echo "   Por favor, instala Node.js desde https://nodejs.org/"
    exit 1
fi

# Verificar que npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm no está instalado"
    echo "   npm viene con Node.js, verifica tu instalación"
    exit 1
fi

echo "✅ Node.js y npm encontrados"
echo ""

# Cambiar al directorio backend
cd backend

# Verificar que las dependencias están instaladas
if [ ! -d "node_modules" ]; then
    echo "⚠️  Dependencias no instaladas. Instalando..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error al instalar dependencias"
        exit 1
    fi
    echo "✅ Dependencias instaladas"
    echo ""
fi

# Verificar que el archivo .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Archivo .env no encontrado"
    echo "   Por favor, crea el archivo .env en backend/ con tus credenciales"
    echo "   Ver README.md para más información"
    exit 1
fi

echo "✅ Configuración encontrada"
echo ""

# Iniciar servidor en nueva terminal (Mac/Linux)
echo "Iniciando servidor backend..."
echo ""

# Detectar el sistema operativo
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e "tell application \"Terminal\" to do script \"cd '$SCRIPT_DIR/backend' && npm start\""
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    gnome-terminal -- bash -c "cd '$SCRIPT_DIR/backend' && npm start; exec bash" 2>/dev/null || \
    xterm -e "cd '$SCRIPT_DIR/backend' && npm start" 2>/dev/null || \
    x-terminal-emulator -e "cd '$SCRIPT_DIR/backend' && npm start" 2>/dev/null || \
    echo "⚠️  No se pudo abrir una nueva terminal. Ejecuta manualmente: cd backend && npm start"
fi

echo "Esperando 10 segundos para que el servidor inicie..."
sleep 10
echo ""

# Iniciar servidor frontend y abrir navegador
echo "Iniciando servidor frontend..."
FRONTEND_URL="http://localhost:8000"

if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e "tell application \"Terminal\" to do script \"cd '$SCRIPT_DIR/frontend' && python3 -m http.server 8000\""
    sleep 2
    open "$FRONTEND_URL"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    gnome-terminal -- bash -c "cd '$SCRIPT_DIR/frontend' && python3 -m http.server 8000; exec bash" 2>/dev/null || \
    xterm -e "cd '$SCRIPT_DIR/frontend' && python3 -m http.server 8000" 2>/dev/null || \
    x-terminal-emulator -e "bash -lc 'cd \"$SCRIPT_DIR/frontend\" && python3 -m http.server 8000'" 2>/dev/null || \
    echo "⚠️  No se pudo abrir una nueva terminal para el frontend. Ejecuta manualmente: cd frontend && python3 -m http.server 8000"
    xdg-open "$FRONTEND_URL" 2>/dev/null || sensible-browser "$FRONTEND_URL" 2>/dev/null || true
fi

echo ""
echo "========================================"
echo "  Servidor iniciado en nueva ventana"
echo "  Navegador abierto en http://localhost:8000"
echo "  Puedes cerrar esta ventana"
echo "========================================"
echo ""
echo "💡 IMPORTANTE:"
echo "   - El navegador se abrió en http://localhost:8000"
echo "   - NO abras index.html directamente (causa errores en Mac)"
echo ""
echo "💡 Si el servidor no inició, ejecuta manualmente:"
echo "   cd backend && npm start"
echo ""
echo "💡 Para acceder desde otro dispositivo:"
echo "   http://[TU_IP]:8080"
echo ""

