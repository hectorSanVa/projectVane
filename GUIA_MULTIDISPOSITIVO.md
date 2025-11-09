# 📱 Guía para Usar en Cualquier Dispositivo

Esta guía te ayudará a configurar el Kiosco Educativo para que funcione en diferentes dispositivos (computadoras, tablets, smartphones) dentro de tu red local o en internet.

---

## 🎯 Opciones de Despliegue

### 1. Desarrollo Local (Solo en tu Computadora)
- **Uso**: Desarrollo y pruebas
- **Acceso**: Solo desde `localhost`
- **Configuración**: Ya está configurado por defecto

### 2. Red Local (LAN)
- **Uso**: Múltiples dispositivos en la misma red (Wi-Fi/Ethernet)
- **Acceso**: Desde cualquier dispositivo en tu red local
- **Configuración**: Requiere conocer la IP del servidor

### 3. Internet (Producción)
- **Uso**: Acceso desde cualquier lugar
- **Acceso**: Desde cualquier dispositivo con internet
- **Configuración**: Requiere servidor público, dominio y HTTPS

---

## 🚀 Configuración para Red Local (Recomendado)

### Paso 1: Obtener la IP del Servidor

#### Windows:
```powershell
ipconfig
```
Busca la dirección IPv4 (ejemplo: `192.168.1.100`)

#### Linux/Mac:
```bash
ifconfig
# o
ip addr show
```
Busca la dirección IP de tu interfaz de red (ejemplo: `192.168.1.100`)

### Paso 2: Configurar el Backend

El servidor ya está configurado para escuchar en todas las interfaces (`0.0.0.0`), por lo que **no necesitas cambiar nada** en el backend.

Solo necesitas:
1. Iniciar el servidor normalmente:
   ```bash
   cd backend
   npm start
   ```
2. El servidor mostrará la IP de red local en los logs:
   ```
   Servidor iniciado
   network: http://192.168.1.100:8080
   ```

### Paso 3: Configurar el Frontend

#### Opción A: Modificar `frontend/js/config.js` (Recomendado)

Edita el archivo `frontend/js/config.js` y cambia:

```javascript
// Cambiar esto:
API_URL: window.API_URL || 'http://localhost:8080',

// Por la IP de tu servidor:
API_URL: window.API_URL || 'http://192.168.1.100:8080',
```

Reemplaza `192.168.1.100` con la IP de tu servidor.

#### Opción B: Usar Variables de Entorno (Avanzado)

Crea un archivo `frontend/config.local.js`:

```javascript
window.API_URL = 'http://192.168.1.100:8080';
window.WS_URL = 'ws://192.168.1.100:8080';
```

Y agrega en `frontend/index.html` antes de `config.js`:

```html
<script src="config.local.js"></script>
<script src="js/config.js"></script>
```

#### Opción C: Servir el Frontend desde el Backend (Más Fácil)

Modifica `backend/server.js` para servir el frontend:

```javascript
// Agregar antes de las rutas API
app.use(express.static(path.join(__dirname, '../frontend')));
```

Luego accede desde cualquier dispositivo usando:
```
http://192.168.1.100:8080
```

### Paso 4: Acceder desde Otros Dispositivos

1. **Asegúrate de que todos los dispositivos estén en la misma red Wi-Fi/Ethernet**

2. **Abre un navegador en el dispositivo cliente** y accede a:
   ```
   http://192.168.1.100:8080
   ```
   (Reemplaza con la IP de tu servidor)

3. **Si el frontend está en un servidor web separado**, accede a la URL del frontend y asegúrate de que `config.js` tenga la IP correcta del backend.

---

## 🌐 Configuración para Internet (Producción)

### Requisitos
1. **Servidor público** (VPS, Cloud, etc.)
2. **Dominio** (opcional pero recomendado)
3. **Certificado SSL** (HTTPS)
4. **Firewall configurado** (puertos 80, 443, 8080)

### Paso 1: Configurar el Servidor

1. **Configurar variables de entorno** (`.env`):
   ```env
   NODE_ENV=production
   PORT=8080
   HOST=0.0.0.0
   DB_HOST=localhost
   DB_NAME=kiosco_educativo
   DB_USER=postgres
   DB_PASSWORD=tu_contraseña
   JWT_SECRET=tu_secret_muy_seguro
   ```

2. **Configurar HTTPS** (requiere certificados SSL):
   ```javascript
   const https = require('https');
   const fs = require('fs');
   
   const options = {
     key: fs.readFileSync('path/to/private-key.pem'),
     cert: fs.readFileSync('path/to/certificate.pem')
   };
   
   const server = https.createServer(options, app);
   ```

3. **Configurar CORS** para tu dominio:
   ```javascript
   app.use(cors({
     origin: 'https://tu-dominio.com',
     credentials: true
   }));
   ```

### Paso 2: Configurar el Frontend

En `frontend/js/config.js`:

