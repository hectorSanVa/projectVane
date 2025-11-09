// Gestor de cuestionarios
class QuizManager {
    constructor() {
        // Usar configuración global o valor por defecto
        this.baseUrl = (window.Config && window.Config.API_URL) || 'http://localhost:8080';
        this.currentToken = null;
    }
    
    // Actualizar baseUrl cuando cambie la configuración
    updateBaseUrl() {
        this.baseUrl = (window.Config && window.Config.API_URL) || 'http://localhost:8080';
    }

    setToken(token) {
        this.currentToken = token;
    }

    // Obtener preguntas de un quiz
    async getPreguntas(contenidoId) {
        try {
            // Obtener token actual
            const token = this.currentToken || (typeof getCurrentToken === 'function' ? getCurrentToken() : null);
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            console.log('Obteniendo preguntas para contenido:', contenidoId);
            // Usar apiUrl helper si está disponible, sino usar baseUrl
            const url = (window.apiUrl ? window.apiUrl(`/api/contenidos/${contenidoId}/preguntas`) : `${this.baseUrl}/api/contenidos/${contenidoId}/preguntas`);
            const response = await fetch(url, {
                headers: headers
            });
            
            if (response.ok) {
                const preguntas = await response.json();
                console.log('Preguntas obtenidas:', preguntas?.length || 0);
                return preguntas;
            } else {
                console.error('Error al obtener preguntas. Status:', response.status, response.statusText);
                const errorData = await response.json().catch(() => ({}));
                console.error('Error data:', errorData);
                return [];
            }
        } catch (error) {
            console.error('Error al obtener preguntas:', error);
            console.error('Stack:', error.stack);
            return [];
        }
    }

    // Guardar respuestas
    async guardarRespuestas(contenidoId, respuestas) {
        try {
            // Obtener token actual
            const token = this.currentToken || (typeof getCurrentToken === 'function' ? getCurrentToken() : null);
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const url = (window.apiUrl ? window.apiUrl(`/api/contenidos/${contenidoId}/respuestas`) : `${this.baseUrl}/api/contenidos/${contenidoId}/respuestas`);
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ respuestas })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Error al guardar respuestas');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    // Obtener calificación
    async getCalificacion(contenidoId) {
        try {
            // Obtener token actual
            const token = this.currentToken || (typeof getCurrentToken === 'function' ? getCurrentToken() : null);
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            console.log('Obteniendo calificación para contenido:', contenidoId);
            const url = (window.apiUrl ? window.apiUrl(`/api/contenidos/${contenidoId}/calificacion`) : `${this.baseUrl}/api/contenidos/${contenidoId}/calificacion`);
            const response = await fetch(url, {
                headers: headers
            });

            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('Error al obtener calificación:', error);
            return null;
        }
    }

    // Obtener resultados detallados del quiz
    async getResultadosDetallados(contenidoId) {
        try {
            // Obtener token actual
            const token = this.currentToken || (typeof getCurrentToken === 'function' ? getCurrentToken() : null);
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const url = (window.apiUrl ? window.apiUrl(`/api/contenidos/${contenidoId}/resultados`) : `${this.baseUrl}/api/contenidos/${contenidoId}/resultados`);
            const response = await fetch(url, {
                headers: headers
            });

            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('Error al obtener resultados detallados:', error);
            return null;
        }
    }
}

// Instancia global
const quizManager = new QuizManager();

// Exportar a window para acceso global (múltiples intentos para asegurar)
(function exportQuizManager() {
    if (typeof window !== 'undefined') {
        window.quizManager = quizManager;
        console.log('✅ quizManager exportado a window');
    } else {
        // Si window no está disponible aún, intentar más tarde
        setTimeout(exportQuizManager, 10);
    }
})();

// También exportar cuando el DOM esté listo
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof window !== 'undefined') {
                window.quizManager = quizManager;
                console.log('✅ quizManager exportado a window (DOMContentLoaded)');
            }
        });
    } else {
        // DOM ya está listo
        if (typeof window !== 'undefined') {
            window.quizManager = quizManager;
            console.log('✅ quizManager exportado a window (DOM ya listo)');
        }
    }
}

// Exportar también después de un delay
setTimeout(() => {
    if (typeof window !== 'undefined') {
        window.quizManager = quizManager;
    }
}, 100);

