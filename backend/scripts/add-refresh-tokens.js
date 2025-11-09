/**
 * Script de migración: Agregar soporte para refresh tokens
 * 
 * Este script agrega una tabla para almacenar refresh tokens
 * que permiten renovar tokens JWT sin requerir login nuevamente.
 * 
 * USO: node backend/scripts/add-refresh-tokens.js
 */
const pool = require('../config/database');
const logger = require('../utils/logger');

async function addRefreshTokens() {
  try {
    console.log('Agregando soporte para refresh tokens...\n');

    // Crear tabla de refresh tokens
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_token (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuario(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked BOOLEAN DEFAULT FALSE,
        revoked_at TIMESTAMP NULL
      );
    `);
    console.log('✅ Tabla refresh_token creada');

    // Crear índices
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_token_usuario ON refresh_token(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_token_token ON refresh_token(token);
      CREATE INDEX IF NOT EXISTS idx_refresh_token_expires ON refresh_token(expires_at);
    `);
    console.log('✅ Índices creados');

    // Limpiar tokens expirados antiguos (si existen)
    await pool.query(`
      DELETE FROM refresh_token 
      WHERE expires_at < NOW() OR revoked = TRUE
    `);
    console.log('✅ Tokens expirados limpiados');

    console.log('\n✅ Migración de refresh tokens completada exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    logger.error('Error en addRefreshTokens', error);
    process.exit(1);
  }
}

addRefreshTokens();


