-- Script SQL para verificar y corregir problemas de progreso
-- Ejecutar desde psql: psql -U postgres -d kiosco_educativo -f backend/scripts/verificar-progreso.sql

-- 1. Verificar progresos con curso_id que no existe
SELECT 
    p.id,
    p.usuario_id,
    p.curso_id,
    p.contenido_id,
    p.avance,
    'Curso no existe' as problema
FROM progreso p
LEFT JOIN curso c ON p.curso_id = c.id
WHERE c.id IS NULL;

-- 2. Verificar progresos con contenido_id que no existe
SELECT 
    p.id,
    p.usuario_id,
    p.curso_id,
    p.contenido_id,
    p.avance,
    'Contenido no existe' as problema
FROM progreso p
LEFT JOIN contenido cont ON p.contenido_id = cont.id
WHERE cont.id IS NULL;

-- 3. Verificar contenidos con curso_id que no existe
SELECT 
    cont.id,
    cont.nombre,
    cont.curso_id,
    cont.tipo,
    'Curso del contenido no existe' as problema
FROM contenido cont
LEFT JOIN curso c ON cont.curso_id = c.id
WHERE c.id IS NULL;

-- 4. Verificar progresos donde el contenido pertenece a un curso diferente
SELECT 
    p.id,
    p.curso_id as progreso_curso_id,
    cont.curso_id as contenido_curso_id,
    p.contenido_id,
    'Curso_id no coincide' as problema
FROM progreso p
INNER JOIN contenido cont ON p.contenido_id = cont.id
WHERE p.curso_id != cont.curso_id;

-- Para corregir progresos con curso_id incorrecto (descomentar para ejecutar):
-- UPDATE progreso p
-- SET curso_id = cont.curso_id
-- FROM contenido cont
-- WHERE p.contenido_id = cont.id
--   AND p.curso_id != cont.curso_id;

-- Para eliminar progresos con curso_id que no existe (descomentar para ejecutar):
-- DELETE FROM progreso p
-- WHERE NOT EXISTS (SELECT 1 FROM curso c WHERE c.id = p.curso_id);

-- Para eliminar progresos con contenido_id que no existe (descomentar para ejecutar):
-- DELETE FROM progreso p
-- WHERE NOT EXISTS (SELECT 1 FROM contenido c WHERE c.id = p.contenido_id);



