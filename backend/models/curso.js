const pool = require('../config/database');
const logger = require('../utils/logger');

/**
 * Modelo para gestión de cursos y contenidos
 */
const Curso = {
  /**
   * Obtener todos los cursos
   * @param {number} tutorId - Opcional: filtrar por tutor
   * @returns {Promise<Array>} - Lista de cursos
   */
  async getAll(tutorId = null) {
    try {
      let query = 'SELECT c.*, u.nombre as tutor_nombre FROM curso c LEFT JOIN usuario u ON c.tutor_id = u.id';
      const params = [];
      
      if (tutorId) {
        query += ' WHERE c.tutor_id = $1';
        params.push(tutorId);
      }
      
      query += ' ORDER BY c.nombre';
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error en getAll', error);
      throw error;
    }
  },

  /**
   * Obtener cursos de un tutor
   * @param {number} tutorId - ID del tutor
   * @returns {Promise<Array>} - Lista de cursos
   */
  async getByTutor(tutorId) {
    try {
      // Verificar si la columna tutor_id existe
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='curso' AND column_name='tutor_id'
      `);
      
      let result;
      if (columnCheck.rows.length > 0) {
        // La columna existe, usar consulta normal
        result = await pool.query(
          `SELECT c.*, COUNT(ce.estudiante_id) as num_estudiantes
           FROM curso c
           LEFT JOIN curso_estudiante ce ON c.id = ce.curso_id AND ce.activo = TRUE
           WHERE c.tutor_id = $1
           GROUP BY c.id
           ORDER BY c.nombre`,
          [tutorId]
        );
      } else {
        // La columna no existe, retornar array vacío (o todos los cursos si no hay filtro)
        logger.warn('La columna tutor_id no existe en la tabla curso. Retornando array vacío.');
        result = { rows: [] };
      }
      
      return result.rows;
    } catch (error) {
      logger.error('Error en getByTutor', error, { tutorId });
      // Si hay un error de columna, retornar array vacío en lugar de lanzar error
      if (error.code === '42703' || error.message.includes('tutor_id')) {
        logger.warn('Error relacionado con tutor_id. Retornando array vacío.');
        return [];
      }
      throw error;
    }
  },

  /**
   * Obtener curso por ID
   * @param {number} cursoId - ID del curso
   * @returns {Promise<object|null>} - Curso o null si no existe
   */
  async getById(cursoId) {
    try {
      const result = await pool.query(
        'SELECT * FROM curso WHERE id = $1',
        [cursoId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error en getById', error, { cursoId });
      throw error;
    }
  },

  /**
   * Obtener contenidos de un curso
   * @param {number} cursoId - ID del curso
   * @returns {Promise<Array>} - Lista de contenidos
   */
  async getContenidos(cursoId) {
    try {
      const result = await pool.query(
        'SELECT *, curso_id FROM contenido WHERE curso_id = $1 ORDER BY orden, id',
        [cursoId]
      );
      // Asegurar que curso_id esté presente en cada contenido
      return result.rows.map(contenido => ({
        ...contenido,
        curso_id: contenido.curso_id || cursoId
      }));
    } catch (error) {
      logger.error('Error en getContenidos', error, { cursoId });
      throw error;
    }
  }
};

module.exports = Curso;