```javascript
API_URL: window.API_URL || 'https://tu-dominio.com',
WS_URL: window.WS_URL || 'wss://tu-dominio.com',
```

### Paso 3: Desplegar

1. **Subir archivos al servidor**
2. **Instalar dependencias**: `npm install`
3. **Configurar base de datos**
4. **Iniciar servidor**: `npm start`

---

## 🔧 Solución de Problemas

### No puedo acceder desde otro dispositivo

1. **Verificar que el firewall permite el puerto 8080**:
   ```bash
   # Windows: Abrir puerto en Firewall de Windows
   # Linux: 
   sudo ufw allow 8080
   ```

2. **Verificar que ambos dispositivos están en la misma red**

3. **Verificar que el servidor está escuchando en 0.0.0.0**:
   ```bash
   netstat -an | grep 8080
   ```
   Debe mostrar `0.0.0.0:8080` o `:::8080`

4. **Probar conectividad**:
   ```bash
   # Desde el dispositivo cliente
   ping 192.168.1.100
   curl http://192.168.1.100:8080/health
   ```

### Error de CORS

Si ves errores de CORS:
1. Verifica que `cors()` está habilitado en el backend
2. Verifica que la URL en el frontend coincide con la del servidor
3. Para producción, configura CORS con el dominio específico

### WebSocket no conecta

1. **Verificar que el puerto WebSocket está abierto** (mismo que HTTP)
2. **Verificar la URL del WebSocket** en `config.js`
3. **Verificar que el servidor WebSocket está funcionando**:
   ```bash
   # Probar conexión WebSocket
   wscat -c ws://192.168.1.100:8080/ws
   ```

### Base de datos no accesible

Si la base de datos está en otro servidor:
1. Configurar `DB_HOST` en `.env` con la IP del servidor de BD
2. Verificar que PostgreSQL permite conexiones remotas:
   ```sql
   -- En postgresql.conf
   listen_addresses = '*'
   
   -- En pg_hba.conf
   host    all    all    0.0.0.0/0    md5
   ```

---

## 📱 Dispositivos Soportados

### Desktop
- ✅ Windows (Chrome, Firefox, Edge)
- ✅ macOS (Chrome, Firefox, Safari)
- ✅ Linux (Chrome, Firefox)

### Mobile
- ✅ Android (Chrome, Firefox)
- ✅ iOS (Safari, Chrome)
- ✅ Tablets (iPad, Android)

### Requisitos
- Navegador moderno con soporte para:
  - WebSocket
  - IndexedDB
  - Fetch API
  - ES6+

---

## 🎯 Configuración Rápida para Red Local

### 1. Iniciar el servidor
```bash
cd backend
npm start
```

### 2. Anotar la IP que muestra el servidor
```
network: http://192.168.1.100:8080
```

### 3. Modificar `frontend/js/config.js`
```javascript
API_URL: window.API_URL || 'http://192.168.1.100:8080',
```

### 4. Abrir en otro dispositivo
```
http://192.168.1.100:8080
```

---

## 🔒 Consideraciones de Seguridad

### Red Local
- ✅ Usar solo en redes confiables
- ⚠️ No exponer a internet sin HTTPS
- ⚠️ Configurar firewall adecuadamente

### Internet (Producción)
- ✅ **Siempre usar HTTPS**
- ✅ Configurar CORS correctamente
- ✅ Usar secretos seguros para JWT
- ✅ Configurar rate limiting
- ✅ Mantener dependencias actualizadas

---

## 📝 Notas Importantes

1. **El servidor ahora escucha en `0.0.0.0` por defecto**, lo que permite acceso desde otros dispositivos en la red local.

2. **El frontend necesita conocer la IP del servidor** para conectarse. Por defecto usa `localhost`, pero puedes cambiarlo en `config.js`.

3. **Para producción en internet**, se recomienda:
   - Usar HTTPS/WSS
   - Configurar un dominio
   - Usar un servidor proxy (nginx, Apache)
   - Configurar firewall adecuadamente

4. **El almacenamiento offline (IndexedDB) funciona en todos los dispositivos** que soporten navegadores modernos.

---

## ✅ Checklist de Configuración

### Red Local
- [ ] Servidor iniciado y escuchando en `0.0.0.0`
- [ ] IP del servidor identificada
- [ ] `config.js` actualizado con la IP del servidor
- [ ] Firewall permite el puerto 8080
- [ ] Dispositivos en la misma red
- [ ] Probado desde otro dispositivo

### Producción
- [ ] Servidor público configurado
- [ ] HTTPS/WSS configurado
- [ ] Dominio configurado
- [ ] CORS configurado
- [ ] Firewall configurado
- [ ] Base de datos accesible
- [ ] Variables de entorno configuradas

---

**¿Necesitas ayuda?** Revisa la sección de "Solución de Problemas" o consulta los logs del servidor para más información.

