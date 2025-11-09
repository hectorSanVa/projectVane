# 🍎 Instalación en Mac y Linux

Esta guía te ayudará a instalar y ejecutar el Kiosco Educativo en Mac o Linux.

---

## ✅ Requisitos Previos

### 1. Node.js (v14 o superior)

**Mac:**
```bash
# Opción 1: Descargar desde el sitio oficial
# https://nodejs.org/

# Opción 2: Usar Homebrew (recomendado)
brew install node
```

**Linux (Ubuntu/Debian):**
```bash
# Actualizar paquetes
sudo apt update

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

**Verificar instalación:**
```bash
node --version
npm --version
```

### 2. PostgreSQL (v12 o superior)

**Mac (Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Verificar instalación:**
```bash
psql --version
```

### 3. Git (opcional, para clonar el repositorio)

**Mac:**
```bash
# Ya viene instalado, o usar Homebrew
brew install git
```

**Linux:**
```bash
sudo apt install git
```

---

## 🚀 Instalación Paso a Paso

### Paso 1: Clonar o Descargar el Proyecto

**Opción A: Clonar con Git**
```bash
git clone <url-del-repositorio>
cd KioskoEducativo
```

**Opción B: Descargar ZIP**
1. Descarga el proyecto como ZIP
2. Descomprime el archivo
3. Abre una terminal en la carpeta del proyecto

### Paso 2: Configurar PostgreSQL

#### 2.1 Crear Usuario y Base de Datos

**Mac/Linux:**
```bash
# Acceder a PostgreSQL
sudo -u postgres psql
# O en Mac con Homebrew:
psql postgres

# Crear base de datos
CREATE DATABASE kiosco_educativo;

# Crear usuario (si no existe)
CREATE USER postgres WITH PASSWORD 'tu_contraseña';
ALTER USER postgres WITH SUPERUSER;

# Salir
\q
```

#### 2.2 Configurar Variables de Entorno

1. Ve a la carpeta `backend`:
   ```bash
   cd backend
   ```

2. Crea el archivo `.env`:
   ```bash
   touch .env
   ```

3. Abre el archivo `.env` con un editor:
   ```bash
   nano .env
   # O
   vim .env
   # O usar cualquier editor de texto
   ```

4. Agrega este contenido (ajusta las credenciales):
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=kiosco_educativo
   DB_USER=postgres
   DB_PASSWORD=tu_contraseña_postgresql
   JWT_SECRET=mi_secret_super_seguro_123456789
   JWT_EXPIRES_IN=24h
   PORT=8080
   NODE_ENV=development
   HOST=0.0.0.0
   ```

5. Guarda el archivo (en nano: `Ctrl+O`, `Enter`, `Ctrl+X`)

### Paso 3: Instalar Dependencias

```bash
cd backend
npm install
```

Esto descargará e instalará todos los paquetes necesarios.

### Paso 4: Inicializar la Base de Datos

```bash
npm run init-db
```

**Deberías ver:**
```
✅ Tabla usuario creada
✅ Tabla curso creada
✅ Tabla contenido creada
✅ Tabla progreso creada
✅ Tabla chat_mensaje creada
✅ Usuario admin creado
✅ Usuario tutor creado
✅ Usuario estudiante creado
✅ Curso de ejemplo creado
✅ Contenidos de ejemplo creados
```

### Paso 5: Dar Permisos de Ejecución al Script (Opcional)

```bash
cd ..
chmod +x INICIO_RAPIDO.sh
```

### Paso 6: Iniciar el Servidor

**Opción A: Usando el Script de Inicio Rápido (Recomendado)**
```bash
./INICIO_RAPIDO.sh
```

**Opción B: Manualmente**
```bash
cd backend
npm start
```

**Deberías ver:**
```
✅ Servidor iniciado exitosamente!
📱 Acceso local: http://localhost:8080
🌐 Acceso en red: http://192.168.1.100:8080
```

### Paso 7: Abrir el Frontend

**Opción A: Doble clic**
1. Ve a la carpeta `frontend`
2. Busca `index.html`
3. Haz doble clic para abrir en el navegador

**Opción B: Desde la terminal**
```bash
# Mac
open frontend/index.html

# Linux
xdg-open frontend/index.html
```

