/**
 * Script para asignar cursos existentes al tutor
 * Útil cuando se actualiza la base de datos y los cursos no tienen tutor_id
 */

const pool = require('../config/database');
const logger = require('../utils/logger');

async function asignarCursosTutor() {
  try {
    console.log('Verificando y asignando cursos al tutor...\n');

    // Obtener ID del tutor
    const tutorResult = await pool.query(`
      SELECT id FROM usuario WHERE matricula = 'tutor01' AND rol = 'tutor' LIMIT 1
    `);

    if (tutorResult.rows.length === 0) {
      console.error('No se encontró el tutor con matrícula tutor01');
      process.exit(1);
    }

    const tutorId = tutorResult.rows[0].id;
    console.log(`Tutor encontrado: ID ${tutorId}\n`);

    // Verificar si la columna tutor_id existe
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='curso' AND column_name='tutor_id'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('Agregando columna tutor_id a la tabla curso...');
      await pool.query(`
        ALTER TABLE curso 
        ADD COLUMN tutor_id INTEGER REFERENCES usuario(id) ON DELETE SET NULL
      `);
      console.log('Columna tutor_id agregada\n');
    } else {
      console.log('Columna tutor_id ya existe\n');
    }

    // Obtener cursos sin tutor asignado
    const cursosSinTutor = await pool.query(`
      SELECT id, nombre FROM curso WHERE tutor_id IS NULL
    `);

    if (cursosSinTutor.rows.length === 0) {
      console.log('Todos los cursos ya tienen tutor asignado.');
      
      // Verificar cursos del tutor
      const cursosTutor = await pool.query(`
        SELECT id, nombre FROM curso WHERE tutor_id = $1
      `, [tutorId]);

      if (cursosTutor.rows.length === 0) {
        console.log('\n⚠️  El tutor no tiene cursos asignados.');
        console.log('Creando curso de ejemplo...');
        
        const nuevoCurso = await pool.query(`
          INSERT INTO curso (nombre, descripcion, tutor_id)
          VALUES ('Matemáticas Básicas', 'Curso introductorio de matemáticas', $1)
          RETURNING id, nombre
        `, [tutorId]);
        
        console.log(`✅ Curso creado: ${nuevoCurso.rows[0].nombre} (ID: ${nuevoCurso.rows[0].id})`);
      } else {
        console.log(`\n✅ El tutor tiene ${cursosTutor.rows.length} curso(s) asignado(s):`);
        cursosTutor.rows.forEach(curso => {
          console.log(`   - ${curso.nombre} (ID: ${curso.id})`);
        });
      }
    } else {
      console.log(`Encontrados ${cursosSinTutor.rows.length} curso(s) sin tutor:`);
      cursosSinTutor.rows.forEach(curso => {
        console.log(`   - ${curso.nombre} (ID: ${curso.id})`);
      });

      // Asignar todos los cursos sin tutor al tutor01
      console.log('\nAsignando cursos al tutor...');
      const updateResult = await pool.query(`
        UPDATE curso 
        SET tutor_id = $1 
        WHERE tutor_id IS NULL
        RETURNING id, nombre
      `, [tutorId]);

      console.log(`\n✅ ${updateResult.rows.length} curso(s) asignado(s) al tutor:`);
      updateResult.rows.forEach(curso => {
        console.log(`   - ${curso.nombre} (ID: ${curso.id})`);
      });
    }

    console.log('\n✅ Proceso completado exitosamente');
    await pool.end();
    process.exit(0);
  } catch (error) {
    logger.error('Error al asignar cursos al tutor', error);
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

asignarCursosTutor();

