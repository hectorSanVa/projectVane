const pool = require('../config/database');
require('dotenv').config();

(async () => {
  try {
    console.log('Verificando tutores y sus cursos...\n');
    
    // Verificar tutores
    const tutores = await pool.query(`
      SELECT u.id, u.nombre, u.matricula, u.email
      FROM usuario u
      WHERE u.rol = 'tutor'
      ORDER BY u.nombre, u.matricula
    `);
    
    console.log(`Tutores encontrados: ${tutores.rows.length}\n`);
    
    if (tutores.rows.length === 0) {
      console.log('⚠️  No hay tutores en la base de datos.');
      console.log('   Ejecuta: npm run init-db\n');
      await pool.end();
      process.exit(0);
    }
    
    // Para cada tutor, verificar sus cursos
    for (const tutor of tutores.rows) {
      console.log(`Tutor: ${tutor.nombre || tutor.matricula} (${tutor.matricula})`);
      console.log(`  ID: ${tutor.id}`);
      console.log(`  Email: ${tutor.email || 'Sin email'}`);
      
      const cursos = await pool.query(`
        SELECT c.id, c.nombre, c.descripcion, c.tutor_id
        FROM curso c
        WHERE c.tutor_id = $1
        ORDER BY c.nombre
      `, [tutor.id]);
      
      console.log(`  Cursos: ${cursos.rows.length}`);
      if (cursos.rows.length > 0) {
        cursos.rows.forEach(curso => {
          console.log(`    - ${curso.nombre} (ID: ${curso.id})`);
        });
      } else {
        console.log('    ⚠️  Este tutor no tiene cursos asignados');
      }
      console.log('');
    }
    
    // Verificar usuarios con rol admin (no deberían existir)
    const adminUsers = await pool.query(`
      SELECT id, matricula, nombre
      FROM usuario
      WHERE rol = 'admin'
    `);
    
    if (adminUsers.rows.length > 0) {
      console.log('⚠️  ADVERTENCIA: Se encontraron usuarios con rol "admin":');
      adminUsers.rows.forEach(admin => {
        console.log(`   - ${admin.matricula} (ID: ${admin.id})`);
      });
      console.log('\n   Estos usuarios no deberían existir. El sistema ya no usa el rol "admin".');
      console.log('   Puedes eliminarlos manualmente o ejecutar un script de limpieza.\n');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
})();




