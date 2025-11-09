/**
 * Configuración del cliente
 * 
 * Esta configuración permite adaptar la aplicación para funcionar en diferentes entornos:
 * - Desarrollo local (localhost)
 * - Red local (LAN)
 * - Producción (servidor público)
 * 
 * Para usar en red local o producción, modifica las variables API_URL y WS_URL
 */

const Config = {
    // URL del servidor API
    // Opciones:
    // - Desarrollo local: 'http://localhost:8080'
    // - Red local: 'http://192.168.1.100:8080' (reemplaza con la IP de tu servidor)
    // - Producción: 'https://tu-servidor.com' (requiere HTTPS)
    API_URL: window.API_URL || 'http://localhost:8080',
    
    // URL del servidor WebSocket
    // Se construye automáticamente a partir de API_URL, pero puedes especificarla manualmente
    // Opciones:
    // - Desarrollo local: 'ws://localhost:8080'
    // - Red local: 'ws://192.168.1.100:8080'
    // - Producción: 'wss://tu-servidor.com' (requiere HTTPS/WSS)
    WS_URL: window.WS_URL || (() => {
        const apiUrl = window.API_URL || 'http://localhost:8080';
        // Convertir http:// a ws:// y https:// a wss://
        return apiUrl.replace(/^http/, 'ws');
    })(),
    
    // Timeout para solicitudes (en milisegundos)
    TIMEOUT: 10000,
    
    // Configuración de reconexión WebSocket
    WS_RECONNECT_INTERVAL: 1000,
    WS_MAX_RECONNECT_ATTEMPTS: 5,
    
    // Configuración de sincronización
    SYNC_RETRIES: 5,
    SYNC_BASE_DELAY: 1000,
};

// Detectar automáticamente el entorno si es posible
(function() {
    // Si estamos en localhost, usar localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        Config.API_URL = 'http://localhost:8080';
        Config.WS_URL = 'ws://localhost:8080';
    }
    // Si estamos en la misma red, intentar detectar la IP del servidor
    else if (window.location.protocol === 'file:') {
        // Si se abre desde file://, usar localhost por defecto
        // El usuario deberá configurar manualmente la IP del servidor
        console.warn('Aplicación abierta desde archivo local. Usando localhost por defecto.');
        console.warn('Para usar en red local, configura API_URL y WS_URL en config.js');
    }
    // Si estamos en un servidor web, usar la misma URL
    else {
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const host = window.location.host;
        Config.API_URL = `${protocol}//${host}`;
        Config.WS_URL = `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}`;
    }
})();

// Función helper para obtener la URL del API
function getApiUrl() {
    return (window.Config && window.Config.API_URL) || 'http://localhost:8080';
}

// Función helper para construir URLs de API
function apiUrl(path) {
    const baseUrl = getApiUrl();
    // Asegurar que path comience con /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
}

// Exportar configuración y funciones helper
window.Config = Config;
window.getApiUrl = getApiUrl;
window.apiUrl = apiUrl;

// Log de configuración (solo en desarrollo)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Configuración cargada:', {
        API_URL: Config.API_URL,
        WS_URL: Config.WS_URL
    });
}

