// Script para verificar el estado de la base de datos
const pool = require('../config/database');
require('dotenv').config();

const verificarBD = async () => {
  try {
    console.log('========================================');
    console.log('  VERIFICACION DE BASE DE DATOS');
    console.log('========================================\n');

    // Verificar conexión
    console.log('1. Verificando conexion...');
    const testQuery = await pool.query('SELECT NOW()');
    console.log('    Conexion exitosa\n');

    // Verificar tablas
    console.log('2. Verificando tablas...');
    const tablas = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log(`   Tablas encontradas: ${tablas.rows.length}`);
    tablas.rows.forEach(tabla => {
      console.log(`   - ${tabla.table_name}`);
    });
    console.log('');

    // Verificar usuarios
    console.log('3. Verificando usuarios...');
    const usuarios = await pool.query('SELECT matricula, rol, nombre FROM usuario');
    console.log(`   Usuarios encontrados: ${usuarios.rows.length}`);
    usuarios.rows.forEach(usuario => {
      console.log(`   - ${usuario.matricula} (${usuario.rol}): ${usuario.nombre}`);
    });
    console.log('');

    // Verificar cursos
    console.log('4. Verificando cursos...');
    const cursos = await pool.query('SELECT id, nombre, descripcion FROM curso');
    console.log(`   Cursos encontrados: ${cursos.rows.length}`);
    if (cursos.rows.length === 0) {
      console.log('     No hay cursos. Ejecuta: npm run init-db');
    } else {
      cursos.rows.forEach(curso => {
        console.log(`   - ${curso.nombre}: ${curso.descripcion || 'Sin descripción'}`);
      });
    }
    console.log('');

    // Verificar contenidos
    console.log('5. Verificando contenidos...');
    const contenidos = await pool.query('SELECT id, nombre, tipo, curso_id FROM contenido');
    console.log(`   Contenidos encontrados: ${contenidos.rows.length}`);
    if (contenidos.rows.length === 0) {
      console.log('     No hay contenidos.');
    } else {
      contenidos.rows.forEach(contenido => {
        console.log(`   - ${contenido.nombre} (${contenido.tipo}) - Curso ID: ${contenido.curso_id}`);
      });
    }
    console.log('');

    // Verificar progreso
    console.log('6. Verificando progreso...');
    const progreso = await pool.query('SELECT COUNT(*) as total FROM progreso');
    console.log(`   Registros de progreso: ${progreso.rows[0].total}`);
    console.log('');

    // Verificar mensajes de chat
    console.log('7. Verificando mensajes de chat...');
    const chat = await pool.query('SELECT COUNT(*) as total FROM chat_mensaje');
    console.log(`   Mensajes de chat: ${chat.rows[0].total}`);
    console.log('');

    console.log('========================================');
    console.log('  VERIFICACION COMPLETA');
    console.log('========================================\n');

    if (cursos.rows.length === 0) {
      console.log('  ADVERTENCIA: No hay cursos en la base de datos.');
      console.log('   Ejecuta: npm run init-db\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n ERROR:', error.message);
    console.error('\nVerifica que:');
    console.error('1. PostgreSQL esté ejecutándose');
    console.error('2. Las credenciales en .env sean correctas');
    console.error('3. La base de datos "kiosco_educativo" exista\n');
    process.exit(1);
  }
};

verificarBD();

