/**
 * Script de inicialización de la base de datos
 * 
 * Este script crea todas las tablas, índices y datos de prueba necesarios
 * para el funcionamiento del Kiosco Educativo.
 * 
 * CARACTERÍSTICAS:
 * - Crea la base de datos si no existe
 * - Crea todas las tablas con sus campos y restricciones
 * - Incluye soporte para múltiples intentos en cuestionarios (numero_intento)
 * - Crea índices para optimizar consultas
 * - Agrega usuarios de prueba (tutor y estudiante)
 * - Crea cursos y contenidos de ejemplo
 * 
 * NOTA: Si ya tienes una base de datos existente y necesitas agregar campos nuevos,
 * revisa los scripts de migración en este directorio (ej: add-intento-to-respuesta.js)
 * Ver README-MIGRACIONES.md para más información sobre migraciones.
 * 
 * USO: npm run init-db
 */
const { Pool } = require('pg');
require('dotenv').config();

const initDatabase = async () => {
  // Primero verificar que la base de datos existe
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres', // Conectar a la BD por defecto primero
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    console.log(' Verificando que la base de datos existe...');
    
    // Verificar si la base de datos existe
    const dbName = process.env.DB_NAME || 'kiosco_educativo';
    const checkDb = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (checkDb.rows.length === 0) {
      console.log(`\n La base de datos "${dbName}" no existe.`);
      console.log(' Intentando crearla automaticamente...\n');
      
      try {
        // Intentar crear la base de datos
        await adminPool.query(`CREATE DATABASE "${dbName}";`);
        console.log(` Base de datos "${dbName}" creada exitosamente!\n`);
      } catch (createError) {
        console.error('\n ERROR: No se pudo crear la base de datos automaticamente.');
        console.error(' Razón:', createError.message);
        console.error(`\n Por favor, crea la base de datos "${dbName}" manualmente:`);
        console.error('\n Opción 1 - Usando pgAdmin (más fácil):');
        console.error('   1. Abre pgAdmin');
        console.error('   2. Click derecho en "Databases" → "Create" → "Database"');
        console.error(`   3. Nombre: ${dbName}`);
        console.error('   4. Click en "Save"');
        console.error('\n Opción 2 - Usando línea de comandos:');
        console.error(`   psql -U ${process.env.DB_USER || 'postgres'} -c "CREATE DATABASE ${dbName};"`);
        console.error('\n Después de crear la base de datos, ejecuta este comando nuevamente.\n');
        await adminPool.end();
        process.exit(1);
      }
    }

    console.log(` Base de datos "${dbName}" encontrada\n`);
    await adminPool.end();

    // Ahora conectar a la base de datos correcta
    const pool = require('../config/database');

    console.log(' Inicializando base de datos...');
    console.log('   (Esto creará las tablas, índices y usuarios de prueba)\n');

    // Crear tabla de usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuario (
        id SERIAL PRIMARY KEY,
        matricula TEXT UNIQUE NOT NULL,
        hash TEXT NOT NULL,
        rol TEXT NOT NULL CHECK (rol IN ('estudiante', 'tutor')),
        nombre TEXT,
        email TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(' Tabla usuario creada');

    // Crear tabla de cursos
    // Primero crear sin tutor_id para compatibilidad con versiones anteriores
    await pool.query(`
      CREATE TABLE IF NOT EXISTS curso (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(' Tabla curso creada');

    // Agregar columna tutor_id si no existe (migración para bases existentes)
    // En nuevas instalaciones, esto se agregará automáticamente
    try {
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='curso' AND column_name='tutor_id') THEN
            ALTER TABLE curso ADD COLUMN tutor_id INTEGER REFERENCES usuario(id) ON DELETE SET NULL;
          END IF;
        END $$;
      `);
      console.log(' Columna tutor_id verificada/agregada a curso');
    } catch (error) {
      console.log(' Error al verificar columna tutor_id (puede que ya exista):', error.message);
    }

    // Crear tabla de asignaciones estudiante-curso
    await pool.query(`
      CREATE TABLE IF NOT EXISTS curso_estudiante (
        id SERIAL PRIMARY KEY,
        curso_id INTEGER REFERENCES curso(id) ON DELETE CASCADE,
        estudiante_id INTEGER REFERENCES usuario(id) ON DELETE CASCADE,
        fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activo BOOLEAN DEFAULT TRUE,
        UNIQUE(curso_id, estudiante_id)
      );
    `);
    console.log(' Tabla curso_estudiante creada');

    // Crear tabla de contenidos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contenido (
        id SERIAL PRIMARY KEY,
        curso_id INTEGER REFERENCES curso(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL CHECK (tipo IN ('pdf', 'video', 'texto', 'quiz')),
        url_local TEXT NOT NULL,
        nombre TEXT NOT NULL,
        peso_mb NUMERIC(10, 2),
        orden INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(' Tabla contenido creada');

    // Crear tabla de progreso
    await pool.query(`
      CREATE TABLE IF NOT EXISTS progreso (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuario(id) ON DELETE CASCADE,
        curso_id INTEGER REFERENCES curso(id) ON DELETE CASCADE,
        contenido_id INTEGER REFERENCES contenido(id) ON DELETE SET NULL,
        avance NUMERIC(5, 2) DEFAULT 0 CHECK (avance >= 0 AND avance <= 100),
        completado BOOLEAN DEFAULT FALSE,
        ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sincronizado BOOLEAN DEFAULT FALSE,
        UNIQUE(usuario_id, curso_id, contenido_id)
      );
    `);
    console.log(' Tabla progreso creada');

    // Crear tabla de chat_mensaje
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_mensaje (
        id SERIAL PRIMARY KEY,
        room TEXT NOT NULL,
        usuario_id INTEGER REFERENCES usuario(id) ON DELETE CASCADE,
        texto TEXT NOT NULL,
        ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        leido BOOLEAN DEFAULT FALSE
      );
    `);
    console.log(' Tabla chat_mensaje creada');

    // Crear tabla de pregunta (para cuestionarios)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pregunta (
        id SERIAL PRIMARY KEY,
        contenido_id INTEGER REFERENCES contenido(id) ON DELETE CASCADE,
        texto TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('opcion_multiple', 'verdadero_falso', 'texto')),
        orden INTEGER DEFAULT 0,
        puntaje INTEGER DEFAULT 1
      );
    `);
    console.log(' Tabla pregunta creada');

    // Crear tabla de opcion (opciones de respuesta)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS opcion (
        id SERIAL PRIMARY KEY,
        pregunta_id INTEGER REFERENCES pregunta(id) ON DELETE CASCADE,
        texto TEXT NOT NULL,
        es_correcta BOOLEAN DEFAULT FALSE,
        orden INTEGER DEFAULT 0
      );
    `);
    console.log(' Tabla opcion creada');

    // Crear tabla de respuesta (respuestas de estudiantes)
    // numero_intento: Permite rastrear múltiples intentos de un cuestionario (hasta 3 intentos)
    // DEFAULT 1: Las respuestas nuevas comienzan en el intento 1
    await pool.query(`
      CREATE TABLE IF NOT EXISTS respuesta (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuario(id) ON DELETE CASCADE,
        pregunta_id INTEGER REFERENCES pregunta(id) ON DELETE CASCADE,
        opcion_id INTEGER REFERENCES opcion(id) ON DELETE SET NULL,
        texto_respuesta TEXT,
        es_correcta BOOLEAN,
        numero_intento INTEGER DEFAULT 1,
        ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log(' Tabla respuesta creada (con soporte para múltiples intentos)');

    // Crear índices para mejorar rendimiento
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_progreso_usuario ON progreso(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_progreso_curso ON progreso(curso_id);
      CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_mensaje(room);
      CREATE INDEX IF NOT EXISTS idx_chat_usuario ON chat_mensaje(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_chat_ts ON chat_mensaje(ts);
      CREATE INDEX IF NOT EXISTS idx_pregunta_contenido ON pregunta(contenido_id);
      CREATE INDEX IF NOT EXISTS idx_opcion_pregunta ON opcion(pregunta_id);
      CREATE INDEX IF NOT EXISTS idx_respuesta_intento ON respuesta(usuario_id, pregunta_id, numero_intento);
      CREATE INDEX IF NOT EXISTS idx_respuesta_usuario ON respuesta(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_respuesta_pregunta ON respuesta(pregunta_id);
      CREATE INDEX IF NOT EXISTS idx_curso_tutor ON curso(tutor_id);
      CREATE INDEX IF NOT EXISTS idx_curso_estudiante_curso ON curso_estudiante(curso_id);
      CREATE INDEX IF NOT EXISTS idx_curso_estudiante_estudiante ON curso_estudiante(estudiante_id);
    `);
    console.log(' Índices creados');

    // Crear usuario tutor por defecto (password: tutor123)
    const bcrypt = require('bcrypt');
    const tutorHash = await bcrypt.hash('tutor123', 10);
    
    await pool.query(`
      INSERT INTO usuario (matricula, hash, rol, nombre, email)
      VALUES ('tutor01', $1, 'tutor', 'Tutor Principal', 'tutor@kiosco.edu')
      ON CONFLICT (matricula) DO NOTHING;
    `, [tutorHash]);
    console.log(' Usuario tutor creado (matricula: tutor01, password: tutor123)');

    // Crear usuario estudiante de ejemplo (password: estudiante123)
    const estudianteHash = await bcrypt.hash('estudiante123', 10);
    
    await pool.query(`
      INSERT INTO usuario (matricula, hash, rol, nombre, email)
      VALUES ('estudiante01', $1, 'estudiante', 'Estudiante de Prueba', 'estudiante@kiosco.edu')
      ON CONFLICT (matricula) DO NOTHING;
    `, [estudianteHash]);
    console.log(' Usuario estudiante creado (matricula: estudiante01, password: estudiante123)');

    // Obtener ID del tutor para asignar cursos
    const tutorResult = await pool.query(`
      SELECT id FROM usuario WHERE matricula = 'tutor01' LIMIT 1
    `);
    let tutorId = null;
    if (tutorResult.rows.length > 0) {
      tutorId = tutorResult.rows[0].id;
    }

    // Crear curso de ejemplo (asignado al tutor)
    let cursoId = null;
    if (tutorId) {
      const cursoResult = await pool.query(`
        INSERT INTO curso (nombre, descripcion, tutor_id)
        VALUES ('Matemáticas Básicas', 'Curso introductorio de matemáticas', $1)
        ON CONFLICT DO NOTHING
        RETURNING id;
      `, [tutorId]);
      
      if (cursoResult.rows.length > 0) {
        cursoId = cursoResult.rows[0].id;
        console.log(' Curso de ejemplo creado y asignado al tutor');
      } else {
        // Si el curso ya existe, obtener su ID y actualizar tutor_id si es necesario
        const cursoExistente = await pool.query(`
          SELECT id FROM curso WHERE nombre = 'Matemáticas Básicas' LIMIT 1
        `);
        if (cursoExistente.rows.length > 0) {
          cursoId = cursoExistente.rows[0].id;
          // Actualizar tutor_id si no tiene uno
          await pool.query(`
            UPDATE curso SET tutor_id = $1 WHERE id = $2 AND tutor_id IS NULL
          `, [tutorId, cursoId]);
        }
      }
    }

    // Crear contenidos de ejemplo si el curso existe
    if (cursoId) {
      // Verificar si ya existen contenidos para este curso
      const contenidosExistentes = await pool.query(
        'SELECT COUNT(*) as total FROM contenido WHERE curso_id = $1',
        [cursoId]
      );
      
      if (parseInt(contenidosExistentes.rows[0].total) === 0) {
        const contenidosResult = await pool.query(`
          INSERT INTO contenido (curso_id, tipo, url_local, nombre, peso_mb, orden)
          VALUES 
            ($1, 'pdf', '/contenidos/introduccion.pdf', 'Introducción a las Matemáticas', 2.5, 1),
            ($1, 'video', '/contenidos/suma-resta.mp4', 'Suma y Resta', 15.0, 2),
            ($1, 'texto', '/contenidos/multiplicacion.txt', 'Multiplicación Básica', 0.1, 3),
            ($1, 'quiz', '/contenidos/ejercicios.html', 'Ejercicios de Práctica', 0.5, 4)
          RETURNING id, tipo
        `, [cursoId]);
        console.log(' Contenidos de ejemplo creados (4 contenidos)');

        // Crear preguntas de ejemplo para el quiz
        const quizContent = contenidosResult.rows.find(c => c.tipo === 'quiz');
        if (quizContent) {
          const pregunta1 = await pool.query(`
            INSERT INTO pregunta (contenido_id, texto, tipo, orden, puntaje)
            VALUES ($1, '¿Cuánto es 2 + 2?', 'opcion_multiple', 1, 1)
            RETURNING id
          `, [quizContent.id]);
          
          if (pregunta1.rows.length > 0) {
            const pregunta1Id = pregunta1.rows[0].id;
            await pool.query(`
              INSERT INTO opcion (pregunta_id, texto, es_correcta, orden)
              VALUES 
                ($1, '3', false, 1),
                ($1, '4', true, 2),
                ($1, '5', false, 3),
                ($1, '6', false, 4)
            `, [pregunta1Id]);
          }

          const pregunta2 = await pool.query(`
            INSERT INTO pregunta (contenido_id, texto, tipo, orden, puntaje)
            VALUES ($1, '¿Cuánto es 5 - 3?', 'opcion_multiple', 2, 1)
            RETURNING id
          `, [quizContent.id]);
          
          if (pregunta2.rows.length > 0) {
            const pregunta2Id = pregunta2.rows[0].id;
            await pool.query(`
              INSERT INTO opcion (pregunta_id, texto, es_correcta, orden)
              VALUES 
                ($1, '1', false, 1),
                ($1, '2', true, 2),
                ($1, '3', false, 3)
            `, [pregunta2Id]);
          }

          const pregunta3 = await pool.query(`
            INSERT INTO pregunta (contenido_id, texto, tipo, orden, puntaje)
            VALUES ($1, 'La suma es una operación matemática básica', 'verdadero_falso', 3, 1)
            RETURNING id
          `, [quizContent.id]);
          
          if (pregunta3.rows.length > 0) {
            const pregunta3Id = pregunta3.rows[0].id;
            await pool.query(`
              INSERT INTO opcion (pregunta_id, texto, es_correcta, orden)
              VALUES 
                ($1, 'Verdadero', true, 1),
                ($1, 'Falso', false, 2)
            `, [pregunta3Id]);
          }

          console.log(' Preguntas de ejemplo creadas para el quiz');
        }
      } else {
        console.log(' Contenidos ya existen para este curso');
      }

      // Asignar curso al estudiante de ejemplo
      const estudianteResult = await pool.query(`
        SELECT id FROM usuario WHERE matricula = 'estudiante01' LIMIT 1
      `);
      
      if (estudianteResult.rows.length > 0) {
        const estudianteId = estudianteResult.rows[0].id;
        // Verificar si ya está asignado
        const asignacionExistente = await pool.query(`
          SELECT id FROM curso_estudiante 
          WHERE curso_id = $1 AND estudiante_id = $2
        `, [cursoId, estudianteId]);
        
        if (asignacionExistente.rows.length === 0) {
          await pool.query(`
            INSERT INTO curso_estudiante (curso_id, estudiante_id, activo)
            VALUES ($1, $2, TRUE)
            ON CONFLICT (curso_id, estudiante_id) DO UPDATE SET activo = TRUE
          `, [cursoId, estudianteId]);
          console.log(' Curso asignado al estudiante de ejemplo');
        } else {
          // Asegurar que está activo
          await pool.query(`
            UPDATE curso_estudiante SET activo = TRUE
            WHERE curso_id = $1 AND estudiante_id = $2
          `, [cursoId, estudianteId]);
          console.log(' Curso ya estaba asignado al estudiante (activado)');
        }
      }
    }

    console.log('\n Base de datos inicializada correctamente!');
    process.exit(0);
  } catch (error) {
    console.error(' Error al inicializar la base de datos:', error);
    process.exit(1);
  }
};

initDatabase();

