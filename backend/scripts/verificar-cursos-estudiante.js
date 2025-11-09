/**
 * Script para verificar los cursos asignados a un estudiante
 */

const pool = require('../config/database');
require('dotenv').config();
const logger = require('../utils/logger');

(async () => {
  try {
    logger.info('Verificando cursos asignados a estudiantes...');

    // Obtener todos los estudiantes
    const estudiantesResult = await pool.query(`
      SELECT id, matricula, nombre 
      FROM usuario 
      WHERE rol = 'estudiante'
      ORDER BY matricula
    `);

    if (estudiantesResult.rows.length === 0) {
      logger.info('No se encontraron estudiantes en la base de datos');
      await pool.end();
      process.exit(0);
    }

    logger.info(`Estudiantes encontrados: ${estudiantesResult.rows.length}`);

    for (const estudiante of estudiantesResult.rows) {
      logger.info(`\n--- Estudiante: ${estudiante.matricula} (ID: ${estudiante.id}) ---`);

      // Verificar asignaciones en curso_estudiante
      const asignacionesResult = await pool.query(`
        SELECT ce.*, c.nombre as curso_nombre, c.tutor_id
        FROM curso_estudiante ce
        JOIN curso c ON ce.curso_id = c.id
        WHERE ce.estudiante_id = $1
        ORDER BY ce.fecha_inscripcion
      `, [estudiante.id]);

      logger.info(`Asignaciones totales: ${asignacionesResult.rows.length}`);
      
      asignacionesResult.rows.forEach(asignacion => {
        logger.info(`  - Curso: ${asignacion.curso_nombre} (ID: ${asignacion.curso_id})`);
        logger.info(`    Activo: ${asignacion.activo}`);
        logger.info(`    Fecha inscripción: ${asignacion.fecha_inscripcion}`);
        logger.info(`    Tutor ID: ${asignacion.tutor_id}`);
      });

      // Probar la consulta que usa getCursosDeEstudiante
      logger.info('\nProbando consulta getCursosDeEstudiante...');
      try {
        // Verificar si la columna tutor_id existe
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'curso' AND column_name = 'tutor_id'
        `);

        logger.info(`Columna tutor_id existe: ${columnCheck.rows.length > 0}`);

        let query;
        if (columnCheck.rows.length > 0) {
          query = `SELECT c.id, c.nombre, c.descripcion, c.created_at, c.tutor_id, 
                          u.nombre as tutor_nombre
                   FROM curso c
                   JOIN curso_estudiante ce ON c.id = ce.curso_id
                   LEFT JOIN usuario u ON c.tutor_id = u.id
                   WHERE ce.estudiante_id = $1 AND ce.activo = TRUE
                   ORDER BY c.nombre`;
        } else {
          query = `SELECT c.id, c.nombre, c.descripcion, c.created_at, 
                          NULL as tutor_id, NULL as tutor_nombre
                   FROM curso c
                   JOIN curso_estudiante ce ON c.id = ce.curso_id
                   WHERE ce.estudiante_id = $1 AND ce.activo = TRUE
                   ORDER BY c.nombre`;
        }

        const result = await pool.query(query, [estudiante.id]);
        logger.info(`Cursos obtenidos: ${result.rows.length}`);
        
        result.rows.forEach(curso => {
          logger.info(`  - ${curso.nombre} (ID: ${curso.id})`);
          logger.info(`    Tutor: ${curso.tutor_nombre || 'N/A'} (ID: ${curso.tutor_id || 'N/A'})`);
        });

        if (result.rows.length === 0) {
          logger.warn('  No hay cursos activos asignados a este estudiante');
        }
      } catch (error) {
        logger.error('Error al ejecutar consulta', error, {
          message: error.message,
          code: error.code,
          detail: error.detail,
          hint: error.hint,
          position: error.position
        });
      }
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    logger.error('Error en verificación', error);
    await pool.end();
    process.exit(1);
  }
})();


