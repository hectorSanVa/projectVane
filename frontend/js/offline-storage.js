// Manejo de almacenamiento offline con IndexedDB
class OfflineStorage {
    constructor() {
        this.dbName = 'KioscoEducativoDB';
        this.dbVersion = 2;
        this.db = null;
        this.cacheName = 'kiosco-educativo-cache-v1';
    }

    async init() {
        // Si la base de datos ya está abierta y válida, reutilizarla
        if (this.db && this.db.objectStoreNames && this.db.objectStoreNames.length > 0) {
            return Promise.resolve(this.db);
        }
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Error al abrir IndexedDB:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                
                // Verificar que la conexión esté realmente abierta
                if (!this.db || !this.db.objectStoreNames || this.db.objectStoreNames.length === 0) {
                    console.error('La conexión a IndexedDB no es válida');
                    reject(new Error('La conexión a IndexedDB no es válida'));
                    return;
                }
                
                // Manejar el cierre inesperado de la conexión
                this.db.onclose = () => {
                    console.warn('⚠️ Conexión a IndexedDB cerrada inesperadamente');
                    this.db = null;
                };
                
                this.db.onerror = (event) => {
                    console.error('Error en IndexedDB:', event);
                };
                
                console.log('✅ IndexedDB inicializada correctamente');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Object store para progreso pendiente de sincronización
                if (!db.objectStoreNames.contains('progreso_pendiente')) {
                    const progresoStore = db.createObjectStore('progreso_pendiente', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    progresoStore.createIndex('usuario_id', 'usuario_id', { unique: false });
                    progresoStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Object store para mensajes de chat pendientes
                if (!db.objectStoreNames.contains('chat_pendiente')) {
                    const chatStore = db.createObjectStore('chat_pendiente', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    chatStore.createIndex('room', 'room', { unique: false });
                    chatStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Object store para cache de cursos y contenidos
                if (!db.objectStoreNames.contains('cursos_cache')) {
                    db.createObjectStore('cursos_cache', { keyPath: 'id' });
                }

                // Object store para token y usuario
                if (!db.objectStoreNames.contains('auth')) {
                    db.createObjectStore('auth', { keyPath: 'key' });
                }

                // Object store para contenidos descargados
                if (!db.objectStoreNames.contains('contenidos_descargados')) {
                    const descargadosStore = db.createObjectStore('contenidos_descargados', {
                        keyPath: 'contenido_id'
                    });
                    descargadosStore.createIndex('curso_id', 'curso_id', { unique: false });
                    descargadosStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    // Verificar y asegurar que la conexión esté abierta
    async ensureConnection() {
        if (!this.db || !this.db.objectStoreNames || this.db.objectStoreNames.length === 0) {
            console.log('🔄 Reconectando a IndexedDB...');
            await this.init();
        }
    }

    // Guardar progreso pendiente de sincronización
    async saveProgresoPendiente(progreso) {
        await this.ensureConnection();
        
        return new Promise((resolve, reject) => {
            if (!this.db || !this.db.objectStoreNames || this.db.objectStoreNames.length === 0) {
                reject(new Error('La conexión a IndexedDB no está disponible'));
                return;
            }
            
            const transaction = this.db.transaction(['progreso_pendiente'], 'readwrite');
            const store = transaction.objectStore('progreso_pendiente');
            
            // Crear clave única para este progreso
            const uniqueKey = `${progreso.usuario_id}-${progreso.curso_id}-${progreso.contenido_id}`;
            
            // Buscar si ya existe un progreso para este contenido
            const index = store.index('usuario_id');
            const request = index.getAll();
            
            request.onsuccess = () => {
                const all = request.result || [];
                // Buscar progreso existente para este contenido específico
                const existente = all.find(p => 
                    p.usuario_id === progreso.usuario_id &&
                    p.curso_id === progreso.curso_id &&
                    p.contenido_id === progreso.contenido_id
                );
                
                const item = {
                    ...progreso,
                    id: existente ? existente.id : uniqueKey,
                    timestamp: Date.now(),
                    // Preservar el estado de sincronizado si ya existe y estaba sincronizado
                    // Solo marcar como no sincronizado si es un nuevo progreso o si el avance/completado cambió
                    sincronizado: existente && existente.sincronizado && 
                                  existente.avance === progreso.avance && 
                                  existente.completado === progreso.completado
                        ? true 
                        : (progreso.sincronizado !== undefined ? progreso.sincronizado : false)
                };
                
                // Asegurar que el avance esté entre 0 y 100
                item.avance = Math.min(100, Math.max(0, item.avance || 0));
                
                // Si ya existe, tomar el máximo avance y mantener el estado de completado
                if (existente) {
                    item.avance = Math.max(existente.avance || 0, item.avance);
                    item.completado = item.completado || existente.completado || false;
                    // Actualizar el existente
                    const putRequest = store.put(item);
                    putRequest.onsuccess = () => resolve(putRequest.result);
                    putRequest.onerror = () => {
                        const error = putRequest.error;
                        // Si el error es porque la conexión se cerró, intentar reconectar
                        if (error && error.name === 'InvalidStateError' && error.message.includes('closing')) {
                            this.db = null;
                            this.saveProgresoPendiente(progreso).then(resolve).catch(reject);
                            return;
                        }
                        reject(error);
                    };
                } else {
                    // Agregar nuevo
                    const addRequest = store.add(item);
                    addRequest.onsuccess = () => resolve(addRequest.result);
                    addRequest.onerror = () => {
                        const error = addRequest.error;
                        // Si el error es porque la conexión se cerró, intentar reconectar
                        if (error && error.name === 'InvalidStateError' && error.message.includes('closing')) {
                            this.db = null;
                            this.saveProgresoPendiente(progreso).then(resolve).catch(reject);
                            return;
                        }
                        reject(error);
                    };
                }
            };
            
            request.onerror = () => {
                const error = request.error;
                console.error('Error al buscar progreso existente:', error);
                // Si el error es porque la conexión se cerró, intentar reconectar
                if (error && error.name === 'InvalidStateError' && error.message.includes('closing')) {
                    this.db = null;
                    this.saveProgresoPendiente(progreso).then(resolve).catch(reject);
                    return;
                }
                reject(error);
            };
            
            transaction.onerror = () => {
                const error = transaction.error;
                console.error('Error en transacción de saveProgresoPendiente:', error);
                // Si el error es porque la conexión se cerró, intentar reconectar
                if (error && error.name === 'InvalidStateError' && error.message.includes('closing')) {
                    this.db = null;
                    this.saveProgresoPendiente(progreso).then(resolve).catch(reject);
                    return;
                }
                reject(error || new Error('Error en transacción'));
            };
        });
    }

    // Obtener un progreso pendiente específico
    async getProgresoPendiente(usuarioId, cursoId, contenidoId) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['progreso_pendiente'], 'readonly');
            const store = transaction.objectStore('progreso_pendiente');
            const index = store.index('usuario_id');
            const request = index.getAll();
            
            request.onsuccess = () => {
                const all = request.result || [];
                const progreso = all.find(p => 
                    p.usuario_id === usuarioId &&
                    p.curso_id === cursoId &&
                    p.contenido_id === contenidoId
                );
                resolve(progreso || null);
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    // Obtener todos los progresos pendientes (agrupados por contenido para evitar duplicados)
    async getProgresosPendientes() {
        await this.ensureConnection();
        
        return new Promise((resolve, reject) => {
            if (!this.db || !this.db.objectStoreNames || this.db.objectStoreNames.length === 0) {
                reject(new Error('La conexión a IndexedDB no está disponible'));
                return;
            }
            
            const transaction = this.db.transaction(['progreso_pendiente'], 'readonly');
            const store = transaction.objectStore('progreso_pendiente');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const all = request.result || [];
                
                // Agrupar por contenido_id único (usuario_id + curso_id + contenido_id)
                // Tomar el progreso con mayor avance para cada contenido
                const progresoPorContenido = {};
                
                all.forEach(prog => {
                    const key = `${prog.usuario_id}-${prog.curso_id}-${prog.contenido_id}`;
                    const avance = Math.min(100, Math.max(0, prog.avance || 0));
                    
                    if (!progresoPorContenido[key]) {
                        progresoPorContenido[key] = prog;
                    } else {
                        // Si ya existe, tomar el que tenga mayor avance o más reciente
                        const existente = progresoPorContenido[key];
                        if (avance > (existente.avance || 0) || 
                            (avance === existente.avance && prog.timestamp > existente.timestamp)) {
                            progresoPorContenido[key] = prog;
                        }
                    }
                });
                
                // Retornar solo los progresos únicos (sin duplicados)
                resolve(Object.values(progresoPorContenido));
            };
            
            request.onerror = () => {
                const error = request.error;
                console.error('Error al obtener progresos pendientes:', error);
                // Si el error es porque la conexión se cerró, intentar reconectar
                if (error && error.name === 'InvalidStateError' && error.message.includes('closing')) {
                    this.db = null;
                    this.getProgresosPendientes().then(resolve).catch(reject);
                    return;
                }
                reject(error);
            };
            
            transaction.onerror = () => {
                const error = transaction.error;
                console.error('Error en transacción de getProgresosPendientes:', error);
                // Si el error es porque la conexión se cerró, intentar reconectar
                if (error && error.name === 'InvalidStateError' && error.message.includes('closing')) {
                    this.db = null;
                    this.getProgresosPendientes().then(resolve).catch(reject);
                    return;
                }
                reject(error || new Error('Error en transacción'));
            };
        });
    }

    // Limpiar progresos con curso_id inválidos
    async limpiarProgresosInvalidos(cursoIdsValidos) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['progreso_pendiente'], 'readwrite');
            const store = transaction.objectStore('progreso_pendiente');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const all = request.result || [];
                const idsAEliminar = [];
                const cursoIdsValidosSet = new Set(cursoIdsValidos.map(id => parseInt(id)));
                
                all.forEach(prog => {
                    const cursoId = parseInt(prog.curso_id);
                    if (!cursoIdsValidosSet.has(cursoId)) {
                        idsAEliminar.push(prog.id);
                    }
                });
                
                let eliminados = 0;
                idsAEliminar.forEach(id => {
                    const deleteRequest = store.delete(id);
                    deleteRequest.onsuccess = () => eliminados++;
                });
                
                transaction.oncomplete = () => {
                    if (eliminados > 0) {
                        console.log(`Se eliminaron ${eliminados} progresos con curso_id inválidos`);
                    }
                    resolve(eliminados);
                };
                
                transaction.onerror = () => reject(transaction.error);
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    // Limpiar progresos duplicados (mantener solo el más reciente por contenido)
    async limpiarProgresosDuplicados() {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['progreso_pendiente'], 'readwrite');
            const store = transaction.objectStore('progreso_pendiente');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const all = request.result || [];
                const progresoPorContenido = {};
                const idsAEliminar = [];
                
                // Agrupar por contenido único
                all.forEach(prog => {
                    const key = `${prog.usuario_id}-${prog.curso_id}-${prog.contenido_id}`;
                    
                    if (!progresoPorContenido[key]) {
                        progresoPorContenido[key] = prog;
                    } else {
                        // Si ya existe, comparar y mantener el mejor
                        const existente = progresoPorContenido[key];
                        const avanceActual = Math.min(100, Math.max(0, prog.avance || 0));
                        const avanceExistente = Math.min(100, Math.max(0, existente.avance || 0));
                        
                        if (avanceActual > avanceExistente || 
                            (avanceActual === avanceExistente && prog.timestamp > existente.timestamp)) {
                            // El nuevo es mejor, marcar el viejo para eliminar
                            idsAEliminar.push(existente.id);
                            progresoPorContenido[key] = prog;
                        } else {
                            // El existente es mejor, marcar el nuevo para eliminar
                            idsAEliminar.push(prog.id);
                        }
                    }
                });
                
                // Eliminar duplicados
                let eliminados = 0;
                idsAEliminar.forEach(id => {
                    const deleteRequest = store.delete(id);
                    deleteRequest.onsuccess = () => eliminados++;
                });
                
                transaction.oncomplete = () => {
                    if (eliminados > 0) {
                        console.log(`Se limpiaron ${eliminados} progresos duplicados`);
                    }
                    resolve(eliminados);
                };
                
                transaction.onerror = () => reject(transaction.error);
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    // Marcar progresos como sincronizados
    async marcarProgresosSincronizados(ids) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['progreso_pendiente'], 'readwrite');
            const store = transaction.objectStore('progreso_pendiente');
            
            let completed = 0;
            ids.forEach(id => {
                const getRequest = store.get(id);
                getRequest.onsuccess = () => {
                    const data = getRequest.result;
                    if (data) {
                        data.sincronizado = true;
                        const putRequest = store.put(data);
                        putRequest.onsuccess = () => {
                            completed++;
                            if (completed === ids.length) {
                                // Eliminar sincronizados
                                ids.forEach(id => store.delete(id));
                                resolve();
                            }
                        };
                    }
                };
            });
        });
    }

