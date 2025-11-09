const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_default';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_DAYS = 7; // Días de validez del refresh token

/**
 * Verifica y valida un token JWT
 * @param {string} token - Token JWT a verificar
 * @returns {Promise<object>} - Usuario autenticado
 * @throws {Error} - Si el token es inválido o el usuario no existe
 */
const verifyToken = async (token) => {
  try {
    if (!token || typeof token !== 'string') {
      throw new Error('Token requerido');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded.userId) {
      throw new Error('Token inválido: falta userId');
    }

    const result = await pool.query(
      'SELECT id, matricula, rol, nombre, email FROM usuario WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Usuario no encontrado');
    }
    
    return result.rows[0];
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Token JWT inválido', { error: error.message });
      throw new Error('Token inválido');
    }
    if (error.name === 'TokenExpiredError') {
      logger.warn('Token JWT expirado');
      throw new Error('Token expirado');
    }
    logger.error('Error al verificar token', error);
    throw new Error('Error de autenticación');
  }
};

/**
 * Genera un token JWT para un usuario
 * @param {number} userId - ID del usuario
 * @returns {string} - Token JWT
 */
const generateToken = (userId) => {
  if (!userId || typeof userId !== 'number') {
    throw new Error('UserId inválido');
  }

  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Genera un refresh token para un usuario
 * @param {number} userId - ID del usuario
 * @returns {string} - Refresh token
 */
const generateRefreshToken = (userId) => {
  if (!userId || typeof userId !== 'number') {
    throw new Error('UserId inválido');
  }

  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
};

/**
 * Verifica un refresh token
 * @param {string} token - Refresh token a verificar
 * @returns {Promise<object>} - Usuario autenticado
 * @throws {Error} - Si el token es inválido
 */
const verifyRefreshToken = async (token) => {
  try {
    if (!token || typeof token !== 'string') {
      throw new Error('Refresh token requerido');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded.userId || decoded.type !== 'refresh') {
      throw new Error('Token inválido: no es un refresh token');
    }

    // Verificar que el token no esté revocado en la base de datos
    const tokenCheck = await pool.query(
      `SELECT id, revoked, expires_at 
       FROM refresh_token 
       WHERE token = $1 AND usuario_id = $2`,
      [token, decoded.userId]
    );

    if (tokenCheck.rows.length === 0) {
      throw new Error('Refresh token no encontrado');
    }

    const tokenData = tokenCheck.rows[0];
    if (tokenData.revoked) {
      throw new Error('Refresh token revocado');
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      throw new Error('Refresh token expirado');
    }

    // Verificar que el usuario existe
    const result = await pool.query(
      'SELECT id, matricula, rol, nombre, email FROM usuario WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Usuario no encontrado');
    }
    
    return result.rows[0];
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Refresh token JWT inválido', { error: error.message });
      throw new Error('Refresh token inválido');
    }
    if (error.name === 'TokenExpiredError') {
      logger.warn('Refresh token JWT expirado');
      throw new Error('Refresh token expirado');
    }
    logger.error('Error al verificar refresh token', error);
    throw error;
  }
};

/**
 * Guarda un refresh token en la base de datos
 * @param {number} userId - ID del usuario
 * @param {string} token - Refresh token
 * @returns {Promise<object>} - Token guardado
 */
const saveRefreshToken = async (userId, token) => {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

    const result = await pool.query(
      `INSERT INTO refresh_token (usuario_id, token, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, token, expiresAt]
    );

    return result.rows[0];
  } catch (error) {
    logger.error('Error al guardar refresh token', error, { userId });
    throw error;
  }
};

/**
 * Revoca un refresh token
 * @param {string} token - Refresh token a revocar
 * @returns {Promise<void>}
 */
const revokeRefreshToken = async (token) => {
  try {
    await pool.query(
      `UPDATE refresh_token 
       SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
       WHERE token = $1`,
      [token]
    );
  } catch (error) {
    logger.error('Error al revocar refresh token', error);
    throw error;
  }
};

/**
 * Revoca todos los refresh tokens de un usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<void>}
 */
const revokeAllRefreshTokens = async (userId) => {
  try {
    await pool.query(
      `UPDATE refresh_token 
       SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
       WHERE usuario_id = $1 AND revoked = FALSE`,
      [userId]
    );
  } catch (error) {
    logger.error('Error al revocar todos los refresh tokens', error, { userId });
    throw error;
  }
};

/**
 * Limpia tokens expirados de la base de datos
 * @returns {Promise<number>} - Número de tokens eliminados
 */
const cleanupExpiredTokens = async () => {
  try {
    const result = await pool.query(
      `DELETE FROM refresh_token 
       WHERE expires_at < NOW() OR revoked = TRUE`
    );
    return result.rowCount;
  } catch (error) {
    logger.error('Error al limpiar tokens expirados', error);
    throw error;
  }
};

module.exports = { 
  verifyToken, 
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  saveRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  cleanupExpiredTokens
};

