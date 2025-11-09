/**
 * Manejo automático de renovación de tokens
 * 
 * Este módulo intercepta las respuestas 401 (No autorizado) y
 * intenta renovar el token automáticamente usando el refresh token.
 */

let isRefreshing = false;
let refreshPromise = null;
// Guardar referencia al fetch original ANTES de interceptarlo
const originalFetch = window.fetch.bind(window);

/**
 * Intenta renovar el token usando el refresh token
 * @returns {Promise<string|null>} Nuevo token o null si falla
 */
async function refreshToken() {
    // Si ya hay una renovación en curso, esperar a que termine
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            const auth = await offlineStorage.getAuth();
            const refreshToken = auth?.refreshToken;

            if (!refreshToken) {
                console.warn('No hay refresh token disponible');
                return null;
            }

            // SIEMPRE usar originalFetch para evitar bucle infinito
            const apiUrl = (window.Config && window.Config.API_URL) || 'http://localhost:8080';
            const response = await originalFetch(`${apiUrl}/api/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
                console.warn('Error al renovar token:', error);
                
                // Si el refresh token es inválido, hacer logout
                if (response.status === 401) {
                    console.log('Refresh token inválido, cerrando sesión...');
                    if (typeof handleLogout === 'function') {
                        await handleLogout();
                    }
                }
                
                return null;
            }

            const data = await response.json();
            
            if (!data.token || !data.user) {
                console.warn('Respuesta inválida al renovar token');
                return null;
            }

            // Guardar nuevo token y usuario
            const getCurrentToken = window.getCurrentToken || (() => null);
            const getCurrentUser = window.getCurrentUser || (() => null);
            const setCurrentToken = window.setCurrentToken || (() => {});
            const setCurrentUser = window.setCurrentUser || (() => {});

            setCurrentToken(data.token);
            setCurrentUser(data.user);

            // Guardar en IndexedDB (mantener el mismo refresh token)
            await offlineStorage.saveAuth(data.token, data.user, refreshToken);

            // Actualizar token en quizManager si existe
            if (typeof quizManager !== 'undefined' && quizManager && typeof quizManager.setToken === 'function') {
                try {
                    quizManager.setToken(data.token);
                } catch (error) {
                    console.warn('Error al actualizar token en quizManager:', error);
                }
            }

            // Reconectar WebSocket con el nuevo token
            if (typeof wsClient !== 'undefined' && wsClient && wsClient.isConnected) {
                try {
                    wsClient.disconnect();
                    await wsClient.connect(data.token);
                } catch (error) {
                    console.warn('Error al reconectar WebSocket:', error);
                }
            }

            console.log('Token renovado exitosamente');
            return data.token;
        } catch (error) {
            console.error('Error al renovar token:', error);
            return null;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

/**
 * Wrapper para fetch que maneja automáticamente la renovación de tokens
 * @param {string} url - URL de la solicitud
 * @param {object} options - Opciones de fetch
 * @returns {Promise<Response>} Respuesta de la solicitud
 */
async function fetchWithAuth(url, options = {}) {
    const getCurrentToken = window.getCurrentToken || (() => null);
    let token = getCurrentToken();

    // Si no hay token, intentar obtenerlo de IndexedDB
    if (!token) {
        try {
            const auth = await offlineStorage.getAuth();
            token = auth?.token;
            if (token) {
                if (window.setCurrentToken) {
                    window.setCurrentToken(token);
                }
            }
        } catch (error) {
            console.warn('Error al obtener token de IndexedDB:', error);
        }
    }

    // Preparar headers sin forzar Content-Type cuando se envía FormData
    const headers = {
        ...options.headers
    };

    // Solo establecer Content-Type por defecto para solicitudes JSON
    // Si es FormData, permitir que el navegador establezca el boundary automáticamente
    const isFormData = (typeof FormData !== 'undefined') && (options.body instanceof FormData);
    if (!isFormData) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    } else {
        // Asegurar que no quede Content-Type heredado incorrectamente
        if (headers['Content-Type']) delete headers['Content-Type'];
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // SIEMPRE usar originalFetch para evitar bucle infinito
    // Realizar solicitud
    let response = await originalFetch(url, {
        ...options,
        headers
    });

    // Si recibimos 401, intentar renovar el token y reintentar
    if (response.status === 401 && token) {
        console.log('Token expirado, intentando renovar...');
        const newToken = await refreshToken();

        if (newToken) {
            // Reintentar la solicitud con el nuevo token
            headers['Authorization'] = `Bearer ${newToken}`;
            response = await originalFetch(url, {
                ...options,
                headers
            });
        } else {
            // Si no se pudo renovar, redirigir a login
            console.warn('No se pudo renovar el token, redirigiendo a login...');
            if (typeof handleLogout === 'function') {
                await handleLogout();
            }
        }
    }

    return response;
}

/**
 * Interceptar fetch global para manejar automáticamente la renovación de tokens
 * Solo intercepta solicitudes a nuestro servidor
 */
function setupFetchInterceptor() {
    // Verificar si ya se interceptó para evitar múltiples interceptaciones
    if (window.fetch._isIntercepted) {
        return;
    }
    
    window.fetch = async function(url, options = {}) {
        // Solo interceptar solicitudes a nuestro servidor
        const apiUrl = (window.Config && window.Config.API_URL) || 'http://localhost:8080';
        
        // Helper: detectar si la URL es un endpoint de autenticación
        const isAuthEndpoint = (u) => {
            try {
                const urlObj = typeof u === 'string' ? new URL(u, window.location.origin) : u;
                const path = urlObj.pathname || '';
                return (
                    path === '/api/login' ||
                    path === '/api/logout' ||
                    path === '/api/refresh' ||
                    path.startsWith('/api/register')
                );
            } catch (_) {
                // Fallback simple si no se puede parsear
                const s = String(u || '');
                return (
                    s.includes('/api/login') ||
                    s.includes('/api/logout') ||
                    s.includes('/api/refresh') ||
                    s.includes('/api/register')
                );
            }
        };
        
        // Verificar si la URL es relativa o absoluta
        let shouldIntercept = false;
        if (typeof url === 'string') {
            // Si la URL es relativa (empieza con /), interceptar si es para nuestro servidor
            if (url.startsWith('/api') || url.startsWith('/contenidos') || url.startsWith('/health')) {
                // No interceptar endpoints de autenticación
                if (!isAuthEndpoint(new URL(url, window.location.origin))) {
                    shouldIntercept = true;
                }
            }
            // Si la URL es absoluta, verificar si es para nuestro servidor
            else {
                try {
                    const urlObj = new URL(url, window.location.origin);
                    const apiUrlObj = new URL(apiUrl);
                    // Interceptar si es el mismo host y puerto
                    if (urlObj.hostname === apiUrlObj.hostname && urlObj.port === apiUrlObj.port) {
                        if (!isAuthEndpoint(urlObj)) {
                            shouldIntercept = true;
                        }
                    }
                } catch (e) {
                    // Si no se puede parsear la URL, verificar si contiene el hostname
                    if ((url.includes('localhost:8080') || url.includes(apiUrl.replace(/^https?:\/\//, ''))) && !isAuthEndpoint(url)) {
                        shouldIntercept = true;
                    }
                }
            }
        }
        
        if (shouldIntercept) {
            return fetchWithAuth(url, options);
        }
        
        // Para otras URLs, usar fetch original
        return originalFetch(url, options);
    };
    
    // Marcar como interceptado para evitar múltiples interceptaciones
    window.fetch._isIntercepted = true;
}

// Configurar interceptor cuando el módulo se carga
if (typeof window !== 'undefined') {
    // Esperar a que offlineStorage esté disponible
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(setupFetchInterceptor, 1000);
        });
    } else {
        setTimeout(setupFetchInterceptor, 1000);
    }
}

// Exportar funciones para uso manual si es necesario
window.refreshToken = refreshToken;
window.fetchWithAuth = fetchWithAuth;

