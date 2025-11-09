const pool = require('../config/database');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');
const validator = require('../utils/validator');

/**
 * Modelo para gestión de usuarios
 */
const Usuario = {
  /**
   * Autenticar usuario con matrícula y contraseña
   * @param {string} matricula - Matrícula del usuario
   * @param {string} password - Contraseña en texto plano
   * @returns {Promise<object|null>} - Usuario autenticado o null si las credenciales son inválidas
   */
  async authenticate(matricula, password) {
    try {
      const result = await pool.query(
        'SELECT id, matricula, hash, rol, nombre, email FROM usuario WHERE matricula = $1',
        [matricula.trim()]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const user = result.rows[0];
      const isValid = await bcrypt.compare(password, user.hash);
      
      if (!isValid) {
        return null;
      }
      
      // Eliminar hash de la respuesta
      delete user.hash;
      return user;
    } catch (error) {
      logger.error('Error en authenticate', error, { matricula: matricula?.trim() });
      throw error;
    }
  },

  /**
   * Obtener usuario por ID
   * @param {number} userId - ID del usuario
   * @returns {Promise<object|null>} - Usuario o null si no existe
   */
  async getById(userId) {
    try {
      const result = await pool.query(
        'SELECT id, matricula, rol, nombre, email FROM usuario WHERE id = $1',
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error en getById', error, { userId });
      throw error;
    }
  },

  /**
   * Crear nuevo usuario (estudiante o tutor)
   * @param {string} matricula - Matrícula del usuario
   * @param {string} password - Contraseña en texto plano
   * @param {string} rol - Rol del usuario ('estudiante' o 'tutor')
   * @param {string} nombre - Nombre del usuario (opcional)
   * @param {string} email - Email del usuario (opcional)
   * @returns {Promise<object>} - Usuario creado (sin hash de contraseña)
   */
  async create(matricula, password, rol, nombre = null, email = null) {
    try {
      // Validar matrícula
      if (!matricula || matricula.trim().length === 0) {
        throw new Error('La matrícula es requerida');
      }
      
      // Validar rol
      if (rol !== 'estudiante' && rol !== 'tutor') {
        throw new Error('Rol inválido. Debe ser "estudiante" o "tutor"');
      }
      
      // Validar contraseña
      if (!password || password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }
      
      // Validar email si se proporciona
      if (email && email.trim() && !validator.isValidEmail(email)) {
        throw new Error('Email inválido');
      }
      
      // Verificar que la matrícula no exista
      const existingUser = await pool.query(
        'SELECT id FROM usuario WHERE matricula = $1',
        [matricula.trim()]
      );
      
      if (existingUser.rows.length > 0) {
        throw new Error('La matrícula ya está registrada');
      }
      
      // Hash de la contraseña
      const hash = await bcrypt.hash(password, 10);
      
      // Crear usuario
      const result = await pool.query(
        `INSERT INTO usuario (matricula, hash, rol, nombre, email)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, matricula, rol, nombre, email, created_at`,
        [matricula.trim(), hash, rol, nombre?.trim() || null, email?.trim() || null]
      );
      
      logger.info('Usuario creado', { 
        userId: result.rows[0].id, 
        matricula: result.rows[0].matricula, 
        rol 
      });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error en create usuario', error, { matricula, rol });
      throw error;
    }
  }
};

module.exports = Usuario;

