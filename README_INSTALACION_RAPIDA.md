# 🚀 Instalación Rápida - Multiplataforma

## Windows

1. **Instalar Node.js y PostgreSQL** (ver README.md)
2. **Configurar `.env`** en `backend/`
3. **Instalar dependencias:**
   ```bash
   cd backend
   npm install
   ```
4. **Inicializar base de datos:**
   ```bash
   npm run init-db
   ```
5. **Iniciar servidor:**
   - Doble clic en `INICIO_RAPIDO.bat`
   - O manualmente: `npm start`

## Mac / Linux

1. **Instalar Node.js y PostgreSQL:**
   ```bash
   # Mac
   brew install node postgresql@14
   
   # Linux
   sudo apt install nodejs postgresql postgresql-contrib
   ```

2. **Configurar `.env`** en `backend/` (ver README.md)

3. **Instalar dependencias:**
   ```bash
   cd backend
   npm install
   ```

4. **Inicializar base de datos:**
   ```bash
   npm run init-db
   ```

5. **Dar permisos y ejecutar:**
   ```bash
   chmod +x INICIO_RAPIDO.sh
   ./INICIO_RAPIDO.sh
   ```

   O manualmente:
   ```bash
   cd backend
   npm start
   ```

## Verificar Instalación

```bash
# Verificar que el servidor está corriendo
curl http://localhost:8080/health

# Deberías ver: {"status":"ok","connections":0,"timestamp":"..."}
```

## Usuarios de Prueba

| Rol | Matrícula | Contraseña |
|-----|-----------|------------|
| Estudiante | estudiante01 | estudiante123 |
| Tutor | tutor01 | tutor123 |
| Admin | admin | admin123 |

## Más Información

- **Windows**: Ver `README.md`
- **Mac/Linux**: Ver `INSTALACION_MAC_LINUX.md`
- **Múltiples dispositivos**: Ver `CONFIGURACION_MULTIDISPOSITIVO.md`

---

**¿Problemas?** Consulta la sección de "Solución de Problemas" en el README correspondiente.

