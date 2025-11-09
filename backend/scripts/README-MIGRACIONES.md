# Scripts de Migración de Base de Datos

Este documento explica cómo mantener sincronizados los scripts de inicialización y migración.

## Estructura

### Scripts de Inicialización
- **`init-db.js`**: Script principal para crear una base de datos desde cero
  - Incluye TODOS los campos y tablas actuales
  - Usar para nuevas instalaciones
  - Comando: `npm run init-db`

### Scripts de Migración
- **`add-intento-to-respuesta.js`**: Agrega campo `numero_intento` a tabla `respuesta`
  - Solo para bases de datos EXISTENTES
  - Usar cuando ya tienes datos y necesitas agregar funcionalidad de múltiples intentos
  - Comando: `node scripts/add-intento-to-respuesta.js`

## Proceso de Actualización

Cuando agregues un nuevo campo o tabla a la base de datos:

1. **Actualizar `init-db.js`**:
   - Agrega el campo/tabla directamente en el `CREATE TABLE`
   - Agrega los índices necesarios
   - Esto asegura que nuevas instalaciones tengan todo desde el inicio

2. **Crear script de migración** (si es necesario):
   - Solo si el cambio es para bases de datos existentes
   - Usa `DO $$ BEGIN ... END $$;` para verificar si el campo existe
   - Actualiza datos existentes si es necesario
   - Documenta qué hace y por qué

3. **Actualizar este README**:
   - Documenta el nuevo cambio
   - Explica cuándo usar el script de migración

## Cambios Actuales

### Campo `numero_intento` en tabla `respuesta`
- **Propósito**: Permite rastrear múltiples intentos de un cuestionario (hasta 3)
- **En `init-db.js`**: Ya incluido en el `CREATE TABLE` (línea 192)
- **Migración**: `add-intento-to-respuesta.js` para bases existentes
- **Fecha**: Implementado para soporte de múltiples intentos en cuestionarios

### Campo `tutor_id` en tabla `curso`
- **Propósito**: Asocia un curso con su tutor
- **En `init-db.js`**: Agregado con migración condicional (líneas 84-99)
- **Migración**: No necesita script separado, se maneja en `init-db.js`

## Buenas Prácticas

1. **Siempre actualiza `init-db.js` primero**: Nuevas instalaciones deben tener todo desde el inicio
2. **Crea migraciones solo cuando sea necesario**: Para cambios en bases de datos existentes
3. **Documenta los cambios**: Explica qué, por qué y cuándo usar cada script
4. **Prueba ambos**: Asegúrate de que tanto `init-db.js` como las migraciones funcionen correctamente
5. **Mantén compatibilidad**: Las migraciones deben ser idempotentes (pueden ejecutarse múltiples veces sin error)

## Verificación

Después de hacer cambios:

1. Prueba `init-db.js` en una base de datos nueva:
   ```bash
   npm run init-db
   ```

2. Verifica que todas las tablas y campos estén presentes:
   ```bash
   node scripts/verificar-bd.js
   ```

3. Si creaste una migración, pruébala en una base de datos existente:
   ```bash
   node scripts/add-intento-to-respuesta.js
   ```




