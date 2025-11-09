# 🚀 Cómo Usar la Aplicación

## ⚠️ IMPORTANTE: No abrir el archivo directamente

**NO** hagas doble clic en `frontend/index.html` para abrir la aplicación. Esto causa problemas como:
- ❌ Errores de conexión WebSocket
- ❌ Errores de CORS
- ❌ Funcionalidad limitada

## ✅ Forma Correcta de Usar la Aplicación

### 1. Iniciar el Servidor Backend

Abre una terminal y ejecuta:

```bash
cd backend
npm start
```

Deberías ver algo como:
```
✅ Servidor iniciado exitosamente!
📱 Acceso local: http://localhost:8080
🌐 Acceso en red: http://192.168.x.x:8080
💡 Frontend disponible en: http://localhost:8080
```

### 2. Abrir la Aplicación en el Navegador

**NO** abras el archivo `index.html` directamente. En su lugar:

1. Abre tu navegador (Chrome, Edge, Firefox, etc.)
2. Ve a la barra de direcciones
3. Escribe: `http://localhost:8080`
4. Presiona Enter

### 3. Verificar que Funciona

Deberías ver:
- ✅ La pantalla de login del Kiosco Educativo
- ✅ Sin errores en la consola del navegador (F12)
- ✅ Conexión WebSocket establecida
- ✅ La aplicación funciona correctamente

## 🔧 Si el Servidor No Inicia

### Verificar que Node.js esté instalado:
```bash
node --version
npm --version
```

### Verificar que las dependencias estén instaladas:
```bash
cd backend
npm install
```

### Verificar que PostgreSQL esté corriendo:
- Windows: Busca "PostgreSQL" en servicios
- Mac/Linux: `sudo systemctl status postgresql`

### Verificar la configuración de la base de datos:
- Archivo: `backend/.env`
- Debe contener: `DATABASE_URL`, `JWT_SECRET`, etc.

## 📱 Usar desde Otros Dispositivos (Red Local)

1. **Iniciar el servidor** (como se muestra arriba)

2. **Obtener tu IP local:**
   - El servidor mostrará tu IP en los logs
   - O ejecuta: `ipconfig` (Windows) o `ifconfig` (Mac/Linux)

3. **Acceder desde otro dispositivo:**
   - Abre el navegador en el otro dispositivo
   - Ve a: `http://[TU_IP]:8080`
   - Ejemplo: `http://192.168.1.100:8080`

4. **Asegurar que ambos dispositivos estén en la misma red WiFi**

## 🐛 Solución de Problemas

### Error: "WebSocket connection failed"
- **Causa**: El servidor no está corriendo
- **Solución**: Inicia el servidor con `npm start` en la carpeta `backend`

### Error: "ERR_CONNECTION_REFUSED"
- **Causa**: El servidor no está corriendo o el puerto está bloqueado
- **Solución**: 
  1. Verifica que el servidor esté corriendo
  2. Verifica que el puerto 8080 no esté en uso: `netstat -an | findstr :8080`

### Error: "Maximum call stack size exceeded"
- **Causa**: Bucle infinito en el código (ya corregido)
- **Solución**: Recarga la página (F5) o cierra y vuelve a abrir el navegador

### Error: "Aplicación abierta desde archivo local"
- **Causa**: Estás abriendo el archivo directamente (file://)
- **Solución**: Accede desde `http://localhost:8080` en lugar de abrir el archivo

### La aplicación no muestra nada (pantalla en blanco)
- **Causa**: El servidor no está sirviendo el frontend
- **Solución**: 
  1. Verifica que el servidor esté corriendo
  2. Verifica que accedas desde `http://localhost:8080`
  3. Verifica la consola del navegador (F12) para errores

## 📚 Más Información

- **Instalación**: Ver `README.md`
- **Configuración Multiplataforma**: Ver `CONFIGURACION_MULTIDISPOSITIVO.md`
- **Instalación Mac/Linux**: Ver `INSTALACION_MAC_LINUX.md`

---

**¡Recuerda siempre usar `http://localhost:8080` en lugar de abrir el archivo directamente!**

