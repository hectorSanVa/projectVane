const pool = require('../config/database');
const logger = require('../utils/logger');

/**
 * Modelo para gestión de asignaciones estudiante-curso
 */
const Asignacion = {
  /**
   * Asignar estudiante a un curso
   * @param {number} cursoId - ID del curso
   * @param {number} estudianteId - ID del estudiante
   * @returns {Promise<object>} - Asignación creada
   */
  async asignarEstudianteACurso(cursoId, estudianteId) {
    try {
      const result = await pool.query(
        `INSERT INTO curso_estudiante (curso_id, estudiante_id, activo)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (curso_id, estudiante_id) 
         DO UPDATE SET activo = TRUE
         RETURNING *`,
        [cursoId, estudianteId]
      );
      logger.info('Estudiante asignado a curso', { cursoId, estudianteId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error en asignarEstudianteACurso', error, { cursoId, estudianteId });
      throw error;
    }
  },

  /**
   * Desasignar estudiante de un curso
   * @param {number} cursoId - ID del curso
   * @param {number} estudianteId - ID del estudiante
   * @returns {Promise<boolean>} - True si se desasignó correctamente
   */
  async desasignarEstudianteDeCurso(cursoId, estudianteId) {
    try {
      const result = await pool.query(
        `UPDATE curso_estudiante 
         SET activo = FALSE 
         WHERE curso_id = $1 AND estudiante_id = $2
         RETURNING *`,
        [cursoId, estudianteId]
      );
      logger.info('Estudiante desasignado de curso', { cursoId, estudianteId });
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error en desasignarEstudianteDeCurso', error, { cursoId, estudianteId });
      throw error;
    }
  },

  /**
   * Obtener cursos de un estudiante
   * @param {number} estudianteId - ID del estudiante
   * @returns {Promise<Array>} - Lista de cursos asignados
   */
  async getCursosDeEstudiante(estudianteId) {
    try {
      // Intentar consulta con tutor_id (si existe la columna, funcionará)
      // Si la columna no existe, PostgreSQL lanzará un error que capturaremos
      let result;
      try {
        result = await pool.query(
          `SELECT c.id, c.nombre, c.descripcion, c.created_at, c.tutor_id, 
                  COALESCE(u.nombre, 'Sin tutor') as tutor_nombre
           FROM curso c
           INNER JOIN curso_estudiante ce ON c.id = ce.curso_id
           LEFT JOIN usuario u ON c.tutor_id = u.id
           WHERE ce.estudiante_id = $1 AND ce.activo = TRUE
           ORDER BY c.nombre`,
          [estudianteId]
        );
      } catch (columnError) {
        // Si falla porque la columna no existe, usar consulta alternativa
        if (columnError.code === '42703' || columnError.message.includes('tutor_id')) {
          logger.warn('La columna tutor_id no existe. Usando consulta alternativa.', { estudianteId });
          result = await pool.query(
            `SELECT c.id, c.nombre, c.descripcion, c.created_at, 
                    NULL::integer as tutor_id, 'Sin tutor' as tutor_nombre
             FROM curso c
             INNER JOIN curso_estudiante ce ON c.id = ce.curso_id
             WHERE ce.estudiante_id = $1 AND ce.activo = TRUE
             ORDER BY c.nombre`,
            [estudianteId]
          );
        } else {
          // Si es otro tipo de error, relanzarlo
          throw columnError;
        }
      }
      
      logger.debug('Cursos obtenidos para estudiante', { 
        estudianteId, 
        count: result.rows.length 
      });
      
      return result.rows;
    } catch (error) {
      logger.error('Error en getCursosDeEstudiante', error, { 
        estudianteId,
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        stack: error.stack
      });
      throw error;
    }
  },

  /**
   * Obtener estudiantes de un curso
   * @param {number} cursoId - ID del curso
   * @returns {Promise<Array>} - Lista de estudiantes asignados
   */
  async getEstudiantesDeCurso(cursoId) {
    try {
      const result = await pool.query(
        `SELECT u.id, u.matricula, u.nombre, u.email, ce.fecha_inscripcion
         FROM usuario u
         JOIN curso_estudiante ce ON u.id = ce.estudiante_id
         WHERE ce.curso_id = $1 AND ce.activo = TRUE
         ORDER BY u.nombre`,
        [cursoId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error en getEstudiantesDeCurso', error, { cursoId });
      throw error;
    }
  },

  /**
   * Obtener todos los estudiantes asignados a un tutor (a través de sus cursos)
   * @param {number} tutorId - ID del tutor
   * @returns {Promise<Array>} - Lista de estudiantes
   */
  async getEstudiantesDeTutor(tutorId) {
    try {
      const result = await pool.query(
        `SELECT DISTINCT u.id, u.matricula, u.nombre, u.email
         FROM usuario u
         JOIN curso_estudiante ce ON u.id = ce.estudiante_id
         JOIN curso c ON ce.curso_id = c.id
         WHERE c.tutor_id = $1 AND ce.activo = TRUE
         ORDER BY u.nombre`,
        [tutorId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error en getEstudiantesDeTutor', error, { tutorId });
      throw error;
    }
  },

  /**
   * Verificar si un estudiante está asignado a un curso
   * @param {number} cursoId - ID del curso
   * @param {number} estudianteId - ID del estudiante
   * @returns {Promise<boolean>} - True si está asignado
   */
  async estaAsignado(cursoId, estudianteId) {
    try {
      const result = await pool.query(
        `SELECT 1 FROM curso_estudiante 
         WHERE curso_id = $1 AND estudiante_id = $2 AND activo = TRUE
         LIMIT 1`,
        [cursoId, estudianteId]
      );
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error en estaAsignado', error, { cursoId, estudianteId });
      throw error;
    }
  },

  /**
   * Obtener cursos disponibles (no asignados) para un estudiante
   * @param {number} estudianteId - ID del estudiante
   * @returns {Promise<Array>} - Lista de cursos disponibles
   */
  async getCursosDisponibles(estudianteId) {
    try {
      const result = await pool.query(
        `SELECT c.id, c.nombre, c.descripcion, c.created_at, c.tutor_id, 
                u.nombre as tutor_nombre
         FROM curso c
         LEFT JOIN usuario u ON c.tutor_id = u.id
         WHERE c.id NOT IN (
           SELECT curso_id FROM curso_estudiante 
           WHERE estudiante_id = $1 AND activo = TRUE
         )
         ORDER BY c.nombre`,
        [estudianteId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error en getCursosDisponibles', error, { estudianteId });
      throw error;
    }
  },

  /**
   * Obtener todos los estudiantes del sistema
   * @returns {Promise<Array>} - Lista de todos los estudiantes
   */
  async getTodosLosEstudiantes() {
    try {
      const result = await pool.query(
        `SELECT id, matricula, nombre, email
         FROM usuario
         WHERE rol = 'estudiante'
         ORDER BY nombre, matricula`
      );
      return result.rows;
    } catch (error) {
      logger.error('Error en getTodosLosEstudiantes', error);
      throw error;
    }
  }
};

module.exports = Asignacion;
