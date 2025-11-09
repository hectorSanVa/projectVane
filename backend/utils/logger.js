/**
 * Logger profesional con niveles de log
 */
class Logger {
    constructor(level = 'info') {
        this.level = level;
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
    }

    /**
     * Log de error
     * @param {string} message - Mensaje de error
     * @param {Error} error - Objeto de error (opcional)
     * @param {object} metadata - Metadatos adicionales (opcional)
     */
    error(message, error = null, metadata = {}) {
        if (this.shouldLog('error')) {
            const logData = {
                level: 'ERROR',
                timestamp: new Date().toISOString(),
                message,
                ...metadata
            };
            
            if (error) {
                logData.error = {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                };
            }
            
            console.error(JSON.stringify(logData));
        }
    }

    /**
     * Log de advertencia
     * @param {string} message - Mensaje de advertencia
     * @param {object} metadata - Metadatos adicionales (opcional)
     */
    warn(message, metadata = {}) {
        if (this.shouldLog('warn')) {
            console.warn(JSON.stringify({
                level: 'WARN',
                timestamp: new Date().toISOString(),
                message,
                ...metadata
            }));
        }
    }

    /**
     * Log de información
     * @param {string} message - Mensaje informativo
     * @param {object} metadata - Metadatos adicionales (opcional)
     */
    info(message, metadata = {}) {
        if (this.shouldLog('info')) {
            console.log(JSON.stringify({
                level: 'INFO',
                timestamp: new Date().toISOString(),
                message,
                ...metadata
            }));
        }
    }

    /**
     * Log de debug
     * @param {string} message - Mensaje de debug
     * @param {object} metadata - Metadatos adicionales (opcional)
     */
    debug(message, metadata = {}) {
        if (this.shouldLog('debug')) {
            console.log(JSON.stringify({
                level: 'DEBUG',
                timestamp: new Date().toISOString(),
                message,
                ...metadata
            }));
        }
    }

    /**
     * Verifica si debe hacer log según el nivel
     * @param {string} level - Nivel de log a verificar
     * @returns {boolean}
     */
    shouldLog(level) {
        return this.levels[level] <= this.levels[this.level];
    }
}

// Exportar instancia singleton
const logger = new Logger(process.env.LOG_LEVEL || 'info');

module.exports = logger;

