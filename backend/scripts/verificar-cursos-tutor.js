/**
 * Script para verificar los cursos asignados a un tutor
 */

const pool = require('../config/database');

async function verificarCursosTutor() {
  try {
    console.log('Verificando cursos del tutor...\n');

    // Obtener ID del tutor
    const tutorResult = await pool.query(`
      SELECT id, matricula, nombre FROM usuario WHERE matricula = 'tutor01' AND rol = 'tutor' LIMIT 1
    `);

    if (tutorResult.rows.length === 0) {
      console.error('No se encontró el tutor con matrícula tutor01');
      process.exit(1);
    }

    const tutorId = tutorResult.rows[0].id;
    console.log(`Tutor encontrado:`);
    console.log(`  ID: ${tutorId}`);
    console.log(`  Matrícula: ${tutorResult.rows[0].matricula}`);
    console.log(`  Nombre: ${tutorResult.rows[0].nombre}\n`);

    // Verificar si la columna tutor_id existe
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='curso' AND column_name='tutor_id'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('⚠️  La columna tutor_id NO existe en la tabla curso');
    } else {
      console.log('✅ La columna tutor_id existe en la tabla curso\n');
    }

    // Obtener cursos del tutor
    const cursosResult = await pool.query(`
      SELECT c.*, COUNT(ce.estudiante_id) as num_estudiantes
      FROM curso c
      LEFT JOIN curso_estudiante ce ON c.id = ce.curso_id AND ce.activo = TRUE
      WHERE c.tutor_id = $1
      GROUP BY c.id
      ORDER BY c.nombre
    `, [tutorId]);

    console.log(`Cursos encontrados: ${cursosResult.rows.length}\n`);

    if (cursosResult.rows.length === 0) {
      console.log('⚠️  El tutor no tiene cursos asignados.');
      
      // Verificar si hay cursos sin tutor
      const cursosSinTutor = await pool.query(`
        SELECT id, nombre FROM curso WHERE tutor_id IS NULL
      `);
      
      if (cursosSinTutor.rows.length > 0) {
        console.log(`\n📚 Hay ${cursosSinTutor.rows.length} curso(s) sin tutor asignado:`);
        cursosSinTutor.rows.forEach(curso => {
          console.log(`   - ${curso.nombre} (ID: ${curso.id})`);
        });
        console.log('\n💡 Ejecuta: npm run asignar-cursos-tutor');
      }
    } else {
      console.log('Cursos del tutor:');
      cursosResult.rows.forEach(curso => {
        console.log(`  - ${curso.nombre} (ID: ${curso.id})`);
        console.log(`    Descripción: ${curso.descripcion || 'Sin descripción'}`);
        console.log(`    Estudiantes: ${curso.num_estudiantes || 0}`);
        console.log(`    Tutor ID: ${curso.tutor_id}`);
        console.log('');
      });
    }

    // Verificar todos los cursos
    const todosCursos = await pool.query(`
      SELECT id, nombre, tutor_id FROM curso ORDER BY id
    `);
    
    console.log(`\nTotal de cursos en el sistema: ${todosCursos.rows.length}`);
    todosCursos.rows.forEach(curso => {
      console.log(`  - ${curso.nombre} (ID: ${curso.id}, Tutor ID: ${curso.tutor_id || 'NULL'})`);
    });

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

verificarCursosTutor();

