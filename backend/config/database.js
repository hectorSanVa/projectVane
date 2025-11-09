const { Pool } = require('pg');
require('dotenv').config();
const logger = require('../utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'kiosco_educativo',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
});

// Test de conexión
pool.on('connect', (client) => {
  logger.debug('Nueva conexión a PostgreSQL establecida', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('error', (err) => {
  logger.error('Error inesperado en la conexión a PostgreSQL', err);
  // No hacer exit inmediato en producción, permitir que el servidor intente recuperarse
  if (process.env.NODE_ENV === 'production') {
    logger.warn('Servidor continuará ejecutándose después de error de BD');
  } else {
    process.exit(-1);
  }
});

// Verificar conexión al iniciar
pool.query('SELECT NOW()')
  .then(() => {
    logger.info('Conexión a PostgreSQL verificada exitosamente', {
      database: process.env.DB_NAME || 'kiosco_educativo',
      host: process.env.DB_HOST || 'localhost'
    });
  })
  .catch((err) => {
    logger.error('Error al verificar conexión a PostgreSQL', err);
  });

module.exports = pool;

