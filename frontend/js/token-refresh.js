/**
 * Manejo automático de renovación de tokens
 * 
 * Este módulo intercepta las respuestas 401 (No autorizado) y
 * intenta renovar el token automáticamente usando el refresh token.
 */

let isRefreshing = false;
let refreshPromise = null;

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

            const apiUrl = (window.Config && window.Config.API_URL) || 'http://localhost:8080';
            const response = await fetch(`${apiUrl}/api/refresh`, {
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

    // Agregar token a los headers si está disponible
    const headers = {
        ...options.headers,
        'Content-Type': options.headers?.['Content-Type'] || 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Realizar solicitud
    let response = await fetch(url, {
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
            response = await fetch(url, {
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
 * Solo intercepta solicitudes a localhost:8080
 */
function setupFetchInterceptor() {
    const originalFetch = window.fetch;
    
    window.fetch = async function(url, options = {}) {
        // Solo interceptar solicitudes a nuestro servidor
        const apiUrl = (window.Config && window.Config.API_URL) || 'http://localhost:8080';
        const apiHost = new URL(apiUrl).hostname;
        if (typeof url === 'string' && (url.includes(apiHost) || url.includes('localhost:8080'))) {
            return fetchWithAuth(url, options);
        }
        
        // Para otras URLs, usar fetch normal
        return originalFetch(url, options);
    };
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

