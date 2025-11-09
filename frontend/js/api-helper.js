/**
 * Helper para realizar solicitudes API
 * 
 * Este módulo proporciona funciones helper para realizar solicitudes API
 * usando la configuración centralizada, permitiendo que la aplicación
 * funcione en diferentes entornos (localhost, red local, producción).
 */

/**
 * Obtener la URL base del API
 * @returns {string} URL base del API
 */
function getApiUrl() {
    return (window.Config && window.Config.API_URL) || 'http://localhost:8080';
}

/**
 * Construir una URL completa del API
 * @param {string} path - Ruta del endpoint (ej: '/api/login' o 'api/login')
 * @returns {string} URL completa
 */
function apiUrl(path) {
    const baseUrl = getApiUrl();
    // Asegurar que path comience con /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
}

/**
 * Realizar una solicitud fetch autenticada
 * @param {string} path - Ruta del endpoint
 * @param {object} options - Opciones de fetch
 * @returns {Promise<Response>} Respuesta de fetch
 */
async function fetchApi(path, options = {}) {
    const token = window.getCurrentToken ? window.getCurrentToken() : null;
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return fetch(apiUrl(path), {
        ...options,
        headers
    });
}

// Exportar funciones
window.getApiUrl = getApiUrl;
window.apiUrl = apiUrl;
window.fetchApi = fetchApi;



