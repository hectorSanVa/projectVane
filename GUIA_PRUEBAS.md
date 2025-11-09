# Guía Completa de Pruebas - Kiosco Educativo

## 📋 Tabla de Contenidos

1. [Requisitos Verificados](#requisitos-verificados)
2. [Cómo Probar el Chat Tutor-Estudiante](#cómo-probar-el-chat-tutor-estudiante)
3. [Cómo Probar la Sincronización Offline](#cómo-probar-la-sincronización-offline)
4. [Cómo Probar la Descarga de Contenidos](#cómo-probar-la-descarga-de-contenidos)
5. [Pruebas de Carga](#pruebas-de-carga)
6. [Checklist de Funcionalidades](#checklist-de-funcionalidades)

---

##  Requisitos Verificados

### Tecnologías Implementadas
-  **WebSocket Server** (puerto 8080) - Implementado en `backend/server.js`
-  **PostgreSQL** - Base de datos con todas las tablas requeridas
-  **IndexedDB** - Almacenamiento offline en el cliente
-  **Node.js/Express** - Servidor REST API + WebSocket
-  **Frontend HTML/JS** - Cliente web completo

### Funcionalidades Core
-  **Autenticación y sesiones** - JWT tokens con expiración
-  **Sincronización offline/online** - IndexedDB + WebSocket con reintentos
-  **Chat tutor-estudiante** - Tiempo real por WebSocket
-  **Registro permanente** - PostgreSQL para todos los datos
-  **Reintentos de sincronización** - 3 intentos automáticos
-  **Seguridad** - Tokens, sanitización, rate limiting

### Modelo de Datos
-  `usuario(id, matricula, hash, rol)` - Implementado
-  `curso(id, nombre)` - Implementado
-  `contenido(id, curso_id, tipo, url_local, peso_mb)` - Implementado
-  `progreso(id, usuario_id, curso_id, avance, ts)` - Implementado
-  `chat_mensaje(id, room, usuario_id, texto, ts)` - Implementado

---

##  Cómo Probar el Chat Tutor-Estudiante

### Opción 1: Herramienta de Prueba (RECOMENDADO)

1. **Abrir la herramienta de prueba:**
   ```
   Abre en el navegador: frontend/test-chat.html
   ```

2. **Conectar como Estudiante:**
   - Matrícula: `estudiante01`
   - Contraseña: `estudiante123`
   - Click en "Conectar como Estudiante"

3. **Conectar como Tutor:**
   - Matrícula: `tutor01`
   - Contraseña: `tutor123`
   - Estudiante ID: `3` (ID del estudiante01)
   - Click en "Conectar como Tutor"

4. **Enviar mensajes:**
   - Escribe mensajes en cualquiera de los dos paneles
   - Los mensajes aparecerán en tiempo real en ambos lados

### Opción 2: Modo Incógnito + Ventana Normal

1. **Abrir dos ventanas:**
   - Ventana 1: Normal (http://localhost:8080 o abrir index.html)
   - Ventana 2: Modo Incógnito (Ctrl+Shift+N)

2. **En la ventana normal:**
   - Inicia sesión como **Estudiante** (`estudiante01` / `estudiante123`)
   - Ve a "Chat con Tutor"
   - Escribe un mensaje

3. **En la ventana incógnito:**
   - Inicia sesión como **Tutor** (`tutor01` / `tutor123`)
   - Selecciona al estudiante
   - Responde el mensaje

### Opción 3: Múltiples Navegadores

1. **Chrome:** Inicia sesión como Estudiante
2. **Firefox/Edge:** Inicia sesión como Tutor
3. Ambos pueden chatear en tiempo real

### Verificar que Funciona

-  Los mensajes aparecen en tiempo real
-  El historial se carga al conectar
-  Los mensajes se guardan en PostgreSQL
-  Los mensajes persisten después de recargar

---

##  Cómo Probar la Sincronización Offline

### Prueba Básica

1. **Conectar como Estudiante:**
   - Inicia sesión: `estudiante01` / `estudiante123`
   - Ve a "Mis Cursos"
   - Selecciona un curso
   - Cambia el progreso de algún contenido (ej: 50%)
   - Guarda el progreso

2. **Desconectar Internet:**
   - Desactiva WiFi o desconecta el cable de red
   - El estado cambiará a "Offline"

3. **Trabajar Offline:**
   - Cambia el progreso de otros contenidos
   - Guarda los cambios
   - Los datos se guardan en IndexedDB (local)

4. **Reconectar:**
   - Activa WiFi/conexión
   - Click en "Sincronizar" o espera la sincronización automática
   - El progreso se sincroniza automáticamente

### Prueba de Reintentos

1. **Simular fallo de conexión:**
   - Desconecta internet
   - Intenta sincronizar
   - Reconecta después de 2-3 segundos
   - El sistema reintentará automáticamente (hasta 3 veces)

2. **Verificar en la base de datos:**
   ```sql
   SELECT * FROM progreso WHERE usuario_id = 3 ORDER BY ts DESC;
   ```

---

##  Cómo Probar la Descarga de Contenidos

1. **Como Estudiante:**
   - Inicia sesión: `estudiante01` / `estudiante123`
   - Ve a "Mis Cursos"
   - Selecciona un curso
   - Click en "Descargar" en cualquier contenido

2. **Verificar Descarga:**
   - El contenido se guarda en Cache API
   - Aparece como "Descargado"
   - Puedes trabajar offline con ese contenido

3. **Probar Offline:**
   - Desconecta internet
   - Ve a "Ver" el contenido descargado
   - Debe funcionar sin conexión

4. **Eliminar Descarga:**
   - Click en "Eliminar"
   - El contenido se elimina del cache local

---

##  Pruebas de Carga

### Ejecutar Prueba de Carga

1. **Desde la terminal en `backend`:**
   ```bash
   npm run load-test
   ```

2. **Qué prueba:**
   - 100 clientes simultáneos
   - Cada cliente envía SYNC_PROGRESS cada 30 segundos
   - Mide CPU y latencia

3. **Resultados esperados:**
   - Todas las conexiones se establecen
   - Todos los clientes se autentican
   - Los SYNC_PROGRESS se procesan correctamente
   - Latencia < 100ms
   - CPU < 80%

### Prueba Manual de Múltiples Usuarios

1. **Abrir múltiples ventanas incógnito:**
   - Ventana 1: `estudiante01`
   - Ventana 2: `estudiante01` (mismo usuario, diferente sesión)
   - Ventana 3: `tutor01`

2. **Verificar:**
   - Todos pueden conectarse simultáneamente
   - Los mensajes llegan a todos
   - No hay conflictos

---

##  Checklist de Funcionalidades

### Autenticación
-  Login con matrícula y contraseña
-  Tokens JWT con expiración
-  Sesiones persistentes (IndexedDB)
-  Logout correcto
-  Validación de credenciales

### Sincronización
-  Guardar progreso offline
-  Sincronizar al reconectar
-  Reintentos automáticos (3 intentos)
-  Manejo de errores de conexión
- [x] Indicadores de estado (online/offline)

### Chat
- [x] Chat en tiempo real (WebSocket)
- [x] Historial de mensajes
- [x] Mensajes persistidos en PostgreSQL
- [x] Chat tutor-estudiante funcionando
- [x] Notificaciones de nuevos mensajes

### Contenidos
- [x] Ver cursos disponibles
- [x] Ver contenidos de cursos
- [x] Descargar contenidos (Cache API)
- [x] Visualizar PDFs
- [x] Visualizar videos
- [x] Resolver cuestionarios
- [x] Calificación automática

### Progreso
- [x] Marcar progreso (0-100%)
- [x] Guardar progreso localmente
- [x] Sincronizar progreso
- [x] Visualizar progreso en dashboard
- [x] Estadísticas de progreso

### Panel de Tutor
- [x] Ver estudiantes
- [x] Seleccionar estudiante
- [x] Chatear con estudiante
- [x] Ver progreso de estudiantes

### Panel de Admin
- [x] Gestionar cursos
- [x] Gestionar contenidos
- [x] Gestionar cuestionarios
- [x] Crear/editar/eliminar

---

## 🐛 Solución de Problemas

### El chat no funciona

**Problema:** Los mensajes no aparecen
- **Solución 1:** Verifica que el servidor esté corriendo
- **Solución 2:** Abre la consola del navegador (F12) y verifica errores
- **Solución 3:** Verifica que ambos usuarios estén autenticados
- **Solución 4:** Usa la herramienta de prueba (`test-chat.html`)

### La sincronización no funciona

**Problema:** El progreso no se sincroniza
- **Solución 1:** Verifica la conexión a internet
- **Solución 2:** Click manual en "Sincronizar"
- **Solución 3:** Verifica en la consola si hay errores
- **Solución 4:** Verifica que el WebSocket esté conectado

### No puedo probar con dos usuarios

**Problema:** No puedo tener dos sesiones abiertas
- **Solución 1:** Usa `test-chat.html` (recomendado)
- **Solución 2:** Usa modo incógnito + ventana normal
- **Solución 3:** Usa diferentes navegadores (Chrome, Firefox, Edge)

---

## 📝 Notas Importantes

1. **IDs de Usuarios:**
   - `estudiante01` tiene ID: **3**
   - `tutor01` tiene ID: **2**
   - `admin` tiene ID: **1**

2. **Puertos:**
   - Backend: `8080`
   - PostgreSQL: `5432`

3. **Base de Datos:**
   - Nombre: `kiosco_educativo`
   - Usuario: `postgres` (o el configurado en `.env`)

4. **Archivos de Prueba:**
   - `frontend/test-chat.html` - Herramienta para probar chat
   - `backend/scripts/load-test-improved.js` - Prueba de carga

---

##  Próximos Pasos

1.  Probar chat con `test-chat.html`
2.  Probar sincronización offline
3.  Probar descarga de contenidos
4.  Ejecutar pruebas de carga
5.  Verificar todas las funcionalidades del checklist

¡Listo para probar! 🚀
