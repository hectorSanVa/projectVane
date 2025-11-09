/**
 * Script de MIGRACIÓN para agregar campo numero_intento a la tabla respuesta
 * 
 * IMPORTANTE: Este script es solo para bases de datos EXISTENTES.
 * Para nuevas instalaciones, el campo numero_intento ya está incluido en init-db.js
 * 
 * Este script:
 * - Agrega el campo numero_intento si no existe
 * - Crea el índice necesario para optimizar consultas
 * - Actualiza respuestas existentes para que tengan numero_intento = 1
 * 
 * Permite rastrear múltiples intentos de un cuestionario (hasta 3 intentos)
 * 
 * USO: node scripts/add-intento-to-respuesta.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'kiosco_educativo',
    password: process.env.DB_PASSWORD || '210504',
    port: process.env.DB_PORT || 5432
});

async function agregarCampoIntento() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Agregar campo numero_intento si no existe
        await client.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='respuesta' AND column_name='numero_intento'
                ) THEN
                    ALTER TABLE respuesta ADD COLUMN numero_intento INTEGER DEFAULT 1;
                    CREATE INDEX IF NOT EXISTS idx_respuesta_intento ON respuesta(usuario_id, pregunta_id, numero_intento);
                END IF;
            END $$;
        `);
        
        // Actualizar respuestas existentes para que tengan numero_intento = 1
        await client.query(`
            UPDATE respuesta 
            SET numero_intento = 1 
            WHERE numero_intento IS NULL;
        `);
        
        await client.query('COMMIT');
        console.log('Campo numero_intento agregado exitosamente a la tabla respuesta');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al agregar campo numero_intento:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Ejecutar migración
agregarCampoIntento()
    .then(() => {
        console.log('Migración completada');
        process.exit(0);
    })
    .catch(error => {
        console.error('Error en migración:', error);
        process.exit(1);
    });

