/**
 * Configuración centralizada de la aplicación
 */
require('dotenv').config();

const config = {
  // Configuración del servidor
  server: {
    port: parseInt(process.env.PORT) || 8080,
    environment: process.env.NODE_ENV || 'development',
    host: process.env.HOST || 'localhost'
  },

  // Configuración de base de datos
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'kiosco_educativo',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000
  },

  // Configuración de autenticación JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'secret_default',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // Configuración de rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minuto
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // Configuración de logging
  logging: {
    level: process.env.LOG_LEVEL || 'info' // error, warn, info, debug
  },

  // Configuración de WebSocket
  websocket: {
    path: '/ws',
    pingInterval: parseInt(process.env.WS_PING_INTERVAL) || 30000, // 30 segundos
    maxReconnectAttempts: parseInt(process.env.WS_MAX_RECONNECT) || 5,
    reconnectInterval: parseInt(process.env.WS_RECONNECT_INTERVAL) || 3000
  },

  // Configuración de seguridad
  security: {
    // Longitud máxima de mensajes de chat
    maxChatMessageLength: 500,
    // Longitud máxima de texto sanitizado
    maxSanitizedTextLength: 1000
  }
};

// Validar configuración crítica
if (process.env.NODE_ENV === 'production') {
  if (config.jwt.secret === 'secret_default') {
    throw new Error('JWT_SECRET debe ser configurado en producción');
  }
  if (!config.database.password) {
    throw new Error('DB_PASSWORD debe ser configurado en producción');
  }
}

module.exports = config;

