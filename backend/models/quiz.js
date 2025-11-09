const pool = require('../config/database');
const logger = require('../utils/logger');

/**
 * Modelo para gestión de cuestionarios (quizzes)
 */
const Quiz = {
  /**
   * Obtener preguntas de un contenido (quiz)
   * @param {number} contenidoId - ID del contenido tipo quiz
   * @returns {Promise<Array>} - Lista de preguntas con sus opciones
   */
  async getPreguntas(contenidoId) {
    try {
      const result = await pool.query(
        `SELECT p.*, 
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id', o.id,
                      'texto', o.texto,
                      'es_correcta', o.es_correcta,
                      'orden', o.orden
                    ) ORDER BY o.orden
                  ) FILTER (WHERE o.id IS NOT NULL),
                  '[]'
                ) as opciones
         FROM pregunta p
         LEFT JOIN opcion o ON p.id = o.pregunta_id
         WHERE p.contenido_id = $1
         GROUP BY p.id
         ORDER BY p.orden, p.id`,
        [contenidoId]
      );
      
      return result.rows.map(row => ({
        ...row,
        opciones: row.opciones || []
      }));
    } catch (error) {
      logger.error('Error en getPreguntas', error, { contenidoId });
      throw error;
    }
  },

  /**
   * Obtener el número de intento actual para un cuestionario
   * @param {number} usuarioId - ID del usuario
   * @param {number} contenidoId - ID del contenido (quiz)
   * @returns {Promise<number>} - Número de intento (1, 2, o 3)
   */
  async obtenerNumeroIntento(usuarioId, contenidoId) {
    try {
      // Obtener el máximo número de intento para este usuario y contenido
      const result = await pool.query(
        `SELECT COALESCE(MAX(r.numero_intento), 0) as max_intento
         FROM respuesta r
         JOIN pregunta p ON r.pregunta_id = p.id
         WHERE r.usuario_id = $1 AND p.contenido_id = $2`,
        [usuarioId, contenidoId]
      );
      
      const maxIntento = parseInt(result.rows[0]?.max_intento || 0);
      
      // Si ya tiene 3 intentos, retornar 3 (no permitir más)
      if (maxIntento >= 3) {
        return 3;
      }
      
      // Retornar el siguiente intento (maxIntento + 1)
      return maxIntento + 1;
    } catch (error) {
      logger.error('Error en obtenerNumeroIntento', error, { usuarioId, contenidoId });
      throw error;
    }
  },

  /**
   * Contar intentos realizados para un cuestionario
   * @param {number} usuarioId - ID del usuario
   * @param {number} contenidoId - ID del contenido (quiz)
   * @returns {Promise<number>} - Número de intentos realizados
   */
  async contarIntentos(usuarioId, contenidoId) {
    try {
      const result = await pool.query(
        `SELECT COUNT(DISTINCT r.numero_intento) as total_intentos
         FROM respuesta r
         JOIN pregunta p ON r.pregunta_id = p.id
         WHERE r.usuario_id = $1 AND p.contenido_id = $2`,
        [usuarioId, contenidoId]
      );
      
      return parseInt(result.rows[0]?.total_intentos || 0);
    } catch (error) {
      logger.error('Error en contarIntentos', error, { usuarioId, contenidoId });
      throw error;
    }
  },

  /**
   * Guardar respuestas de un quiz
   * @param {number} usuarioId - ID del usuario
   * @param {number} contenidoId - ID del contenido (quiz)
   * @param {Array} respuestas - Array de respuestas
   * @returns {Promise<object>} - Resultado con respuestas guardadas y número de intento
   */
  async guardarRespuestas(usuarioId, contenidoId, respuestas) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Obtener el número de intento
      const numeroIntento = await this.obtenerNumeroIntento(usuarioId, contenidoId);
      
      // Verificar que no se exceda el límite de 3 intentos
      if (numeroIntento > 3) {
        throw new Error('Se ha alcanzado el límite máximo de 3 intentos para este cuestionario');
      }
      
      const resultados = [];
      for (const respuesta of respuestas) {
        let esCorrecta = false;
        
        if (respuesta.opcion_id) {
          // Verificar si la opción es correcta
          const opcionResult = await client.query(
            'SELECT es_correcta FROM opcion WHERE id = $1',
            [respuesta.opcion_id]
          );
          if (opcionResult.rows.length > 0) {
            esCorrecta = opcionResult.rows[0].es_correcta;
          }
        }
        
        const result = await client.query(
          `INSERT INTO respuesta (usuario_id, pregunta_id, opcion_id, texto_respuesta, es_correcta, numero_intento)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [usuarioId, respuesta.pregunta_id, respuesta.opcion_id || null, respuesta.texto || null, esCorrecta, numeroIntento]
        );
        resultados.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      logger.debug('Respuestas guardadas', { usuarioId, contenidoId, numeroIntento, count: resultados.length });
      return { resultados, numeroIntento };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error en guardarRespuestas', error, { usuarioId, contenidoId, count: respuestas.length });
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Obtener resultados de un quiz con todas las opciones (para mostrar respuestas correctas)
   * @param {number} usuarioId - ID del usuario
   * @param {number} contenidoId - ID del contenido tipo quiz
   * @param {number} numeroIntento - Número de intento específico (opcional, si no se proporciona retorna el mejor)
   * @returns {Promise<Array>} - Lista de respuestas con detalles y opciones correctas
   */
  async getResultados(usuarioId, contenidoId, numeroIntento = null) {
    try {
      let query;
      let params;
      
      if (numeroIntento) {
        // Obtener respuestas de un intento específico
        query = `
          SELECT r.*, p.texto as pregunta_texto, p.tipo as pregunta_tipo, p.puntaje, p.orden as pregunta_orden,
                 o.texto as opcion_texto_seleccionada, o.id as opcion_id_seleccionada
          FROM respuesta r
          JOIN pregunta p ON r.pregunta_id = p.id
          LEFT JOIN opcion o ON r.opcion_id = o.id
          WHERE r.usuario_id = $1 AND p.contenido_id = $2 AND r.numero_intento = $3
          ORDER BY p.orden, p.id
        `;
        params = [usuarioId, contenidoId, numeroIntento];
      } else {
        // Obtener respuestas del mejor intento (mayor calificación)
        const mejorIntentoResult = await pool.query(
          `WITH intentos AS (
            SELECT 
              r.numero_intento,
              SUM(CASE WHEN r.es_correcta THEN p.puntaje ELSE 0 END) as puntaje_obtenido,
              SUM(p.puntaje) as puntaje_total
            FROM pregunta p
            LEFT JOIN respuesta r ON p.id = r.pregunta_id AND r.usuario_id = $1
            WHERE p.contenido_id = $2
            GROUP BY r.numero_intento
          )
          SELECT numero_intento
          FROM intentos
          ORDER BY (puntaje_obtenido / NULLIF(puntaje_total, 0)) DESC
          LIMIT 1`,
          [usuarioId, contenidoId]
        );
        
        const mejorIntento = mejorIntentoResult.rows[0]?.numero_intento || 1;
        
        query = `
          SELECT r.*, p.texto as pregunta_texto, p.tipo as pregunta_tipo, p.puntaje, p.orden as pregunta_orden,
                 o.texto as opcion_texto_seleccionada, o.id as opcion_id_seleccionada
          FROM respuesta r
          JOIN pregunta p ON r.pregunta_id = p.id
          LEFT JOIN opcion o ON r.opcion_id = o.id
          WHERE r.usuario_id = $1 AND p.contenido_id = $2 AND r.numero_intento = $3
          ORDER BY p.orden, p.id
        `;
        params = [usuarioId, contenidoId, mejorIntento];
      }
      
      const respuestasResult = await pool.query(query, params);
      
      // Obtener todas las opciones de cada pregunta para mostrar las correctas
      const resultados = [];
      for (const respuesta of respuestasResult.rows) {
        const opcionesResult = await pool.query(
          `SELECT id, texto, es_correcta, orden
           FROM opcion
           WHERE pregunta_id = $1
           ORDER BY orden, id`,
          [respuesta.pregunta_id]
        );
        
        resultados.push({
          ...respuesta,
          opciones: opcionesResult.rows,
          opcion_seleccionada: {
            id: respuesta.opcion_id_seleccionada,
            texto: respuesta.opcion_texto_seleccionada
          }
        });
      }
      
      return resultados;
    } catch (error) {
      logger.error('Error en getResultados', error, { usuarioId, contenidoId, numeroIntento });
      throw error;
    }
  },

  /**
   * Calcular calificación de un quiz (mejor intento o intento específico)
   * @param {number} usuarioId - ID del usuario
   * @param {number} contenidoId - ID del contenido tipo quiz
   * @param {number} numeroIntento - Número de intento específico (opcional, si no se proporciona retorna el mejor)
   * @returns {Promise<object>} - Calificación con porcentaje y puntajes
   */
  async calcularCalificacion(usuarioId, contenidoId, numeroIntento = null) {
    try {
      let query;
      let params;
      
      if (numeroIntento) {
        // Calcular calificación de un intento específico
        query = `
          SELECT 
             COUNT(*) as total_preguntas,
             SUM(CASE WHEN r.es_correcta THEN p.puntaje ELSE 0 END) as puntaje_obtenido,
             SUM(p.puntaje) as puntaje_total
           FROM pregunta p
           LEFT JOIN respuesta r ON p.id = r.pregunta_id 
             AND r.usuario_id = $1 
             AND r.numero_intento = $3
           WHERE p.contenido_id = $2
        `;
        params = [usuarioId, contenidoId, numeroIntento];
      } else {
        // Calcular la mejor calificación de todos los intentos
        query = `
          WITH intentos AS (
            SELECT 
              r.numero_intento,
              COUNT(*) as total_preguntas,
              SUM(CASE WHEN r.es_correcta THEN p.puntaje ELSE 0 END) as puntaje_obtenido,
              SUM(p.puntaje) as puntaje_total
            FROM pregunta p
            LEFT JOIN respuesta r ON p.id = r.pregunta_id AND r.usuario_id = $1
            WHERE p.contenido_id = $2
            GROUP BY r.numero_intento
          ),
          mejor_intento AS (
            SELECT 
              numero_intento,
              total_preguntas,
              puntaje_obtenido,
              puntaje_total,
              (puntaje_obtenido / NULLIF(puntaje_total, 0) * 100) as porcentaje
            FROM intentos
            ORDER BY porcentaje DESC
            LIMIT 1
          )
          SELECT * FROM mejor_intento
        `;
        params = [usuarioId, contenidoId];
        
        // Si no hay intentos, usar el método anterior
        const result = await pool.query(query, params);
        if (result.rows.length > 0) {
          const row = result.rows[0];
          return {
            total_preguntas: parseInt(row.total_preguntas),
            puntaje_obtenido: parseFloat(row.puntaje_obtenido || 0),
            puntaje_total: parseFloat(row.puntaje_total || 0),
            porcentaje: Math.round(parseFloat(row.porcentaje || 0) * 100) / 100,
            numero_intento: parseInt(row.numero_intento)
          };
        }
        
        // Si no hay intentos, retornar 0
        return { total_preguntas: 0, puntaje_obtenido: 0, puntaje_total: 0, porcentaje: 0, numero_intento: 0 };
      }
      
      const result = await pool.query(query, params);
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        const porcentaje = row.puntaje_total > 0 
          ? (row.puntaje_obtenido / row.puntaje_total) * 100 
          : 0;
        
        return {
          total_preguntas: parseInt(row.total_preguntas),
          puntaje_obtenido: parseFloat(row.puntaje_obtenido || 0),
          puntaje_total: parseFloat(row.puntaje_total || 0),
          porcentaje: Math.round(porcentaje * 100) / 100,
          numero_intento: numeroIntento || null
        };
      }
      
      return { total_preguntas: 0, puntaje_obtenido: 0, puntaje_total: 0, porcentaje: 0, numero_intento: numeroIntento || 0 };
    } catch (error) {
      logger.error('Error en calcularCalificacion', error, { usuarioId, contenidoId, numeroIntento });
      throw error;
    }
  },

  /**
   * Obtener calificaciones de estudiantes de un tutor (en todos sus cursos)
   * @param {number} tutorId - ID del tutor
   * @returns {Promise<Array>} - Lista de calificaciones con información de estudiantes y cursos
   */
  async getCalificacionesEstudiantesDeTutor(tutorId) {
    try {
      // Verificar si la columna tutor_id existe
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
      
      // Verificar si hay respuestas para cursos del tutor
      const respuestaCheck = await pool.query(
        `SELECT COUNT(*) as total
         FROM respuesta r
         INNER JOIN pregunta p ON r.pregunta_id = p.id
         INNER JOIN contenido cont ON p.contenido_id = cont.id AND cont.tipo = 'quiz'
         INNER JOIN curso c ON cont.curso_id = c.id
         WHERE c.tutor_id = $1`,
        [tutorId]
      );
      
      if (parseInt(respuestaCheck.rows[0].total) === 0) {
        logger.debug('No hay respuestas de quizzes para los cursos de este tutor.');
        return [];
      }
      
      const result = await pool.query(
        `SELECT 
           r.usuario_id,
           u.matricula,
           u.nombre as estudiante_nombre,
           c.id as curso_id,
           c.nombre as curso_nombre,
           cont.id as contenido_id,
           cont.nombre as contenido_nombre,
           COUNT(DISTINCT p.id) as total_preguntas,
           COALESCE(SUM(CASE WHEN r.es_correcta THEN p.puntaje ELSE 0 END), 0) as puntaje_obtenido,
           COALESCE(SUM(p.puntaje), 0) as puntaje_total,
           MAX(r.ts) as fecha_examen
         FROM respuesta r
         INNER JOIN pregunta p ON r.pregunta_id = p.id
         INNER JOIN contenido cont ON p.contenido_id = cont.id AND cont.tipo = 'quiz'
         INNER JOIN curso c ON cont.curso_id = c.id AND c.tutor_id = $1
         INNER JOIN usuario u ON r.usuario_id = u.id AND u.rol = 'estudiante'
         WHERE r.usuario_id IS NOT NULL
           AND r.pregunta_id IS NOT NULL
         GROUP BY r.usuario_id, u.matricula, u.nombre, c.id, c.nombre, cont.id, cont.nombre
         HAVING COUNT(DISTINCT p.id) > 0
         ORDER BY MAX(r.ts) DESC, u.nombre, c.nombre`,
        [tutorId]
      );
      
      logger.debug('Calificaciones obtenidas para tutor', { 
        tutorId, 
        count: result.rows.length 
      });
      
      // Calcular porcentajes
      return result.rows.map(row => {
        const puntajeTotal = parseFloat(row.puntaje_total) || 0;
        const puntajeObtenido = parseFloat(row.puntaje_obtenido) || 0;
        const porcentaje = puntajeTotal > 0 
          ? (puntajeObtenido / puntajeTotal) * 100 
          : 0;
        return {
          ...row,
          porcentaje: Math.round(porcentaje * 100) / 100,
          puntaje_obtenido: puntajeObtenido,
          puntaje_total: puntajeTotal
        };
      });
    } catch (error) {
      logger.error('Error en getCalificacionesEstudiantesDeTutor', error, { 
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
   * Obtener calificaciones de estudiantes de un curso específico
   * @param {number} cursoId - ID del curso
   * @returns {Promise<Array>} - Lista de calificaciones
   */
  async getCalificacionesEstudiantesDeCurso(cursoId) {
    try {
      const result = await pool.query(
        `SELECT 
           r.usuario_id,
           u.matricula,
           u.nombre as estudiante_nombre,
           cont.id as contenido_id,
           cont.nombre as contenido_nombre,
           COUNT(DISTINCT p.id) as total_preguntas,
           SUM(CASE WHEN r.es_correcta THEN p.puntaje ELSE 0 END) as puntaje_obtenido,
           SUM(p.puntaje) as puntaje_total,
           MAX(r.ts) as fecha_examen
         FROM respuesta r
         JOIN pregunta p ON r.pregunta_id = p.id
         JOIN contenido cont ON p.contenido_id = cont.id
         JOIN usuario u ON r.usuario_id = u.id
         WHERE cont.curso_id = $1
         GROUP BY r.usuario_id, u.matricula, u.nombre, cont.id, cont.nombre
         ORDER BY u.nombre, cont.nombre`,
        [cursoId]
      );
      
      // Calcular porcentajes
      return result.rows.map(row => {
        const porcentaje = row.puntaje_total > 0 
          ? (row.puntaje_obtenido / row.puntaje_total) * 100 
          : 0;
        return {
          ...row,
          porcentaje: Math.round(porcentaje * 100) / 100
        };
      });
    } catch (error) {
      logger.error('Error en getCalificacionesEstudiantesDeCurso', error, { cursoId });
      throw error;
    }
  }
};

module.exports = Quiz;

