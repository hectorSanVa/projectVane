// Gestor de descarga y visualización de contenidos
class ContentManager {
    constructor() {
        // Usar configuración global o valor por defecto
        this.baseUrl = (window.Config && window.Config.API_URL) || 'http://localhost:8080';
    }
    
    // Obtener URL base del servidor
    getBaseUrl() {
        return (window.Config && window.Config.API_URL) || this.baseUrl;
    }
    
    // Construir URL completa para un recurso
    getResourceUrl(path) {
        const baseUrl = this.getBaseUrl();
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}`;
    }

    // Descargar contenido
    async descargarContenido(contenido) {
        try {
            const url = `${this.baseUrl}${contenido.url_local}`;
            
            // Mostrar progreso
            const progressCallback = (progress) => {
                console.log(`Descargando: ${progress}%`);
            };

            // Descargar archivo
            const descargado = await offlineStorage.descargarArchivo(url, contenido.id);
            
            if (descargado) {
                // Marcar como descargado en IndexedDB
                await offlineStorage.marcarContenidoDescargado(
                    contenido.id,
                    contenido.curso_id,
                    url
                );
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error al descargar contenido:', error);
            return false;
        }
    }

    // Verificar si está descargado
    async estaDescargado(contenidoId) {
        return await offlineStorage.isContenidoDescargado(contenidoId);
    }

    // Obtener URL del contenido (del cache si está offline, del servidor si no)
    async obtenerUrlContenido(contenido) {
        const url = `${this.baseUrl}${contenido.url_local}`;
        const descargado = await this.estaDescargado(contenido.id);
        
        if (descargado) {
            // Intentar obtener del cache
            const cached = await offlineStorage.obtenerArchivoDelCache(url);
            if (cached) {
                return URL.createObjectURL(await cached.blob());
            }
        }
        
        // Si no está en cache o no está descargado, devolver URL del servidor
        return url;
    }

    // Formatear tamaño de archivo
    formatearTamaño(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// Instancia global
const contentManager = new ContentManager();

