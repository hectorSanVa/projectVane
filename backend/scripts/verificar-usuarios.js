const pool = require('../config/database');
require('dotenv').config();

(async () => {
  try {
    console.log('Verificando usuarios en la base de datos...\n');
    
    const usuarios = await pool.query(`
      SELECT id, matricula, rol, nombre, email 
      FROM usuario 
      ORDER BY id
    `);
    
    console.log(`Usuarios encontrados: ${usuarios.rows.length}\n`);
    console.log('Credenciales de acceso:');
    console.log('========================\n');
    
    usuarios.rows.forEach(user => {
      console.log(`Matrícula: ${user.matricula}`);
      console.log(`Rol: ${user.rol}`);
      console.log(`Nombre: ${user.nombre || 'Sin nombre'}`);
      
      // Mostrar contraseña según el rol
      if (user.rol === 'tutor') {
        console.log('Contraseña: tutor123');
      } else if (user.rol === 'estudiante') {
        console.log('Contraseña: estudiante123');
      }
      
      console.log('---\n');
    });
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();

