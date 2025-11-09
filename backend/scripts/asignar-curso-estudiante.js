/**
 * Script para asignar el curso de ejemplo al estudiante de ejemplo
 */

const pool = require('../config/database');
require('dotenv').config();

(async () => {
  try {
    console.log('Asignando curso al estudiante...');

    // Obtener el estudiante
    const estudianteResult = await pool.query(`
      SELECT id, matricula FROM usuario WHERE matricula = 'estudiante01' LIMIT 1
    `);

    if (estudianteResult.rows.length === 0) {
      console.error('No se encontró el estudiante con matrícula estudiante01');
      await pool.end();
      process.exit(1);
    }

    const estudianteId = estudianteResult.rows[0].id;
    console.log(`Estudiante encontrado: ${estudianteResult.rows[0].matricula} (ID: ${estudianteId})`);

    // Obtener todos los cursos del tutor
    const tutorResult = await pool.query(`
      SELECT id FROM usuario WHERE matricula = 'tutor01' LIMIT 1
    `);

    if (tutorResult.rows.length === 0) {
      console.error('No se encontró el tutor con matrícula tutor01');
      await pool.end();
      process.exit(1);
    }

    const tutorId = tutorResult.rows[0].id;
    console.log(`Tutor encontrado (ID: ${tutorId})`);

    // Obtener cursos del tutor
    const cursosResult = await pool.query(`
      SELECT id, nombre FROM curso WHERE tutor_id = $1
    `, [tutorId]);

    if (cursosResult.rows.length === 0) {
      console.log('No se encontraron cursos del tutor. Intentando obtener todos los cursos...');
      const todosCursosResult = await pool.query(`
        SELECT id, nombre FROM curso ORDER BY id LIMIT 5
      `);
      cursosResult.rows = todosCursosResult.rows;
    }

    if (cursosResult.rows.length === 0) {
      console.error('No se encontraron cursos en la base de datos');
      await pool.end();
      process.exit(1);
    }

    console.log(`Cursos encontrados: ${cursosResult.rows.length}`);

    // Asignar cada curso al estudiante
    for (const curso of cursosResult.rows) {
      console.log(`\nAsignando curso: ${curso.nombre} (ID: ${curso.id})`);

      // Verificar si ya está asignado
      const asignacionExistente = await pool.query(`
        SELECT id, activo FROM curso_estudiante 
        WHERE curso_id = $1 AND estudiante_id = $2
      `, [curso.id, estudianteId]);

      if (asignacionExistente.rows.length > 0) {
        const asignacion = asignacionExistente.rows[0];
        if (asignacion.activo) {
          console.log('  El curso ya estaba asignado y activo');
        } else {
          // Activar la asignación
          await pool.query(`
            UPDATE curso_estudiante SET activo = TRUE
            WHERE curso_id = $1 AND estudiante_id = $2
          `, [curso.id, estudianteId]);
          console.log('  Asignación activada');
        }
      } else {
        // Crear nueva asignación
        await pool.query(`
          INSERT INTO curso_estudiante (curso_id, estudiante_id, activo)
          VALUES ($1, $2, TRUE)
        `, [curso.id, estudianteId]);
        console.log('  Curso asignado exitosamente');
      }
    }

    // Verificar las asignaciones finales
    const asignacionesFinales = await pool.query(`
      SELECT c.id, c.nombre, ce.activo
      FROM curso c
      JOIN curso_estudiante ce ON c.id = ce.curso_id
      WHERE ce.estudiante_id = $1 AND ce.activo = TRUE
      ORDER BY c.nombre
    `, [estudianteId]);

    console.log(`\n✅ Asignaciones completadas. Total de cursos asignados: ${asignacionesFinales.rows.length}`);
    asignacionesFinales.rows.forEach(a => {
      console.log(`  - ${a.nombre} (ID: ${a.id})`);
    });

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error al asignar curso:', error);
    await pool.end();
    process.exit(1);
  }
})();