    // Guardar mensaje de chat pendiente
    async saveChatPendiente(room, texto) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chat_pendiente'], 'readwrite');
            const store = transaction.objectStore('chat_pendiente');
            
            const item = {
                room: room,
                texto: texto,
                timestamp: Date.now(),
                sincronizado: false
            };
            
            const request = store.add(item);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Obtener mensajes de chat pendientes
    async getChatPendientes() {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['chat_pendiente'], 'readonly');
            const store = transaction.objectStore('chat_pendiente');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // Guardar token de autenticación y refresh token
    async saveAuth(token, user, refreshToken = null) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['auth'], 'readwrite');
            const store = transaction.objectStore('auth');
            
            const request = store.put({ key: 'token', value: token });
            request.onsuccess = () => {
                const userRequest = store.put({ key: 'user', value: user });
                userRequest.onsuccess = () => {
                    if (refreshToken) {
                        const refreshRequest = store.put({ key: 'refreshToken', value: refreshToken });
                        refreshRequest.onsuccess = () => resolve();
                        refreshRequest.onerror = () => reject(refreshRequest.error);
                    } else {
                        resolve();
                    }
                };
                userRequest.onerror = () => reject(userRequest.error);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Obtener token de autenticación y refresh token
    async getAuth() {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['auth'], 'readonly');
            const store = transaction.objectStore('auth');
            
            const tokenRequest = store.get('token');
            tokenRequest.onsuccess = () => {
                const userRequest = store.get('user');
                userRequest.onsuccess = () => {
                    const refreshRequest = store.get('refreshToken');
                    refreshRequest.onsuccess = () => {
                        const token = tokenRequest.result ? tokenRequest.result.value : null;
                        const user = userRequest.result ? userRequest.result.value : null;
                        const refreshToken = refreshRequest.result ? refreshRequest.result.value : null;
                        
                        // Si no hay token o user, devolver null para ambos
                        if (!token || !user) {
                            resolve({ token: null, user: null, refreshToken: null });
                            return;
                        }
                        
                        resolve({ token, user, refreshToken });
                    };
                    refreshRequest.onerror = () => reject(refreshRequest.error);
                };
                userRequest.onerror = () => reject(userRequest.error);
            };
            tokenRequest.onerror = () => reject(tokenRequest.error);
        });
    }

    // Eliminar autenticación (logout)
    async clearAuth() {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['auth'], 'readwrite');
            const store = transaction.objectStore('auth');
            
            // Eliminar todos los registros de auth (más seguro que eliminar uno por uno)
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => {
                console.log('Todos los datos de autenticación eliminados de IndexedDB');
                resolve();
            };
            
            clearRequest.onerror = () => {
                console.error('Error al limpiar datos de autenticación:', clearRequest.error);
                // Si clear falla, intentar eliminar individualmente
                let completed = 0;
                const checkComplete = () => {
                    completed++;
                    if (completed === 2) {
                        resolve();
                    }
                };
                
                // Intentar eliminar token
                const tokenRequest = store.delete('token');
                tokenRequest.onsuccess = () => checkComplete();
                tokenRequest.onerror = () => checkComplete();
                
                // Intentar eliminar user
                const userRequest = store.delete('user');
                userRequest.onsuccess = () => checkComplete();
                userRequest.onerror = () => checkComplete();
            };
            
            transaction.oncomplete = () => {
                console.log('Transacción de limpieza completada');
            };
        });
    }

    // Cache de cursos
    async saveCursosCache(cursos) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cursos_cache'], 'readwrite');
            const store = transaction.objectStore('cursos_cache');
            
            cursos.forEach(curso => {
                store.put({ id: curso.id, ...curso, cached_at: Date.now() });
            });
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    // Obtener cursos del cache
    async getCursosCache() {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cursos_cache'], 'readonly');
            const store = transaction.objectStore('cursos_cache');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const cursos = request.result.map(item => {
                    const { cached_at, ...curso } = item;
                    return curso;
                });
                resolve(cursos);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Marcar contenido como descargado
    async marcarContenidoDescargado(contenidoId, cursoId, url) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['contenidos_descargados'], 'readwrite');
            const store = transaction.objectStore('contenidos_descargados');
            
            const item = {
                contenido_id: contenidoId,
                curso_id: cursoId,
                url: url,
                timestamp: Date.now()
            };
            
            const request = store.put(item);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Verificar si un contenido está descargado
    async isContenidoDescargado(contenidoId) {
        await this.ensureConnection();
        
        return new Promise((resolve, reject) => {
            if (!this.db || !this.db.objectStoreNames || this.db.objectStoreNames.length === 0) {
                reject(new Error('La conexión a IndexedDB no está disponible'));
                return;
            }
            
            const transaction = this.db.transaction(['contenidos_descargados'], 'readonly');
            const store = transaction.objectStore('contenidos_descargados');
            const request = store.get(contenidoId);
            
            request.onsuccess = () => resolve(request.result !== undefined);
            request.onerror = () => {
                const error = request.error;
                console.error('Error al verificar contenido descargado:', error);
                // Si el error es porque la conexión se cerró, intentar reconectar
                if (error.name === 'InvalidStateError' && error.message.includes('closing')) {
                    this.db = null;
                    this.isContenidoDescargado(contenidoId).then(resolve).catch(reject);
                    return;
                }
                reject(error);
            };
            
            transaction.onerror = () => {
                const error = transaction.error;
                console.error('Error en transacción de isContenidoDescargado:', error);
                // Si el error es porque la conexión se cerró, intentar reconectar
                if (error && error.name === 'InvalidStateError' && error.message.includes('closing')) {
                    this.db = null;
                    this.isContenidoDescargado(contenidoId).then(resolve).catch(reject);
                    return;
                }
                reject(error || new Error('Error en transacción'));
            };
        });
    }

    // Obtener todos los contenidos descargados
    async getContenidosDescargados() {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['contenidos_descargados'], 'readonly');
            const store = transaction.objectStore('contenidos_descargados');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // Eliminar contenido descargado
    async eliminarContenidoDescargado(contenidoId) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['contenidos_descargados'], 'readwrite');
            const store = transaction.objectStore('contenidos_descargados');
            const request = store.delete(contenidoId);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Descargar y guardar archivo en Cache API
    async descargarArchivo(url, contenidoId) {
        try {
            const cache = await caches.open(this.cacheName);
            const response = await fetch(url);
            
            if (response.ok) {
                await cache.put(url, response.clone());
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error al descargar archivo:', error);
            return false;
        }
    }

    // Obtener archivo del cache
    async obtenerArchivoDelCache(url) {
        try {
            const cache = await caches.open(this.cacheName);
            const response = await cache.match(url);
            return response;
        } catch (error) {
            console.error('Error al obtener archivo del cache:', error);
            return null;
        }
    }

    // Eliminar archivo del cache
    async eliminarArchivoDelCache(url) {
        try {
            const cache = await caches.open(this.cacheName);
            await cache.delete(url);
            return true;
        } catch (error) {
            console.error('Error al eliminar archivo del cache:', error);
            return false;
        }
    }

    // Obtener espacio usado aproximado
    async getEspacioUsado() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                return {
                    usado: estimate.usage || 0,
                    disponible: estimate.quota || 0
                };
            }
            return { usado: 0, disponible: 0 };
        } catch (error) {
            console.error('Error al obtener espacio:', error);
            return { usado: 0, disponible: 0 };
        }
    }
}

// Instancia global
const offlineStorage = new OfflineStorage();

// Exportar a window para acceso global (por si acaso)
if (typeof window !== 'undefined') {
    window.offlineStorage = offlineStorage;
    console.log('✅ offlineStorage exportado a window');
}