**Opción C: Usar servidor local (Recomendado para desarrollo)**
```bash
cd frontend
python3 -m http.server 8000
# O
npx serve .
```

Luego abre: `http://localhost:8000`

### Paso 8: Iniciar Sesión

Usa uno de estos usuarios de prueba:

| Rol | Matrícula | Contraseña |
|-----|-----------|------------|
| **Estudiante** | estudiante01 | estudiante123 |
| **Tutor** | tutor01 | tutor123 |
| **Admin** | admin | admin123 |

---

## 🔧 Solución de Problemas

### Error: "Cannot find module 'pg'"

**Solución:**
```bash
cd backend
npm install
```

### Error: "password authentication failed"

**Solución:**
1. Verifica la contraseña en el archivo `.env`
2. Verifica que el usuario de PostgreSQL existe:
   ```bash
   sudo -u postgres psql
   \du
   ```

### Error: "database kiosco_educativo does not exist"

**Solución:**
```bash
sudo -u postgres psql
CREATE DATABASE kiosco_educativo;
\q
```

Luego ejecuta: `npm run init-db`

### Error: "address already in use :::8080"

**Solución:**
El puerto 8080 ya está en uso. Puedes:
1. Cerrar el proceso que usa el puerto:
   ```bash
   # Encontrar el proceso
   lsof -i :8080
   # Matar el proceso (reemplaza PID con el número del proceso)
   kill -9 PID
   ```

2. O cambiar el puerto en `.env`:
   ```env
   PORT=3000
   ```

### Error: "Permission denied" al ejecutar INICIO_RAPIDO.sh

**Solución:**
```bash
chmod +x INICIO_RAPIDO.sh
```

### PostgreSQL no está corriendo

**Mac (Homebrew):**
```bash
brew services start postgresql@14
```

**Linux:**
```bash
sudo systemctl start postgresql
sudo systemctl status postgresql
```

### No se puede abrir el navegador automáticamente

**Solución:**
Abre manualmente el archivo `frontend/index.html` en tu navegador.

---

## 📱 Acceso desde Otros Dispositivos

Para acceder desde otros dispositivos en tu red local:

1. **Obtener tu IP local:**
   ```bash
   # Mac/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   # O
   ip addr show | grep "inet " | grep -v 127.0.0.1
   ```

2. **Actualizar `frontend/js/config.js`:**
   ```javascript
   API_URL: window.API_URL || 'http://192.168.1.100:8080',
   ```
   (Reemplaza `192.168.1.100` con tu IP)

3. **Abrir desde otro dispositivo:**
   ```
   http://192.168.1.100:8080
   ```

---

## 🎯 Comandos Útiles

```bash
# Instalar dependencias
cd backend
npm install

# Inicializar base de datos
npm run init-db

# Verificar estado de la base de datos
npm run verificar-bd

# Iniciar servidor
npm start

# Iniciar en modo desarrollo (con auto-reload)
npm run dev

# Ejecutar pruebas de carga
npm run load-test
```

---

## 📝 Notas Importantes

1. **El servidor debe estar corriendo** mientras usas la aplicación
2. **El archivo `.env`** contiene información sensible, no lo subas a Git
3. **Los usuarios de prueba** son solo para desarrollo
4. **En producción**: Cambia `JWT_SECRET` y `DB_PASSWORD` por valores seguros
5. **Firewall**: Si no puedes acceder desde otros dispositivos, verifica el firewall:
   ```bash
   # Mac
   # Ir a: Preferencias del Sistema → Seguridad y Privacidad → Firewall
   
   # Linux (UFW)
   sudo ufw allow 8080/tcp
   ```

---

## ✅ Verificación Final

Verifica que todo funciona:

```bash
# 1. Verificar que el servidor está corriendo
curl http://localhost:8080/health

# Deberías ver: {"status":"ok","connections":0,"timestamp":"..."}

# 2. Verificar que la base de datos tiene datos
cd backend
npm run verificar-bd
```

---

## 🎉 ¡Listo!

Ahora puedes usar el Kiosco Educativo en tu Mac o Linux.

Si tienes problemas, revisa la sección de "Solución de Problemas" o consulta el `README.md` principal.

