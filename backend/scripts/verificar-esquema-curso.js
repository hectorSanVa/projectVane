/**
 * Script para verificar y corregir el esquema de la tabla curso
 * Verifica si existe la columna tutor_id y la agrega si es necesario
 */

const pool = require('../config/database');
require('dotenv').config();
const logger = require('../utils/logger');

(async () => {
  try {
    logger.info('Verificando esquema de la tabla curso...');

    // Verificar si existe la columna tutor_id
    const checkColumn = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'curso' AND column_name = 'tutor_id'
    `);

    if (checkColumn.rows.length === 0) {
      logger.info('La columna tutor_id no existe. Agregándola...');
      
      // Agregar columna tutor_id
      await pool.query(`
        ALTER TABLE curso 
        ADD COLUMN tutor_id INTEGER REFERENCES usuario(id) ON DELETE SET NULL
      `);
      
      logger.info('Columna tutor_id agregada exitosamente');
    } else {
      logger.info('La columna tutor_id ya existe', { 
        data_type: checkColumn.rows[0].data_type,
        is_nullable: checkColumn.rows[0].is_nullable
      });
    }

    // Verificar todas las columnas de la tabla curso
    const allColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'curso'
      ORDER BY ordinal_position
    `);

    logger.info('Columnas de la tabla curso:', { 
      columns: allColumns.rows.map(c => ({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable
      }))
    });

    // Probar la consulta que está fallando
    logger.info('Probando consulta getCursosDeEstudiante...');
    try {
      // Obtener un estudiante de prueba
      const estudianteResult = await pool.query(`
        SELECT id FROM usuario WHERE rol = 'estudiante' LIMIT 1
      `);
      
      if (estudianteResult.rows.length > 0) {
        const estudianteId = estudianteResult.rows[0].id;
        logger.info('Probando con estudiante ID:', { estudianteId });
        
        const testResult = await pool.query(
          `SELECT c.id, c.nombre, c.descripcion, c.created_at, c.tutor_id, 
                  u.nombre as tutor_nombre
           FROM curso c
           JOIN curso_estudiante ce ON c.id = ce.curso_id
           LEFT JOIN usuario u ON c.tutor_id = u.id
           WHERE ce.estudiante_id = $1 AND ce.activo = TRUE
           ORDER BY c.nombre
           LIMIT 5`,
          [estudianteId]
        );
        
        logger.info('Consulta exitosa. Resultados:', { 
          count: testResult.rows.length,
          cursos: testResult.rows.map(c => ({
            id: c.id,
            nombre: c.nombre,
            tutor_id: c.tutor_id,
            tutor_nombre: c.tutor_nombre
          }))
        });
      } else {
        logger.warn('No se encontraron estudiantes en la base de datos');
      }
    } catch (error) {
      logger.error('Error al probar la consulta', error, {
        message: error.message,
        code: error.code,
        detail: error.detail
      });
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    logger.error('Error al verificar esquema', error);
    await pool.end();
    process.exit(1);
  }
})();




