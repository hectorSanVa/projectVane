const pool = require('../config/database');
const logger = require('../utils/logger');

/**
 * Modelo para gestión de progreso de estudiantes
 */
const Progreso = {
  /**
   * Guardar o actualizar progreso de un contenido
   * @param {number} usuarioId - ID del usuario
   * @param {number} cursoId - ID del curso
   * @param {number} contenidoId - ID del contenido
   * @param {number} avance - Porcentaje de avance (0-100)
   * @param {boolean} completado - Si el contenido está completado
   * @returns {Promise<object>} - Progreso guardado
   */
  async saveOrUpdate(usuarioId, cursoId, contenidoId, avance, completado = false) {
    try {
      const result = await pool.query(
        `INSERT INTO progreso (usuario_id, curso_id, contenido_id, avance, completado, sincronizado)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         ON CONFLICT (usuario_id, curso_id, contenido_id)
         DO UPDATE SET
           avance = EXCLUDED.avance,
           completado = EXCLUDED.completado,
           sincronizado = TRUE,
           ts = CURRENT_TIMESTAMP
         RETURNING *`,
        [usuarioId, cursoId, contenidoId, avance, completado]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error en saveOrUpdate', error, { usuarioId, cursoId, contenidoId });
      throw error;
    }
  },

  /**
   * Sincronizar múltiples progresos (para sincronización offline)
   * @param {number} usuarioId - ID del usuario
   * @param {Array} progresos - Array de progresos a sincronizar
   * @returns {Promise<Array>} - Resultados de la sincronización
   */
  async syncMultiple(usuarioId, progresos) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const prog of progresos) {
        const result = await client.query(
          `INSERT INTO progreso (usuario_id, curso_id, contenido_id, avance, completado, sincronizado)
           VALUES ($1, $2, $3, $4, $5, TRUE)
           ON CONFLICT (usuario_id, curso_id, contenido_id)
           DO UPDATE SET
             avance = EXCLUDED.avance,
             completado = EXCLUDED.completado,
             sincronizado = TRUE,
             ts = EXCLUDED.ts
           RETURNING *`,
          [usuarioId, prog.curso_id, prog.contenido_id, prog.avance, prog.completado || false]
        );
        results.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      logger.debug('Progresos sincronizados', { usuarioId, count: results.length });
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error en syncMultiple', error, { usuarioId, count: progresos.length });
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Obtener progreso de un usuario
   * @param {number} usuarioId - ID del usuario
   * @param {number|null} cursoId - ID del curso (opcional)
   * @returns {Promise<Array>} - Lista de progresos
   */
  async getByUsuario(usuarioId, cursoId = null) {
    try {
      let query = 'SELECT * FROM progreso WHERE usuario_id = $1';
      const params = [usuarioId];
      
      if (cursoId) {
        query += ' AND curso_id = $2';
        params.push(cursoId);
      }
      
      query += ' ORDER BY ts DESC';
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error en getByUsuario', error, { 
        usuarioId, 
        cursoId,
        message: error.message,
        code: error.code
      });
      // Retornar array vacío en lugar de lanzar error
      return [];
    }
  },

  /**
   * Obtener progreso de usuario y curso (compatibilidad)
   * @param {number} usuarioId - ID del usuario
   * @param {number} cursoId - ID del curso
   * @returns {Promise<Array>} - Lista de progresos
   */
  async getByUsuarioCurso(usuarioId, cursoId) {
    return this.getByUsuario(usuarioId, cursoId);
  },

  /**
   * Obtener progreso general de un curso (promedio de avances de todos los contenidos)
   * @param {number} usuarioId - ID del usuario
   * @param {number} cursoId - ID del curso
   * @returns {Promise<object>} - Progreso general con porcentaje y detalles
   */
  async getProgresoGeneral(usuarioId, cursoId) {
    try {
      // Obtener todos los contenidos del curso
      const contenidosResult = await pool.query(
        'SELECT id FROM contenido WHERE curso_id = $1',
        [cursoId]
      );
      
      const totalContenidos = contenidosResult.rows.length;
      
      if (totalContenidos === 0) {
        logger.debug('No hay contenidos en el curso. Retornando progreso 0.');
        return {
          totalContenidos: 0,
          contenidosConProgreso: 0,
          progresoPromedio: 0,
          progresoPorcentaje: 0,
          completados: 0
        };
      }
      
      // Obtener progresos del usuario para este curso
      const progresosResult = await pool.query(
        `SELECT contenido_id, avance, completado 
         FROM progreso 
         WHERE usuario_id = $1 AND curso_id = $2`,
        [usuarioId, cursoId]
      );
      
      // Crear mapa de progresos por contenido
      const progresoPorContenido = {};
      progresosResult.rows.forEach(prog => {
        if (prog.contenido_id) {
          progresoPorContenido[prog.contenido_id] = {
            avance: parseFloat(prog.avance) || 0,
            completado: prog.completado || false
          };
        }
      });
      
      // Calcular suma de avances
      let sumaAvances = 0;
      let completados = 0;
      let contenidosConProgreso = 0;
      
      contenidosResult.rows.forEach(contenido => {
        const progreso = progresoPorContenido[contenido.id];
        if (progreso) {
          sumaAvances += progreso.avance;
          contenidosConProgreso++;
          if (progreso.completado || progreso.avance >= 100) {
            completados++;
          }
        }
      });
      
      // Calcular promedio (suma de avances / total de contenidos)
      const progresoPromedio = totalContenidos > 0 
        ? sumaAvances / totalContenidos 
        : 0;
      
      return {
        totalContenidos,
        contenidosConProgreso,
        progresoPromedio: Math.round(progresoPromedio * 100) / 100,
        progresoPorcentaje: Math.round(progresoPromedio),
        completados
      };
    } catch (error) {
      logger.error('Error en getProgresoGeneral', error, { 
        usuarioId, 
        cursoId,
        message: error.message,
        code: error.code,
        detail: error.detail
      });
      // Retornar valores por defecto en lugar de lanzar error
      return {
        totalContenidos: 0,
        contenidosConProgreso: 0,
        progresoPromedio: 0,
        progresoPorcentaje: 0,
        completados: 0
      };
    }
  },

  /**
   * Obtener progreso general de un estudiante en un curso (alias para compatibilidad)
   * @param {number} usuarioId - ID del usuario
   * @param {number} cursoId - ID del curso
   * @returns {Promise<object>} - Progreso general con porcentaje y detalles
   */
  async getProgresoGeneralEstudianteCurso(usuarioId, cursoId) {
    try {
      return await this.getProgresoGeneral(usuarioId, cursoId);
    } catch (error) {
      logger.error('Error en getProgresoGeneralEstudianteCurso', error, { 
        usuarioId,
        cursoId,
        message: error.message,
        code: error.code,
        detail: error.detail
      });
      // Retornar objeto con valores por defecto en lugar de lanzar error
      return {
        totalContenidos: 0,
        contenidosConProgreso: 0,
        progresoPromedio: 0,
        progresoPorcentaje: 0,
        completados: 0
      };
    }
  },

  /**
   * Obtener progreso de todos los estudiantes de un tutor (en todos sus cursos)
   * @param {number} tutorId - ID del tutor
   * @returns {Promise<Array>} - Lista de progresos con información de estudiantes y cursos
   */
  async getProgresoEstudiantesDeTutor(tutorId) {
    try {
      // Primero verificar si la columna tutor_id existe en curso
      let columnCheck;
      try {
        columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name='curso' AND column_name='tutor_id'
        `);
      } catch (checkError) {
        logger.warn('Error al verificar columna tutor_id:', checkError.message);
        return [];
      }
      
      if (columnCheck.rows.length === 0) {
        logger.warn('La columna tutor_id no existe en curso. Retornando array vacío.');
        return [];
      }
      
      // Verificar si hay cursos del tutor
      const cursosCheck = await pool.query(
        `SELECT COUNT(*) as total FROM curso WHERE tutor_id = $1`,
        [tutorId]
      );
      
      if (parseInt(cursosCheck.rows[0].total) === 0) {
        logger.debug('No hay cursos para este tutor. Retornando array vacío.');
        return [];
      }
      
      // Si no hay progreso, retornar array vacío sin error
      const progresoCheck = await pool.query(
        `SELECT COUNT(*) as total 
         FROM progreso p
         INNER JOIN curso c ON p.curso_id = c.id
         WHERE c.tutor_id = $1`,
        [tutorId]
      );
      
      if (parseInt(progresoCheck.rows[0].total) === 0) {
        logger.debug('No hay progreso registrado para los cursos de este tutor.');
        return [];
      }
      
      // Obtener progreso directamente con JOIN
      // Usar una consulta más simple que evite problemas con JOINs complejos
      const result = await pool.query(
        `SELECT 
          p.usuario_id as estudiante_id,
          COALESCE(u.nombre, 'Usuario desconocido') as estudiante_nombre,
          COALESCE(u.matricula, '') as estudiante_matricula,
          p.curso_id,
          COALESCE(c.nombre, 'Curso desconocido') as curso_nombre,
          p.contenido_id,
          COALESCE(cont.nombre, 'Contenido eliminado') as contenido_nombre,
          COALESCE(cont.tipo, 'desconocido') as contenido_tipo,
          COALESCE(p.avance, 0) as avance,
          COALESCE(p.completado, false) as completado,
          p.ts as fecha_progreso
        FROM progreso p
        INNER JOIN curso c ON p.curso_id = c.id AND c.tutor_id = $1
        LEFT JOIN usuario u ON p.usuario_id = u.id AND u.rol = 'estudiante'
        LEFT JOIN contenido cont ON p.contenido_id = cont.id
        WHERE p.usuario_id IS NOT NULL 
          AND p.curso_id IS NOT NULL 
          AND p.contenido_id IS NOT NULL
        ORDER BY COALESCE(u.nombre, ''), COALESCE(c.nombre, ''), p.ts DESC`,
        [tutorId]
      );
      
      logger.debug('Progresos obtenidos para tutor', { 
        tutorId, 
        count: result.rows.length
      });
      
      return result.rows;
    } catch (error) {
      logger.error('Error en getProgresoEstudiantesDeTutor', error, { 
        tutorId,
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        stack: error.stack
      });
      // Retornar array vacío en lugar de lanzar error
      return [];
    }
  },

  /**
   * Obtener progreso de estudiantes de un curso específico
   * @param {number} cursoId - ID del curso
   * @returns {Promise<Array>} - Lista de progresos con información de estudiantes
   */
  async getProgresoEstudiantesDeCurso(cursoId) {
    try {
      // Verificar si hay progreso para este curso
      const progresoCheck = await pool.query(
        `SELECT COUNT(*) as total FROM progreso WHERE curso_id = $1`,
        [cursoId]
      );
      
      if (parseInt(progresoCheck.rows[0].total) === 0) {
        logger.debug('No hay progreso registrado para este curso.');
        return [];
      }
      
      const result = await pool.query(
        `SELECT 
          p.usuario_id as estudiante_id,
          u.nombre as estudiante_nombre,
          u.matricula as estudiante_matricula,
          p.curso_id,
          c.nombre as curso_nombre,
          p.contenido_id,
          COALESCE(cont.nombre, 'Contenido eliminado') as contenido_nombre,
          COALESCE(cont.tipo, 'desconocido') as contenido_tipo,
          p.avance,
          p.completado,
          p.ts as fecha_progreso
        FROM progreso p
        INNER JOIN usuario u ON p.usuario_id = u.id AND u.rol = 'estudiante'
        INNER JOIN curso c ON p.curso_id = c.id
        LEFT JOIN contenido cont ON p.contenido_id = cont.id
        WHERE p.curso_id = $1
          AND p.usuario_id IS NOT NULL 
          AND p.contenido_id IS NOT NULL
        ORDER BY u.nombre, p.ts DESC`,
        [cursoId]
      );
      
      logger.debug('Progresos obtenidos para curso', { 
        cursoId, 
        count: result.rows.length 
      });
      
      return result.rows;
    } catch (error) {
      logger.error('Error en getProgresoEstudiantesDeCurso', error, { 
        cursoId,
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        stack: error.stack
      });
      // Retornar array vacío en lugar de lanzar error
      return [];
    }
  }
};

module.exports = Progreso;

