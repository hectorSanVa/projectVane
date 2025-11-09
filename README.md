# Kiosco Educativo - ODS 4: Educación de Calidad

Sistema educativo profesional con sincronización offline y chat tutor en tiempo real, diseñado para zonas con conectividad limitada.

## Características Profesionales

- ✅ **Logging estructurado** con niveles (error, warn, info, debug)
- ✅ **Validación de datos** en cliente y servidor
- ✅ **Sanitización completa de texto** para prevenir XSS
- ✅ **Refresh tokens** con renovación automática
- ✅ **Reintentos robustos** con backoff exponencial
- ✅ **Rate limiting** para prevenir abuso
- ✅ **Manejo centralizado de errores**
- ✅ **Documentación JSDoc** en todo el código
- ✅ **Configuración centralizada**
- ✅ **Pruebas de carga** para validar rendimiento
- ✅ **Health check endpoint** para monitoreo
- ✅ **Manejo robusto de errores** y reconexión automática
- ✅ **Limpieza periódica** de tokens expirados

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

1. **Node.js** (v14 o superior)
   - **Windows/Mac/Linux**: https://nodejs.org/
   - **Mac (Homebrew)**: `brew install node`
   - **Linux (Ubuntu/Debian)**: `sudo apt install nodejs`
   - Verificar instalación: `node --version`

2. **PostgreSQL** (v12 o superior)
   - **Windows**: https://www.postgresql.org/download/windows/
   - **Mac (Homebrew)**: `brew install postgresql@14`
   - **Linux (Ubuntu/Debian)**: `sudo apt install postgresql postgresql-contrib`
   - Verificar instalación: `psql --version`

3. **npm** (viene con Node.js)
   - Verificar instalación: `npm --version`

> **📱 ¿Tienes Mac o Linux?** Consulta la guía detallada: [INSTALACION_MAC_LINUX.md](INSTALACION_MAC_LINUX.md)

##  Instalación Paso a Paso

### Paso 1: Clonar o Descargar el Proyecto

Si tienes el proyecto en una carpeta, ve a esa carpeta. Si no, descarga o clona el repositorio.

### Paso 2: Configurar la Base de Datos PostgreSQL

#### 2.1 Crear la Base de Datos

**Opción A: Usando pgAdmin (Más fácil)**
1. Abre pgAdmin
2. Conéctate a PostgreSQL (ingresa tu contraseña)
3. Click derecho en "Databases" → "Create" → "Database"
4. Nombre: `kiosco_educativo`
5. Click en "Save"

**Opción B: Usando psql (Línea de comandos)**
```bash
psql -U postgres
CREATE DATABASE kiosco_educativo;
\q
```

#### 2.2 Configurar Variables de Entorno

1. Ve a la carpeta `backend`
2. Crea un archivo llamado `.env` (sin extensión)
3. Copia este contenido y ajusta tus credenciales:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kiosco_educativo
DB_USER=postgres
DB_PASSWORD=TU_CONTRASEÑA_POSTGRESQL
JWT_SECRET=mi_secret_super_seguro_123456789
JWT_EXPIRES_IN=24h
```

**IMPORTANTE:** Reemplaza `TU_CONTRASEÑA_POSTGRESQL` con la contraseña que configuraste cuando instalaste PostgreSQL.

### Paso 3: Instalar Dependencias (Controladores)

1. Abre una terminal (PowerShell/CMD en Windows, Terminal en Mac/Linux)
2. Ve a la carpeta del proyecto:
   ```bash
   # Windows
   cd C:\ruta\a\KioskoEducativo\backend
   
   # Mac/Linux
   cd /ruta/a/KioskoEducativo/backend
   ```
3. Instala las dependencias:
   ```bash
   npm install
   ```

Esto descargará e instalará todos los controladores necesarios (PostgreSQL, WebSocket, etc.)

### Paso 4: Inicializar la Base de Datos

1. Asegúrate de estar en la carpeta `backend`
2. Ejecuta:
   ```bash
   npm run init-db
   ```

Este comando:
- Verifica que la base de datos existe (la crea si no existe)
- Crea todas las tablas necesarias
- Crea usuarios de prueba
- Crea un curso de ejemplo con contenidos

**Deberías ver:**
```
 Tabla usuario creada
 Tabla curso creada
 Tabla contenido creada
 Tabla progreso creada
 Tabla chat_mensaje creada
 Usuario admin creado
 Usuario tutor creado
 Usuario estudiante creado
 Curso de ejemplo creado
 Contenidos de ejemplo creados
