-- Script SQL para crear la base de datos del Kiosco Educativo
-- Ejecuta este script como usuario postgres o con permisos de superusuario

-- Crear base de datos (si no existe)
SELECT 'CREATE DATABASE kiosco_educativo'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kiosco_educativo')\gexec

-- Conectar a la base de datos
\c kiosco_educativo

-- Nota: Las tablas se crean automáticamente al ejecutar init-db.js
-- Este script solo crea la base de datos

-- Para ejecutar este script desde la línea de comandos:
-- psql -U postgres -f scripts/create-database.sql

