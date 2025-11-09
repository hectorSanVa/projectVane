const pool = require('../config/database');
const logger = require('../utils/logger');

/**
 * Modelo para gestión de mensajes de chat
 */
const Chat = {
  /**
   * Guardar mensaje de chat
   * @param {string} room - Sala de chat
   * @param {number} usuarioId - ID del usuario
   * @param {string} texto - Texto del mensaje (ya sanitizado)
   * @returns {Promise<object>} - Mensaje guardado
   */
  async saveMessage(room, usuarioId, texto) {
    try {
      const result = await pool.query(
        `INSERT INTO chat_mensaje (room, usuario_id, texto)
         VALUES ($1, $2, $3)
         RETURNING id, room, usuario_id, texto, ts, leido`,
        [room, usuarioId, texto]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error en saveMessage', error, { room, usuarioId });
      throw error;
    }
  },

  /**
   * Obtener mensajes de una sala
   * @param {string} room - Sala de chat
   * @param {number} limit - Límite de mensajes
   * @returns {Promise<Array>} - Lista de mensajes
   */
  async getMessages(room, limit = 50) {
    try {
      const result = await pool.query(
        `SELECT cm.*, u.nombre, u.rol, u.matricula
         FROM chat_mensaje cm
         JOIN usuario u ON cm.usuario_id = u.id
         WHERE cm.room = $1
         ORDER BY cm.ts DESC
         LIMIT $2`,
        [room, limit]
      );
      return result.rows.reverse(); // Ordenar del más antiguo al más nuevo
    } catch (error) {
      logger.error('Error en getMessages', error, { room, limit });
      throw error;
    }
  },

  /**
   * Marcar mensajes como leídos
   * @param {string} room - Sala de chat
   * @param {number} usuarioId - ID del usuario
   */
  async markAsRead(room, usuarioId) {
    try {
      await pool.query(
        `UPDATE chat_mensaje
         SET leido = TRUE
         WHERE room = $1 AND usuario_id != $2`,
        [room, usuarioId]
      );
    } catch (error) {
      logger.error('Error en markAsRead', error, { room, usuarioId });
      throw error;
    }
  }
};

module.exports = Chat;

