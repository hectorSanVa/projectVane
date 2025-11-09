/**
 * Rate limiter simple para prevenir abuso
 */
class RateLimiter {
    constructor(windowMs = 60000, maxRequests = 100) {
        this.windowMs = windowMs; // Ventana de tiempo en milisegundos
        this.maxRequests = maxRequests; // Máximo de solicitudes por ventana
        this.requests = new Map(); // IP -> { count: number, resetTime: number }
    }

    /**
     * Verifica si una solicitud es permitida
     * @param {string} identifier - Identificador (IP, usuario, etc.)
     * @returns {boolean} - true si está permitido, false si excede el límite
     */
    isAllowed(identifier) {
        const now = Date.now();
        const record = this.requests.get(identifier);

        if (!record || now > record.resetTime) {
            // Nueva ventana o primera solicitud
            this.requests.set(identifier, {
                count: 1,
                resetTime: now + this.windowMs
            });
            return true;
        }

        if (record.count >= this.maxRequests) {
            return false;
        }

        record.count++;
        return true;
    }

    /**
     * Obtiene el tiempo restante hasta el siguiente reset
     * @param {string} identifier - Identificador
     * @returns {number} - Milisegundos restantes
     */
    getTimeUntilReset(identifier) {
        const record = this.requests.get(identifier);
        if (!record) return 0;
        
        const now = Date.now();
        const remaining = record.resetTime - now;
        return remaining > 0 ? remaining : 0;
    }

    /**
     * Limpia registros expirados
     */
    cleanup() {
        const now = Date.now();
        for (const [identifier, record] of this.requests.entries()) {
            if (now > record.resetTime) {
                this.requests.delete(identifier);
            }
        }
    }
}

// Instancia global para rate limiting (más permisivo para uso general)
const rateLimiter = new RateLimiter(
    parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minuto
    parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500 // 500 solicitudes por minuto (más permisivo)
);

// Rate limiter más estricto para login (para prevenir ataques de fuerza bruta)
const loginRateLimiter = new RateLimiter(
    60000, // 1 minuto
    10 // 10 intentos de login por minuto por IP
);

// Limpiar registros expirados cada minuto (más frecuente para mejor experiencia)
setInterval(() => {
    rateLimiter.cleanup();
    loginRateLimiter.cleanup();
}, 60 * 1000);

module.exports = {
    rateLimiter,
    loginRateLimiter
};

