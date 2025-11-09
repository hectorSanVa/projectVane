const pool = require('../config/database');
require('dotenv').config();

(async () => {
  try {
    console.log('Verificando cuestionarios...\n');
    
    // Obtener contenidos tipo quiz
    const quizContents = await pool.query(`
      SELECT id, nombre, curso_id 
      FROM contenido 
      WHERE tipo = 'quiz'
    `);
    
    console.log(`Cuestionarios encontrados: ${quizContents.rows.length}\n`);
    
    for (const quiz of quizContents.rows) {
      console.log(`Quiz: ${quiz.nombre} (ID: ${quiz.id})`);
      
      const preguntas = await pool.query(`
        SELECT p.id, p.texto, p.tipo, p.puntaje,
               COUNT(o.id) as opciones_count
        FROM pregunta p
        LEFT JOIN opcion o ON p.id = o.pregunta_id
        WHERE p.contenido_id = $1
        GROUP BY p.id
        ORDER BY p.orden
      `, [quiz.id]);
      
      console.log(`  Preguntas: ${preguntas.rows.length}`);
      preguntas.rows.forEach((p, index) => {
        console.log(`    ${index + 1}. ${p.texto}`);
        console.log(`       Tipo: ${p.tipo}, Puntaje: ${p.puntaje}, Opciones: ${p.opciones_count}`);
      });
      console.log('');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();