```

### Paso 5: Iniciar el Servidor

**Opción A: Usando el script de inicio rápido**
- **Windows**: Haz doble clic en `INICIO_RAPIDO.bat`
- **Mac/Linux**: Ejecuta `./INICIO_RAPIDO.sh` (primero: `chmod +x INICIO_RAPIDO.sh`)

El script verificará las dependencias e iniciará el servidor automáticamente.

**Opción B: Manualmente**
1. Asegúrate de estar en la carpeta `backend`
2. Ejecuta:
   ```bash
   npm start
   ```

**Deberías ver:**
```
 Conexión a PostgreSQL establecida
 Servidor iniciado en puerto 8080
 WebSocket disponible en ws://localhost:8080/ws
 API REST disponible en http://localhost:8080/api
```

**IMPORTANTE:** 
- NO cierres esta ventana
- El servidor debe estar corriendo mientras usas la aplicación
- Si cierras la ventana, el servidor se detiene

### Paso 6: Abrir el Frontend

**Opción A: Doble clic (Más fácil)**
1. Ve a la carpeta `frontend`
2. Busca el archivo `index.html`
3. Haz doble clic en `index.html`
4. Se abrirá en tu navegador

**Opción B: Usar servidor local**
```bash
cd frontend
# Windows/Mac/Linux
python -m http.server 8000
# O
python3 -m http.server 8000
# O
npx serve .
```
Luego abre: http://localhost:8000

**Opción C: Usar el script automático**
- **Windows**: Ejecuta `INICIO_RAPIDO.bat`
- **Mac/Linux**: Ejecuta `./INICIO_RAPIDO.sh`

Este script iniciará el servidor y abrirá el navegador automáticamente

### Paso 7: Iniciar Sesión

Usa uno de estos usuarios de prueba:

| Rol | Matrícula | Contraseña |
|-----|-----------|------------|
| **Estudiante** | estudiante01 | estudiante123 |
| **Tutor** | tutor01 | tutor123 |
| **Admin** | admin | admin123 |

##  Estructura del Proyecto

```
KioskoEducativo/
├── backend/                 # Servidor Node.js
│   ├── config/             # Configuración
│   │   └── database.js     # Conexión a PostgreSQL
│   ├── models/             # Modelos de datos
│   │   ├── usuario.js
│   │   ├── curso.js
│   │   ├── progreso.js
│   │   └── chat.js
│   ├── middleware/         # Middleware
│   │   └── auth.js         # Autenticación JWT
│   ├── scripts/            # Scripts útiles
│   │   ├── init-db.js      # Inicializar base de datos
│   │   └── verificar-bd.js # Verificar estado de BD
│   ├── server.js           # Servidor principal
│   ├── package.json        # Dependencias
│   ├── contenidos/         # Carpeta para archivos de contenido
│   └── .env               # Variables de entorno (crear manualmente)
│
├── frontend/               # Interfaz web
│   ├── index.html         # Página principal
│   ├── styles.css         # Estilos
│   └── js/
│       ├── app.js         # Lógica principal
│       ├── websocket-client.js  # Cliente WebSocket
│       ├── offline-storage.js   # Almacenamiento offline
│       ├── content-manager.js   # Gestión de descarga y visualización
│       └── quiz.js              # Gestión de cuestionarios
│
├── backend/
│   ├── config/            # Configuración
│   │   ├── database.js    # Configuración de BD
│   │   └── config.js      # Configuración centralizada
│   ├── middleware/        # Middleware
│   │   ├── auth.js        # Autenticación JWT
│   │   └── errorHandler.js # Manejo de errores
│   ├── models/            # Modelos de datos
│   │   ├── usuario.js     # Modelo de usuario
│   │   ├── curso.js       # Modelo de curso
│   │   ├── progreso.js    # Modelo de progreso
│   │   ├── chat.js        # Modelo de chat
│   │   └── quiz.js        # Modelo de cuestionarios
│   ├── utils/             # Utilidades
│   │   ├── logger.js      # Sistema de logging
│   │   ├── validator.js   # Validaciones
│   │   └── rateLimiter.js # Rate limiting
│   ├── scripts/           # Scripts
│   │   ├── init-db.js     # Inicializar BD
│   │   ├── verificar-bd.js # Verificar BD
│   │   └── load-test-improved.js # Pruebas de carga
│   ├── contenidos/        # Archivos de contenido
│   ├── server.js          # Servidor principal
│   └── package.json       # Dependencias
│
├── README.md              # Este archivo
├── INSTALACION_MAC_LINUX.md  # Guía de instalación para Mac/Linux
├── INICIO_RAPIDO.bat      # Script para iniciar (Windows)
└── INICIO_RAPIDO.sh       # Script para iniciar (Mac/Linux)
```

##  Comandos Útiles

### Backend

```bash
# Instalar dependencias
npm install

# Inicializar base de datos
npm run init-db

# Verificar estado de la base de datos
npm run verificar-bd

# Iniciar servidor
npm start

