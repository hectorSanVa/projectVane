# 📤 Guía para Subir el Proyecto a GitHub

Esta guía te ayudará a subir tu proyecto a GitHub.

## ✅ Pasos Completados Automáticamente

1. ✅ Git inicializado
2. ✅ Repositorio remoto agregado
3. ✅ Archivos agregados al staging
4. ✅ Commit inicial creado
5. ✅ Rama main configurada

## 🚀 Próximos Pasos

### Paso 1: Verificar que todo está listo

```bash
git status
```

Deberías ver que todos los archivos están en staging y listos para commit.

### Paso 2: Hacer Push al Repositorio

**Opción A: Primera vez (sin autenticación previa)**
```bash
git push -u origin main
```

Si GitHub te pide autenticación:
- **Token de acceso personal** (recomendado): Crea uno en GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- O usa **GitHub CLI**: `gh auth login`

**Opción B: Si ya tienes autenticación configurada**
```bash
git push -u origin main
```

### Paso 3: Verificar en GitHub

1. Ve a: https://github.com/hectorSanVa/projectVane
2. Deberías ver todos tus archivos subidos

## 🔒 Autenticación en GitHub

### Opción 1: Token de Acceso Personal (Recomendado)

1. Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click en "Generate new token (classic)"
3. Nombre: "Kiosco Educativo"
4. Selecciona los scopes: `repo` (todos los permisos)
5. Click en "Generate token"
6. **Copia el token** (solo se muestra una vez)
7. Cuando hagas `git push`, usa el token como contraseña

### Opción 2: GitHub CLI

```bash
# Instalar GitHub CLI
# Windows: winget install GitHub.cli
# Mac: brew install gh
# Linux: sudo apt install gh

# Autenticarse
gh auth login
```

### Opción 3: SSH (Avanzado)

```bash
# Generar clave SSH
ssh-keygen -t ed25519 -C "tu-email@ejemplo.com"

# Agregar clave a GitHub
# Copiar clave pública: cat ~/.ssh/id_ed25519.pub
# Agregar en GitHub → Settings → SSH and GPG keys

# Cambiar URL del remoto a SSH
git remote set-url origin git@github.com:hectorSanVa/projectVane.git
```

## 📝 Comandos Útiles

### Ver estado del repositorio
```bash
git status
```

### Ver cambios
```bash
git diff
```

### Agregar archivos
```bash
# Agregar todos los archivos
git add .

# Agregar un archivo específico
git add archivo.js

# Agregar todos los archivos de una carpeta
git add backend/
```

### Hacer commit
```bash
git commit -m "Descripción de los cambios"
```

### Hacer push
```bash
git push origin main
```

### Ver historial
```bash
git log --oneline
```

### Actualizar desde GitHub
```bash
git pull origin main
```

## ⚠️ Archivos que NO se Suben

El archivo `.gitignore` asegura que estos archivos NO se suban a GitHub:

- `node_modules/` - Dependencias (se instalan con `npm install`)
- `.env` - Variables de entorno (contiene información sensible)
- Archivos de contenido en `backend/contenidos/` - Se excluyen para mantener el repo ligero
- Archivos del sistema operativo (`.DS_Store`, `Thumbs.db`, etc.)
- Archivos de logs (`.log`)
- Archivos temporales

## 🔄 Actualizar el Repositorio

Cada vez que hagas cambios:

```bash
# 1. Ver qué archivos cambiaron
git status

# 2. Agregar los cambios
git add .

# 3. Hacer commit
git commit -m "Descripción de los cambios"

# 4. Subir a GitHub
git push origin main
```

## 🐛 Solución de Problemas

### Error: "Permission denied"

**Solución**: Verifica que tienes permisos para escribir en el repositorio y que tu token de acceso es válido.

### Error: "Repository not found"

**Solución**: Verifica que el nombre del repositorio es correcto y que tienes acceso a él.

### Error: "Authentication failed"

**Solución**: 
1. Verifica que tu token de acceso es válido
2. O configura GitHub CLI: `gh auth login`

### Error: "Updates were rejected"

**Solución**: Alguien más hizo cambios. Primero haz pull:
```bash
git pull origin main --rebase
git push origin main
```

## 📚 Recursos

- [Documentación de GitHub](https://docs.github.com/)
- [Guía de Git](https://git-scm.com/doc)
- [GitHub CLI](https://cli.github.com/)

---

**¡Listo!** Una vez que hagas `git push`, tu proyecto estará en GitHub.

