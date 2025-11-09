/**
 * Middleware para manejo centralizado de errores
 */
const logger = require('../utils/logger');

/**
 * Middleware de manejo de errores
 */
function errorHandler(err, req, res, next) {
    logger.error('Error en solicitud', err, {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });

    // Errores de validación
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Error de validación',
            message: err.message,
            details: err.details || {}
        });
    }

    // Errores de autenticación
    if (err.name === 'UnauthorizedError' || err.status === 401) {
        return res.status(401).json({
            error: 'No autorizado',
            message: err.message || 'Token inválido o expirado'
        });
    }

    // Errores de base de datos
    if (err.code && err.code.startsWith('23')) {
        return res.status(409).json({
            error: 'Error de integridad',
            message: 'Conflicto con datos existentes'
        });
    }

    // Error genérico
    const statusCode = err.statusCode || err.status || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Error interno del servidor'
        : err.message;

    res.status(statusCode).json({
        error: 'Error del servidor',
        message: message
    });
}

/**
 * Wrapper para manejar errores en funciones async
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = {
    errorHandler,
    asyncHandler
};