# Iniciar servidor en modo desarrollo (con auto-reload)
npm run dev
```

### Verificar que todo funciona

```bash
# Verificar que el servidor está corriendo
curl http://localhost:8080/health

# Deberías ver: {"status":"ok","connections":0,"timestamp":"..."}
```

## Funcionalidades

### Como Estudiante:
- Ver cursos disponibles
- Ver contenidos de cada curso (PDFs, videos, textos, cuestionarios)
- Descargar contenidos para uso offline
- Visualizar PDFs y videos directamente en el navegador
- Resolver cuestionarios interactivos con calificación automática
- Marcar progreso en contenidos (0-100%)
- Sincronizar progreso con el servidor
- Chatear con tutores en tiempo real
- Trabajar offline (los datos se guardan localmente)

### Como Tutor:
- Ver mensajes de estudiantes
- Responder preguntas en tiempo real
- Monitorear progreso de estudiantes
- Ver resultados de cuestionarios de estudiantes

### Como Admin:
- Gestionar usuarios
- Gestionar cursos y contenidos
- Crear cuestionarios con preguntas y respuestas

## Solución de Problemas

### Error: "Cannot find module 'pg'"
**Solución:** Ejecuta `npm install` en la carpeta `backend`

### Error: "password authentication failed"
**Solución:** Verifica la contraseña en el archivo `.env`

### Error: "database kiosco_educativo does not exist"
**Solución:** El script `init-db.js` intentará crearla automáticamente. Si falla, créala manualmente con pgAdmin.

### Error: "address already in use :::8080"
**Solución:** El servidor ya está corriendo. No necesitas iniciarlo de nuevo.

### No se muestra contenido en la aplicación
**Solución:** 
1. Verifica que el servidor esté corriendo (`npm start`)
2. Verifica que la base de datos tenga datos (`npm run verificar-bd`)
3. Recarga la página en el navegador
4. Abre la consola del navegador (F12) para ver errores

### El frontend no se conecta al servidor
**Solución:**
1. Verifica que el servidor esté corriendo
2. Verifica que el puerto 8080 no esté bloqueado
3. Abre la consola del navegador (F12) para ver errores

## Base de Datos

### Tablas Principales

- **usuario**: Usuarios del sistema (estudiantes, tutores, admin)
- **curso**: Cursos educativos
- **contenido**: Contenidos de cada curso (PDF, video, texto, quiz)
- **progreso**: Progreso de estudiantes en los contenidos
- **chat_mensaje**: Mensajes del chat tutor-estudiante
- **pregunta**: Preguntas de cuestionarios
- **opcion**: Opciones de respuesta para preguntas
- **respuesta**: Respuestas de estudiantes a las preguntas

### Verificar Estado de la Base de Datos

```bash
cd backend
npm run verificar-bd
```

Este comando mostrará:
- Conexión a PostgreSQL
- Tablas creadas
- Usuarios existentes
- Cursos existentes
- Contenidos existentes

## Seguridad y Calidad

### Medidas de Seguridad
- **Autenticación JWT** con expiración configurable
- **Contraseñas hasheadas** con bcrypt (salt rounds: 10)
- **Sanitización de texto** para prevenir XSS en todos los inputs
- **Validación de datos** en cliente y servidor
- **Rate limiting** (100 solicitudes/minuto por IP)
- **Validación de tipos** y rangos en todas las entradas
- **Manejo seguro de errores** sin exponer información sensible

### Calidad del Código
- **Logging estructurado** con niveles (error, warn, info, debug)
- **Documentación JSDoc** en todas las funciones
- **Manejo centralizado de errores** con respuestas consistentes
- **Validaciones exhaustivas** en todos los endpoints
- **Transacciones de BD** para operaciones críticas
- **Reconexión automática** del WebSocket con límites
- **Health check endpoint** para monitoreo

### Pruebas
- **Pruebas de carga**: Script para probar 100 clientes simultáneos
- **Validación de rendimiento**: CPU y latencia medidos
- **Pruebas de sincronización**: Validación de SYNC_PROGRESS cada 30s

## Estructura de Contenidos

Los archivos de contenido (PDFs, videos, etc.) deben colocarse en la carpeta `backend/contenidos/`.

**Ejemplo:**
- Archivo físico: `backend/contenidos/introduccion.pdf`
- URL en base de datos: `/contenidos/introduccion.pdf`

**Tipos de contenido soportados:**
- `pdf`: Archivos PDF (se visualizan en el navegador)
- `video`: Videos MP4 (se reproducen con HTML5)
- `texto`: Archivos de texto plano
- `quiz`: Cuestionarios interactivos (sin archivo físico, se manejan en la base de datos)

### Agregar Contenidos

#### Contenidos de Archivo (PDF, Video, Texto)

1. Coloca el archivo en `backend/contenidos/`
2. Agrega un registro en la tabla `contenido` de la base de datos:
   ```sql
   INSERT INTO contenido (curso_id, tipo, url_local, nombre, peso_mb, orden)
   VALUES (1, 'pdf', '/contenidos/mi_archivo.pdf', 'Nombre del Contenido', 2.5, 1);
   ```

#### Cuestionarios (Quiz)

1. Crea un registro de contenido tipo `quiz`:
   ```sql
   INSERT INTO contenido (curso_id, tipo, url_local, nombre, peso_mb, orden)
   VALUES (1, 'quiz', '/contenidos/quiz.html', 'Cuestionario de Práctica', 0.5, 5)
   RETURNING id;
   ```

2. Agrega preguntas:
   ```sql
   INSERT INTO pregunta (contenido_id, texto, tipo, orden, puntaje)
   VALUES (1, '¿Cuál es la capital de Francia?', 'opcion_multiple', 1, 1)
   RETURNING id;
   ```

3. Agrega opciones de respuesta:
   ```sql
   INSERT INTO opcion (pregunta_id, texto, es_correcta, orden)
   VALUES 
     (1, 'París', true, 1),
     (1, 'Londres', false, 2),
     (1, 'Madrid', false, 3),
     (1, 'Roma', false, 4);
   ```

**Tipos de preguntas:**
- `opcion_multiple`: Múltiples opciones, una correcta
- `verdadero_falso`: Verdadero o Falso
- `texto`: Respuesta de texto libre (no se califica automáticamente)

## Pruebas de Carga

Para probar el rendimiento del servidor con 100 clientes simultáneos:

```bash
cd backend
node scripts/load-test-improved.js
```

**Variables de entorno para pruebas:**
- `NUM_CLIENTS`: Número de clientes (default: 100)
- `SYNC_INTERVAL`: Intervalo de sincronización en ms (default: 30000)
- `TEST_DURATION`: Duración de la prueba en ms (default: 300000)

**Métricas medidas:**
- Mensajes por segundo
- Tasa de éxito/error
- Conexiones activas
- Uso de memoria

## Configuración Avanzada

### Variables de Entorno

Crea un archivo `.env` en `backend/` con:

```env
# Servidor
PORT=8080
NODE_ENV=development
HOST=localhost

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kiosco_educativo
DB_USER=postgres
DB_PASSWORD=tu_contraseña
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# JWT
JWT_SECRET=tu_secreto_seguro_aqui
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# WebSocket
WS_PING_INTERVAL=30000
WS_MAX_RECONNECT=5
WS_RECONNECT_INTERVAL=3000
```

### Niveles de Log

- `error`: Solo errores críticos
- `warn`: Advertencias y errores
- `info`: Información general (recomendado para producción)
- `debug`: Información detallada (solo para desarrollo)

## Notas Importantes

1. **El servidor debe estar corriendo siempre** mientras usas la aplicación
2. **No cierres la ventana** donde ejecutaste `npm start`
3. **El archivo `.env`** contiene información sensible, no lo subas a Git
4. **Los usuarios de prueba** son solo para desarrollo, cámbialos en producción
5. **Los archivos descargados** se almacenan en el cache del navegador (Cache API)
6. **El espacio de almacenamiento** disponible depende del navegador (generalmente varios GB)
7. **En producción**: Cambia `JWT_SECRET` y `DB_PASSWORD` por valores seguros
8. **Rate limiting**: Ajusta según las necesidades de tu aplicación
9. **Logging**: Usa `LOG_LEVEL=info` en producción, `debug` solo para desarrollo

## Inicio Rápido (Resumen)

```bash
# 1. Configurar .env con tus credenciales de PostgreSQL
# 2. Instalar dependencias
cd backend
npm install

# 3. Inicializar base de datos
npm run init-db

# 4. Verificar que todo esté correcto
npm run verificar-bd

# 5. Iniciar servidor
npm start

# 6. Abrir frontend/index.html en el navegador
# 7. Login: estudiante01 / estudiante123
```

## Comandos Disponibles

```bash
# Iniciar servidor
npm start

# Iniciar en modo desarrollo (con auto-reload)
npm run dev

# Inicializar base de datos
npm run init-db

# Verificar estado de la base de datos
npm run verificar-bd

# Ejecutar pruebas de carga
npm run load-test
```

## Soporte

Si tienes problemas:
1. Verifica que PostgreSQL esté ejecutándose
2. Verifica que las credenciales en `.env` sean correctas
3. Ejecuta `npm run verificar-bd` para ver el estado de la base de datos
4. Revisa los errores en la consola del navegador (F12)

## Licencia

Este proyecto es educativo y forma parte de un proyecto ODS 4 (Educación de Calidad).

---

**¡Listo!** Ahora puedes usar el Kiosco Educativo.
