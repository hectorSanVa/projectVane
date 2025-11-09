// Visualización de contenidos (PDF, video, texto, quiz)

// Variable para prevenir que se abra el modal si ya está cerrado
let modalCerrandose = false;
let modalAbierto = false;

// Ver contenido
async function verContenido(contenidoId, tipo, cursoIdParam = null) {
    console.log('=== verContenido INICIADO ===', { contenidoId, tipo, cursoIdParam });
    
    // Prevenir abrir el modal si ya está cerrando (usar window para compartir estado)
    if (window.modalCerrandose) {
        console.log('⚠️ Modal está cerrando, ignorando llamada a verContenido');
        return;
    }
    
    // Verificar si el modal ya está abierto para este contenido
    let modal = document.getElementById('content-modal');
    if (modal && modal.classList.contains('active') && window.modalAbierto) {
        console.log('⚠️ Modal ya está abierto, ignorando llamada duplicada');
        return;
    }
    
    // Verificar si el modal está realmente visible (no solo con clase active pero hidden)
    if (modal) {
        const computedStyle = window.getComputedStyle(modal);
        if (computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden' && modal.classList.contains('active')) {
            console.log('⚠️ Modal ya está visible, ignorando llamada duplicada');
            return;
        }
    }
    
    window.modalCerrandose = false;
    window.modalAbierto = true;
    modalCerrandose = false;
    modalAbierto = true;
    
    // Buscar el contenido en contenidosActuales
    let contenido = contenidosActuales.find(c => c.id === parseInt(contenidoId));
    console.log('Contenido encontrado en contenidosActuales:', contenido ? 'SÍ' : 'NO');
    console.log('contenidosActuales:', contenidosActuales.length, 'elementos');
    
    // Si no se encuentra, intentar obtenerlo del servidor
    if (!contenido) {
        console.warn(`Contenido ${contenidoId} no encontrado en contenidosActuales. Intentando obtener del servidor...`);
        
        // Si tenemos cursoId, intentar obtener el contenido del curso
        if (cursoIdParam) {
            try {
                const token = getCurrentToken();
                console.log('Obteniendo contenido del servidor para curso:', cursoIdParam);
                const response = await fetchApi(`/api/cursos/${cursoIdParam}/contenidos`);
                if (response.ok) {
                    const contenidos = await response.json();
                    console.log('Contenidos obtenidos del servidor:', contenidos.length);
                    contenido = contenidos.find(c => c.id === parseInt(contenidoId));
                    if (contenido) {
                        console.log('Contenido encontrado en servidor:', contenido);
                        contenido.curso_id = cursoIdParam;
                        // Agregar a contenidosActuales para futuras referencias
                        if (!contenidosActuales.find(c => c.id === contenido.id)) {
                            contenidosActuales.push(contenido);
                        }
                    } else {
                        console.error('Contenido no encontrado en la respuesta del servidor');
                    }
                } else {
                    console.error('Error al obtener contenidos del servidor:', response.status, response.statusText);
                }
            } catch (error) {
                console.error('Error al obtener contenido del servidor:', error);
            }
        }
    }
    
    if (!contenido) {
        console.error('ERROR: Contenido no encontrado después de todas las búsquedas');
        mostrarNotificacion('Contenido no encontrado', 'error');
        return;
    }
    
    console.log('Contenido a mostrar:', { 
        id: contenido.id, 
        nombre: contenido.nombre, 
        tipo: contenido.tipo, 
        url_local: contenido.url_local,
        curso_id: contenido.curso_id 
    });
    
    // Asegurar que el contenido tenga curso_id
    if (!contenido.curso_id && cursoIdParam) {
        contenido.curso_id = cursoIdParam;
    }
    
    if (!contenido.curso_id) {
        console.error('ERROR: Contenido sin curso_id:', contenido);
        mostrarNotificacion('Error: El contenido no tiene curso asociado', 'error');
        return;
    }
    
    // Reasignar modal si es necesario (ya lo tenemos declarado arriba)
    if (!modal) {
        modal = document.getElementById('content-modal');
    }
    const viewer = document.getElementById('content-viewer');
    
    console.log('Elementos del DOM:', { 
        modal: modal ? 'ENCONTRADO' : 'NO ENCONTRADO',
        viewer: viewer ? 'ENCONTRADO' : 'NO ENCONTRADO'
    });
    
    if (!modal) {
        console.error('ERROR: Modal no encontrado en el DOM');
        mostrarNotificacion('Error: No se puede mostrar el contenido. Modal no encontrado.', 'error');
        return;
    }
    
    if (!viewer) {
        console.error('ERROR: Viewer no encontrado en el DOM');
        mostrarNotificacion('Error: No se puede mostrar el contenido. Viewer no encontrado.', 'error');
        return;
    }
    
    // Remover clase hidden y agregar clase active para mostrar el modal
    console.log('Estado del modal antes de mostrar:', {
        classList: Array.from(modal.classList),
        display: window.getComputedStyle(modal).display,
        visibility: window.getComputedStyle(modal).visibility,
        opacity: window.getComputedStyle(modal).opacity
    });
    
    // Remover 'hidden' y agregar 'active' para mostrar el modal
    modal.classList.remove('hidden');
    modal.classList.add('active');
    
    // Asegurar que esté visible y completamente por encima de todo
    modal.style.cssText = `
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        position: fixed !important;
        z-index: 999999 !important;
        left: 0 !important;
        top: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background-color: rgba(0, 0, 0, 0.75) !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 20px !important;
        box-sizing: border-box !important;
    `;
    
    // Prevenir scroll en el body cuando el modal está abierto
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100vh';
    document.body.classList.add('modal-open');
    document.documentElement.style.overflow = 'hidden'; // También prevenir scroll en html
    document.documentElement.classList.add('modal-open');
    
    console.log('Estado del modal después de mostrar:', {
        classList: Array.from(modal.classList),
        display: window.getComputedStyle(modal).display,
        visibility: window.getComputedStyle(modal).visibility
    });
    
    viewer.innerHTML = '<p>Cargando contenido...</p>';
    
    // Configurar event listeners para cerrar el modal INMEDIATAMENTE
    configurarCierreModal(modal);
    
    try {
        console.log('Iniciando carga de contenido. Tipo:', tipo);
        
        if (tipo === 'quiz') {
            console.log('Cargando quiz...');
            console.log('Verificando disponibilidad de funciones de quiz...');
            console.log('window.mostrarQuiz:', typeof window.mostrarQuiz);
            console.log('window.quizManager:', typeof window.quizManager);
            console.log('quizManager (global):', typeof quizManager);
            
            // Esperar un momento para asegurar que quiz-student.js se haya cargado completamente
            let intentos = 0;
            const maxIntentos = 10;
            while (typeof window.mostrarQuiz !== 'function' && intentos < maxIntentos) {
                await new Promise(resolve => setTimeout(resolve, 100));
                intentos++;
                console.log(`Esperando mostrarQuiz... intento ${intentos}/${maxIntentos}`);
            }
            
            // Verificar que la función mostrarQuiz esté disponible
            if (typeof window.mostrarQuiz === 'function') {
                console.log('✅ Función mostrarQuiz encontrada, llamándola...');
                try {
                    await window.mostrarQuiz(contenidoId, contenido.nombre);
                    console.log('✅ Quiz cargado correctamente');
                } catch (error) {
                    console.error('❌ Error al cargar quiz:', error);
                    console.error('Stack:', error.stack);
                    viewer.innerHTML = `<p style="color: var(--danger-color); padding: 20px;">Error al cargar el cuestionario: ${error.message}</p>`;
                    mostrarNotificacion('Error al cargar el cuestionario: ' + error.message, 'error');
                }
            } else {
                console.error('❌ ERROR: función mostrarQuiz no disponible después de esperar');
                console.error('window.mostrarQuiz:', typeof window.mostrarQuiz);
                console.error('Verificando scripts cargados...');
                const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
                console.error('Scripts cargados:', scripts.filter(s => s.includes('quiz')));
                console.error('Variables globales disponibles:', Object.keys(window).filter(k => k.includes('quiz') || k.includes('Quiz')));
                viewer.innerHTML = '<p style="color: var(--danger-color); padding: 20px;">Error: función mostrarQuiz no disponible. Por favor, recarga la página (Ctrl+F5).</p>';
                mostrarNotificacion('Error: función mostrarQuiz no disponible. Por favor, recarga la página (Ctrl+F5).', 'error');
            }
            
            // Asegurar que el botón de cerrar esté visible después de cargar el quiz
            setTimeout(() => {
                const closeBtn = document.getElementById('content-modal-close-btn');
                if (closeBtn) {
                    closeBtn.style.zIndex = '999999';
                    closeBtn.style.pointerEvents = 'auto';
                    closeBtn.style.display = 'flex';
                    console.log('✅ Botón de cerrar verificado después de intentar cargar quiz');
                }
            }, 300);
        } else {
            const baseUrl = (window.Config && window.Config.API_URL) || 'http://localhost:8080';
            const url = contenido.url_local 
                ? `${baseUrl}${contenido.url_local}`
                : null;
            
            console.log('URL del contenido:', url);
            
            if (!url) {
                console.error('ERROR: Contenido sin URL');
                viewer.innerHTML = '<p>Este contenido no tiene archivo asociado.</p>';
                mostrarNotificacion('Este contenido no tiene archivo asociado', 'error');
                return;
            }
            
            // Verificar si está descargado
            const yaDescargado = await offlineStorage.isContenidoDescargado(contenidoId);
            let contenidoUrl = url;
            
            if (yaDescargado) {
                try {
                    const cached = await offlineStorage.obtenerArchivoDelCache(url);
                    if (cached) {
                        contenidoUrl = URL.createObjectURL(await cached.blob());
                    }
                } catch (error) {
                    console.warn('Error al obtener del cache, usando URL del servidor:', error);
                }
            }
            
            console.log('Tipo de contenido:', tipo, 'URL final:', contenidoUrl);
            
            if (tipo === 'pdf') {
                console.log('Cargando PDF...');
                // Calcular altura dinámica basada en el viewport
                const modalHeight = Math.min(window.innerHeight * 0.9, 900);
                const pdfHeight = modalHeight - 40; // Restar padding
                viewer.innerHTML = `
                    <div class="pdf-container" style="width: 100%; height: ${pdfHeight}px; max-height: ${pdfHeight}px; min-height: 400px; position: relative; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; background: #f5f5f5; isolation: isolate; box-sizing: border-box; margin: 0; padding: 0; flex-shrink: 0; flex-grow: 0;">
                        <div class="pdf-loading" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; z-index: 10; pointer-events: none;">
                            <div style="width: 50px; height: 50px; border: 4px solid rgba(0,0,0,0.1); border-top-color: var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                            <p style="margin-top: 10px; color: var(--dark-color); font-size: 14px;">Cargando PDF...</p>
                        </div>
                        <div class="pdf-error" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; z-index: 20; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); pointer-events: auto;">
                            <p style="color: var(--danger-color); margin-bottom: 10px; font-size: 16px;">⚠️ Error al cargar el PDF</p>
                            <button onclick="reintentarPDF(${contenidoId}, ${contenido.curso_id})" style="padding: 8px 16px; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Reintentar</button>
                        </div>
                        <iframe 
                            id="pdf-iframe-${contenidoId}" 
                            src="${contenidoUrl}" 
                            style="width: 100%; height: 100%; max-width: 100%; max-height: 100%; border: none; position: absolute; top: 0; left: 0; z-index: 1; box-sizing: border-box; margin: 0; padding: 0;"
                            onload="handlePDFLoad(${contenidoId})"
                            onerror="handlePDFError(${contenidoId})"
                        ></iframe>
                    </div>
                    <style>
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    </style>
                `;
                
                // Configurar seguimiento después de un breve delay para que el iframe se cargue
                setTimeout(async () => {
                    await configurarSeguimientoPDF(contenidoId, contenido.curso_id);
                }, 500);
                
                console.log('PDF iframe creado');
                
                // Asegurar que el botón de cerrar esté por encima del PDF
                setTimeout(() => {
                    const closeBtn = document.getElementById('content-modal-close-btn');
                    if (closeBtn) {
                        closeBtn.style.zIndex = '999999';
                        closeBtn.style.pointerEvents = 'auto';
                        closeBtn.style.display = 'flex';
                        console.log('✅ Botón de cerrar verificado después de cargar PDF');
                    }
                }, 200);
            } else if (tipo === 'video') {
                console.log('Cargando video...');
                viewer.innerHTML = `
                    <div class="video-player-wrapper" style="width: 100%; margin-bottom: 20px; position: relative; z-index: 1;">
                        <div class="video-player-container" style="width: 100%; background: #000; border-radius: 8px; overflow: hidden; position: relative; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1;">
                            <video 
                                id="video-player-${contenidoId}" 
                                controls 
                                preload="metadata"
                                style="width: 100%; max-height: 80vh; display: block; outline: none; position: relative; z-index: 1;"
                                playsinline
                                crossorigin="anonymous"
                            >
                                <source src="${contenidoUrl}" type="video/mp4">
                                <source src="${contenidoUrl}" type="video/webm">
                                <source src="${contenidoUrl}" type="video/ogg">
                                Tu navegador no soporta la reproducción de video HTML5.
                            </video>
                            <div class="video-loading" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; display: none; z-index: 10;">
                                <div style="text-align: center;">
                                    <div style="width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                                    <p style="margin-top: 10px; font-size: 14px;">Cargando video...</p>
                                </div>
                            </div>
                            <div class="video-error" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; text-align: center; padding: 20px; z-index: 10; background: rgba(0,0,0,0.8); border-radius: 8px;">
                                <p style="margin-bottom: 10px; font-size: 16px;">⚠️ Error al cargar el video</p>
                                <button onclick="reintentarVideo(${contenidoId})" style="padding: 8px 16px; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Reintentar</button>
                            </div>
                        </div>
                        <div class="video-extra-controls" style="margin-top: 15px; display: flex; gap: 15px; align-items: center; flex-wrap: wrap; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                            <div class="video-speed-control" style="display: flex; gap: 10px; align-items: center;">
                                <label style="font-size: 14px; font-weight: 500; color: var(--dark-color);">Velocidad de reproducción:</label>
                                <select id="video-speed-${contenidoId}" class="video-speed-select" style="padding: 8px 12px; border-radius: 6px; background: white; border: 2px solid var(--border-color); font-size: 14px; cursor: pointer; min-width: 100px;">
                                    <option value="0.5">0.5x</option>
                                    <option value="0.75">0.75x</option>
                                    <option value="1" selected>1x (Normal)</option>
                                    <option value="1.25">1.25x</option>
                                    <option value="1.5">1.5x</option>
                                    <option value="1.75">1.75x</option>
                                    <option value="2">2x</option>
                                </select>
                            </div>
                            <div class="video-shortcuts-info" style="font-size: 12px; color: var(--medium-gray); flex: 1;">
                                <strong>Atajos de teclado:</strong> Espacio (Pausar/Reproducir) | ← → (Saltar 10s) | ↑ ↓ (Volumen) | F (Pantalla completa)
                            </div>
                        </div>
                    </div>
                    <style>
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                        .video-player-container video::-webkit-media-controls {
                            display: flex !important;
                        }
                        .video-player-container video:focus {
                            outline: 2px solid var(--primary-color);
                            outline-offset: 2px;
                        }
                        .video-speed-select:focus {
                            outline: 2px solid var(--primary-color);
                            outline-offset: 2px;
                        }
                    </style>
                `;
                await configurarSeguimientoVideo(contenidoId, contenido.curso_id);
                configurarControlesVideo(contenidoId);
                console.log('Video configurado');
                
                // Asegurar que el botón de cerrar siga funcionando después de cargar el video
                setTimeout(() => {
                    const closeBtn = document.getElementById('content-modal-close-btn');
                    if (closeBtn) {
                        closeBtn.style.zIndex = '999999';
                        closeBtn.style.pointerEvents = 'auto';
                        closeBtn.style.display = 'flex';
                        console.log('✅ Botón de cerrar verificado después de cargar video');
                    }
                }, 200);
            } else if (tipo === 'texto') {
                console.log('Cargando texto...');
                try {
                    const response = await fetch(contenidoUrl);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    const texto = await response.text();
                    console.log('Texto obtenido, longitud:', texto.length);
                    viewer.innerHTML = `
                        <div id="texto-container-${contenidoId}" style="padding: 20px; max-height: 80vh; overflow-y: auto; background: white; border-radius: 8px;">
                            <pre id="texto-content-${contenidoId}" style="white-space: pre-wrap; font-family: inherit; margin: 0;">${texto.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                        </div>
                    `;
                    // Configurar seguimiento después de un breve delay para asegurar que el DOM esté listo
                    setTimeout(async () => {
                        await configurarSeguimientoTexto(contenidoId, contenido.curso_id);
                    }, 100);
                    console.log('Texto cargado');
                } catch (error) {
                    console.error('Error al cargar texto:', error);
                    viewer.innerHTML = `<p>Error al cargar el contenido de texto: ${error.message}</p>`;
                    mostrarNotificacion('Error al cargar el contenido de texto: ' + error.message, 'error');
                }
            } else {
                console.error('Tipo de contenido no reconocido:', tipo);
                viewer.innerHTML = `<p>Tipo de contenido no reconocido: ${tipo}</p>`;
                mostrarNotificacion('Tipo de contenido no reconocido: ' + tipo, 'error');
            }
        }
        console.log('=== verContenido COMPLETADO ===');
    } catch (error) {
        console.error('ERROR CRÍTICO al ver contenido:', error);
        console.error('Stack trace:', error.stack);
        viewer.innerHTML = `<p>Error al cargar el contenido: ${error.message}</p>`;
        mostrarNotificacion('Error al cargar el contenido: ' + error.message, 'error');
    }
}

// Descargar contenido
async function descargarContenido(contenidoId, cursoIdParam = null) {
    let contenido = contenidosActuales.find(c => c.id === contenidoId);
    
    // Si no se encuentra, intentar obtenerlo del servidor
    if (!contenido && cursoIdParam) {
        try {
            const token = getCurrentToken();
            const response = await fetchApi(`/api/cursos/${cursoIdParam}/contenidos`);
            if (response.ok) {
                const contenidos = await response.json();
                contenido = contenidos.find(c => c.id === contenidoId);
            }
        } catch (error) {
            console.error('Error al obtener contenido:', error);
        }
    }
    
    if (!contenido || !contenido.url_local) {
        mostrarNotificacion('Contenido no disponible para descarga', 'error');
        return;
    }
    
    // Asegurar que tenga curso_id
    if (!contenido.curso_id && cursoIdParam) {
        contenido.curso_id = cursoIdParam;
    }
    
    if (!contenido.curso_id) {
        console.error('Error: Contenido sin curso_id al descargar:', contenido);
        mostrarNotificacion('Error: El contenido no tiene curso asociado', 'error');
        return;
    }
    
    try {
        mostrarNotificacion('Descargando contenido...', 'info');
        
        const baseUrl = (window.Config && window.Config.API_URL) || 'http://localhost:8080';
        const url = `${baseUrl}${contenido.url_local}`;
        const descargado = await offlineStorage.descargarArchivo(url, contenidoId);
        
        if (descargado) {
            await offlineStorage.marcarContenidoDescargado(
                contenidoId,
                contenido.curso_id,
                url
            );
            mostrarNotificacion('Contenido descargado exitosamente', 'success');
            
            // Actualizar botón en la UI
            const contenidoItem = document.querySelector(`[data-contenido-id="${contenidoId}"]`);
            if (contenidoItem) {
                const actions = contenidoItem.querySelector('.contenido-actions');
                if (actions) {
                    actions.innerHTML = `
                        <button class="btn btn-primary" onclick="verContenido(${contenidoId}, '${contenido.tipo}', ${contenido.curso_id})">
                            Ver
                        </button>
                        <button class="btn btn-secondary" onclick="eliminarDescarga(${contenidoId})">
                            Eliminar Descarga
                        </button>
                    `;
                }
            }
        } else {
            mostrarNotificacion('Error al descargar contenido', 'error');
        }
    } catch (error) {
        console.error('Error al descargar contenido:', error);
        mostrarNotificacion('Error al descargar contenido', 'error');
    }
}

// Eliminar descarga
async function eliminarDescarga(contenidoId) {
    if (!confirm('¿Estás seguro de eliminar esta descarga?')) {
        return;
    }
    
    try {
        const contenido = contenidosActuales.find(c => c.id === contenidoId);
        if (!contenido) return;
        
        const baseUrl = (window.Config && window.Config.API_URL) || 'http://localhost:8080';
        const url = `${baseUrl}${contenido.url_local}`;
        await offlineStorage.eliminarArchivoDelCache(url);
        
        mostrarNotificacion('Descarga eliminada', 'success');
        
        // Actualizar botón en la UI
        const contenidoItem = document.querySelector(`[data-contenido-id="${contenidoId}"]`);
        if (contenidoItem) {
            const actions = contenidoItem.querySelector('.contenido-actions');
            if (actions && contenido.url_local) {
                actions.innerHTML = `
                    <button class="btn btn-primary" onclick="verContenido(${contenidoId}, '${contenido.tipo}', ${contenido.curso_id})">
                        Ver
                    </button>
                    <button class="btn btn-secondary" onclick="descargarContenido(${contenidoId}, ${contenido.curso_id})">
                        Descargar
                    </button>
                `;
            }
        }
    } catch (error) {
        console.error('Error al eliminar descarga:', error);
        mostrarNotificacion('Error al eliminar descarga', 'error');
    }
}

// Handlers para eventos del PDF
function handlePDFLoad(contenidoId) {
    console.log('✅ PDF cargado correctamente:', contenidoId);
    const iframe = document.getElementById(`pdf-iframe-${contenidoId}`);
    if (!iframe) return;
    
    const loadingEl = iframe.parentElement?.querySelector('.pdf-loading');
    const errorEl = iframe.parentElement?.querySelector('.pdf-error');
    
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

function handlePDFError(contenidoId) {
    console.error('❌ Error al cargar PDF:', contenidoId);
    const iframe = document.getElementById(`pdf-iframe-${contenidoId}`);
    if (!iframe) return;
    
    const loadingEl = iframe.parentElement?.querySelector('.pdf-loading');
    const errorEl = iframe.parentElement?.querySelector('.pdf-error');
    
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
    if (errorEl) {
        errorEl.style.display = 'block';
    }
}

function reintentarPDF(contenidoId, cursoId) {
    console.log('Reintentando cargar PDF:', contenidoId);
    const iframe = document.getElementById(`pdf-iframe-${contenidoId}`);
    if (!iframe) {
        console.error('Iframe no encontrado');
        return;
    }
    
    // Obtener la URL del contenido desde contenidosActuales
    const contenido = contenidosActuales.find(c => c.id === contenidoId);
    if (!contenido || !contenido.url_local) {
        console.error('Contenido no encontrado o sin URL');
        return;
    }
    
    const baseUrl = (window.Config && window.Config.API_URL) || 'http://localhost:8080';
    const contenidoUrl = `${baseUrl}${contenido.url_local}`;
    
    const errorEl = iframe.parentElement?.querySelector('.pdf-error');
    const loadingEl = iframe.parentElement?.querySelector('.pdf-loading');
    
    if (errorEl) {
        errorEl.style.display = 'none';
    }
    if (loadingEl) {
        loadingEl.style.display = 'block';
    }
    
    // Limpiar y recargar el iframe
    iframe.src = '';
    setTimeout(() => {
        iframe.src = contenidoUrl;
    }, 100);
}

// Configurar seguimiento de progreso para PDF
async function configurarSeguimientoPDF(contenidoId, cursoId) {
    console.log('Configurando seguimiento de PDF:', contenidoId, cursoId);
    
    const iframe = document.getElementById(`pdf-iframe-${contenidoId}`);
    if (!iframe) {
        console.warn('⚠️ Iframe del PDF no encontrado para seguimiento');
        return;
    }
    
    // Verificar que el modal esté abierto
    const modal = document.getElementById('content-modal');
    if (!modal || modal.classList.contains('hidden')) {
        console.warn('⚠️ Modal cerrado, no se configurará seguimiento de PDF');
        return;
    }
    
    // Verificar si el PDF ya estaba completado
    let yaCompletado = false;
    try {
        const user = getCurrentUser();
        if (user && user.rol === 'estudiante') {
            // Intentar obtener del backend primero
            if (navigator.onLine && typeof fetchApi === 'function') {
                const response = await fetchApi(`/api/estudiante/cursos/${cursoId}/progreso`);
                if (response.ok) {
                    const progresos = await response.json();
                    const progresoEncontrado = progresos.find(p => 
                        parseInt(p.contenido_id) === contenidoId && 
                        parseInt(p.curso_id) === cursoId
                    );
                    if (progresoEncontrado) {
                        yaCompletado = progresoEncontrado.completado || false;
                        console.log(`✅ Progreso actual del PDF ${contenidoId}: completado=${yaCompletado}`);
                    }
                }
            }
            
            // Si no se encontró en el backend, intentar desde IndexedDB
            if (!yaCompletado && typeof offlineStorage !== 'undefined') {
                const progresos = await offlineStorage.getProgresosPendientes();
                const progresoEncontrado = progresos.find(p => 
                    parseInt(p.contenido_id) === contenidoId && 
                    parseInt(p.curso_id) === cursoId
                );
                if (progresoEncontrado) {
                    yaCompletado = progresoEncontrado.completado || false;
                    console.log(`✅ Progreso actual del PDF ${contenidoId} (desde IndexedDB): completado=${yaCompletado}`);
                }
            }
        }
    } catch (error) {
        console.warn('⚠️ Error al obtener progreso actual del PDF (continuando de todas formas):', error);
    }
    
    // Si ya está completado, no marcar progreso nuevamente
    if (yaCompletado) {
        console.log(`✅ PDF ${contenidoId} ya estaba completado. No se marcará progreso nuevo.`);
        // Aún así, verificar después de 30 segundos para asegurar que se mantenga en 100%
        setTimeout(() => {
            if (typeof marcarProgresoAutomatico === 'function' && !window.modalCerrandose) {
                marcarProgresoAutomatico(cursoId, contenidoId, 100, true);
            }
        }, 30000);
        return;
    }
    
    let tiempoInicio = Date.now();
    let tiempoTotal = 0;
    let ultimoTiempo = tiempoInicio;
    let progresoMarcado = false;
    
    const intervalo = setInterval(() => {
        // Verificar si el modal se cerró
        const modalEl = document.getElementById('content-modal');
        if (!modalEl || modalEl.classList.contains('hidden') || window.modalCerrandose) {
            console.log('Modal cerrado, deteniendo seguimiento de PDF');
            clearInterval(intervalo);
            
            // Guardar progreso final si el usuario vio el PDF por más de 30 segundos
            if (tiempoTotal >= 30000 && !progresoMarcado) {
                console.log('💾 Guardando progreso final de PDF (100%) al cerrar modal');
                if (typeof marcarProgresoAutomatico === 'function' && !window.modalCerrandose) {
                    marcarProgresoAutomatico(cursoId, contenidoId, 100, true);
                    progresoMarcado = true;
                    // Actualizar UI después de un momento
                    setTimeout(async () => {
                        if (typeof actualizarProgresoCursos === 'function') {
                            await actualizarProgresoCursos();
                        }
                        if (typeof mostrarCursoDetalle === 'function') {
                            const cursoActual = typeof window !== 'undefined' && window.cursos 
                                ? window.cursos.find(c => c.id === cursoId)
                                : null;
                            if (cursoActual) {
                                await mostrarCursoDetalle(cursoActual.id);
                            }
                        }
                    }, 500);
                }
            }
            return;
        }
        
        const ahora = Date.now();
        tiempoTotal += ahora - ultimoTiempo;
        ultimoTiempo = ahora;
        
        // Marcar progreso después de 30 segundos de visualización
        if (tiempoTotal >= 30000 && !progresoMarcado) {
            console.log('💾 PDF visto por 30+ segundos, marcando progreso al 100%');
            if (typeof marcarProgresoAutomatico === 'function' && !window.modalCerrandose) {
                marcarProgresoAutomatico(cursoId, contenidoId, 100, true);
                progresoMarcado = true;
                // Actualizar UI después de un momento
                setTimeout(async () => {
                    if (typeof actualizarProgresoCursos === 'function') {
                        await actualizarProgresoCursos();
                    }
                    if (typeof mostrarCursoDetalle === 'function') {
                        const cursoActual = typeof window !== 'undefined' && window.cursos 
                            ? window.cursos.find(c => c.id === cursoId)
                            : null;
                        if (cursoActual) {
                            await mostrarCursoDetalle(cursoActual.id);
                        }
                    }
                }, 500);
            }
        }
    }, 1000);
    
    console.log('✅ Seguimiento de PDF configurado correctamente');
}

// Configurar seguimiento de progreso para video
async function configurarSeguimientoVideo(contenidoId, cursoId) {
    const video = document.getElementById(`video-player-${contenidoId}`);
    if (!video) return;
    
    // Obtener el progreso actual guardado para inicializar progresoMaximo
    let progresoMaximo = 0;
    let yaCompletado = false;
    
    try {
        const user = getCurrentUser();
        if (user && user.rol === 'estudiante') {
            // Intentar obtener del backend primero
            if (navigator.onLine && typeof fetchApi === 'function') {
                const response = await fetchApi(`/api/estudiante/cursos/${cursoId}/progreso`);
                if (response.ok) {
                    const progresos = await response.json();
                    const progresoEncontrado = progresos.find(p => 
                        parseInt(p.contenido_id) === contenidoId && 
                        parseInt(p.curso_id) === cursoId
                    );
                    if (progresoEncontrado) {
                        progresoMaximo = parseFloat(progresoEncontrado.avance) || 0;
                        yaCompletado = progresoEncontrado.completado || false;
                        console.log(`✅ Progreso actual del video ${contenidoId}: ${progresoMaximo}% (completado: ${yaCompletado})`);
                    }
                }
            }
            
            // Si no se encontró en el backend, intentar desde IndexedDB
            if (progresoMaximo === 0 && typeof offlineStorage !== 'undefined') {
                const progresos = await offlineStorage.getProgresosPendientes();
                const progresoEncontrado = progresos.find(p => 
                    parseInt(p.contenido_id) === contenidoId && 
                    parseInt(p.curso_id) === cursoId
                );
                if (progresoEncontrado) {
                    progresoMaximo = parseFloat(progresoEncontrado.avance) || 0;
                    yaCompletado = progresoEncontrado.completado || false;
                    console.log(`✅ Progreso actual del video ${contenidoId} (desde IndexedDB): ${progresoMaximo}% (completado: ${yaCompletado})`);
                }
            }
            
            // Si ya está completado, restaurar el video a donde estaba
            if (yaCompletado && progresoMaximo >= 100 && video.duration) {
                console.log(`✅ Video ${contenidoId} ya estaba completado. Restaurando a posición final.`);
                // No restaurar la posición, dejar que el usuario decida si quiere verlo de nuevo
                // Pero asegurar que el progreso se mantenga en 100%
                progresoMaximo = 100;
            }
        }
    } catch (error) {
        console.warn('⚠️ Error al obtener progreso actual del video (continuando de todas formas):', error);
    }
    
    let ultimaActualizacion = 0;
    const INTERVALO_ACTUALIZACION = 5000; // Actualizar cada 5 segundos
    
    // Manejar eventos de carga
    video.addEventListener('loadstart', () => {
        const loadingEl = video.parentElement.querySelector('.video-loading');
        if (loadingEl) loadingEl.style.display = 'block';
        const errorEl = video.parentElement.querySelector('.video-error');
        if (errorEl) errorEl.style.display = 'none';
    });
    
    video.addEventListener('canplay', () => {
        const loadingEl = video.parentElement.querySelector('.video-loading');
        if (loadingEl) loadingEl.style.display = 'none';
    });
    
    // Handler de error del video - prevenir que cause problemas al cerrar
    const errorHandler = (e) => {
        // SIEMPRE verificar si el modal está cerrado o cerrándose antes de procesar el error
        const modalEl = document.getElementById('content-modal');
        const modalCerrado = !modalEl || 
                             modalEl.classList.contains('hidden') || 
                             window.getComputedStyle(modalEl).display === 'none' ||
                             window.modalCerrandose;
        
        if (modalCerrado) {
            console.log('⚠️ Error de video ignorado porque el modal está cerrado o cerrándose');
            e.stopPropagation();
            e.preventDefault();
            return;
        }
        
        // Solo procesar el error si el modal está realmente abierto y visible
        console.error('Error en video:', e);
        console.error('Detalles del error:', {
            code: video.error?.code,
            message: video.error?.message,
            networkState: video.networkState,
            readyState: video.readyState
        });
        
        const loadingEl = video.parentElement?.querySelector('.video-loading');
        if (loadingEl) loadingEl.style.display = 'none';
        const errorEl = video.parentElement?.querySelector('.video-error');
        if (errorEl) errorEl.style.display = 'block';
        
        // NO intentar recargar el contenido automáticamente
        // El usuario puede usar el botón "Reintentar" si lo desea
    };
    
    video.addEventListener('error', errorHandler);
    
    // Seguimiento de progreso
    video.addEventListener('timeupdate', () => {
        if (!video.duration || isNaN(video.duration)) return;
        
        const progreso = (video.currentTime / video.duration) * 100;
        const ahora = Date.now();
        
        // IMPORTANTE: Solo actualizar progresoMaximo si el nuevo progreso es MAYOR
        // Esto previene que el progreso baje cuando se vuelve a abrir un contenido completado
        if (progreso > progresoMaximo) {
            progresoMaximo = progreso;
        }
        // Si ya estaba completado, mantener en 100%
        else if (yaCompletado && progresoMaximo < 100) {
            progresoMaximo = 100;
        }
        
        // Actualizar progreso cada 5 segundos para no sobrecargar
        if (ahora - ultimaActualizacion >= INTERVALO_ACTUALIZACION) {
            ultimaActualizacion = ahora;
            if (typeof marcarProgresoAutomatico === 'function') {
                // Si ya estaba completado, forzar a 100%
                const avanceFinal = yaCompletado ? 100 : Math.round(progresoMaximo);
                const completadoFinal = yaCompletado || progresoMaximo >= 90;
                marcarProgresoAutomatico(cursoId, contenidoId, avanceFinal, completadoFinal);
            }
        }
    });
    
    video.addEventListener('ended', () => {
        // Solo procesar si el modal está abierto
        if (window.modalCerrandose) {
            console.log('⚠️ Video ended ignorado porque el modal se está cerrando');
            return;
        }
        
        const modalEl = document.getElementById('content-modal');
        if (!modalEl || modalEl.classList.contains('hidden') || window.getComputedStyle(modalEl).display === 'none') {
            console.log('⚠️ Video ended ignorado porque el modal está cerrado');
            return;
        }
        
        if (typeof marcarProgresoAutomatico === 'function') {
            // Video completado: 100% y marcado como completado
            marcarProgresoAutomatico(cursoId, contenidoId, 100, true);
            mostrarNotificacion('Video completado. Progreso actualizado.', 'success');
        }
    });
    
    // Restaurar posición de reproducción si existe
    video.addEventListener('loadedmetadata', () => {
        const savedTime = localStorage.getItem(`video-time-${contenidoId}`);
        if (savedTime && parseFloat(savedTime) > 0) {
            video.currentTime = parseFloat(savedTime);
        }
    });
    
    // Guardar posición de reproducción periódicamente
    setInterval(() => {
        if (video.currentTime > 0 && !video.paused) {
            localStorage.setItem(`video-time-${contenidoId}`, video.currentTime.toString());
        }
    }, 10000); // Guardar cada 10 segundos
}

// Configurar controles adicionales del video
function configurarControlesVideo(contenidoId) {
    const video = document.getElementById(`video-player-${contenidoId}`);
    const speedSelect = document.getElementById(`video-speed-${contenidoId}`);
    
    if (!video) return;
    
    // Control de velocidad
    if (speedSelect) {
        speedSelect.addEventListener('change', (e) => {
            video.playbackRate = parseFloat(e.target.value);
        });
    }
    
    // Atajos de teclado
    video.addEventListener('keydown', (e) => {
        if (e.target === video || e.target.closest('.video-player-container')) {
            switch(e.key) {
                case ' ': // Espacio para pausar/reproducir
                    e.preventDefault();
                    if (video.paused) {
                        video.play();
                    } else {
                        video.pause();
                    }
                    break;
                case 'ArrowLeft': // Retroceder 10 segundos
                    e.preventDefault();
                    video.currentTime = Math.max(0, video.currentTime - 10);
                    break;
                case 'ArrowRight': // Avanzar 10 segundos
                    e.preventDefault();
                    video.currentTime = Math.min(video.duration, video.currentTime + 10);
                    break;
                case 'ArrowUp': // Aumentar volumen
                    e.preventDefault();
                    video.volume = Math.min(1, video.volume + 0.1);
                    break;
                case 'ArrowDown': // Disminuir volumen
                    e.preventDefault();
                    video.volume = Math.max(0, video.volume - 0.1);
                    break;
                case 'f': // Pantalla completa
                case 'F':
                    e.preventDefault();
                    if (video.requestFullscreen) {
                        video.requestFullscreen();
                    } else if (video.webkitRequestFullscreen) {
                        video.webkitRequestFullscreen();
                    } else if (video.mozRequestFullScreen) {
                        video.mozRequestFullScreen();
                    } else if (video.msRequestFullscreen) {
                        video.msRequestFullscreen();
                    }
                    break;
            }
        }
    });
    
    // Hacer el video focusable para atajos de teclado
    video.setAttribute('tabindex', '0');
}

// Reintentar carga de video
function reintentarVideo(contenidoId) {
    const video = document.getElementById(`video-player-${contenidoId}`);
    if (!video) return;
    
    const errorEl = video.parentElement.querySelector('.video-error');
    if (errorEl) errorEl.style.display = 'none';
    
    video.load();
    video.play().catch(err => {
        console.error('Error al reproducir video:', err);
    });
}

// Configurar seguimiento de progreso para texto
async function configurarSeguimientoTexto(contenidoId, cursoId) {
    console.log('📝 Configurando seguimiento de texto para contenido:', contenidoId, 'curso:', cursoId);
    
    // Buscar el contenedor del texto (el div con scroll)
    const textoContainer = document.getElementById(`texto-container-${contenidoId}`) || 
                          document.querySelector('#content-viewer div[style*="overflow-y"]') ||
                          document.querySelector('#content-viewer > div');
    
    if (!textoContainer) {
        console.warn('⚠️ No se encontró el contenedor del texto para:', contenidoId);
        return;
    }
    
    console.log('✅ Contenedor de texto encontrado:', textoContainer);
    
    // Obtener el progreso actual guardado para inicializar scrollMaximo
    let scrollMaximo = 0;
    let yaCompletado = false;
    
    try {
        const user = getCurrentUser();
        if (user && user.rol === 'estudiante') {
            // Intentar obtener del backend primero
            if (navigator.onLine && typeof fetchApi === 'function') {
                const response = await fetchApi(`/api/estudiante/cursos/${cursoId}/progreso`);
                if (response.ok) {
                    const progresos = await response.json();
                    const progresoEncontrado = progresos.find(p => 
                        parseInt(p.contenido_id) === contenidoId && 
                        parseInt(p.curso_id) === cursoId
                    );
                    if (progresoEncontrado) {
                        const avanceGuardado = parseFloat(progresoEncontrado.avance) || 0;
                        scrollMaximo = avanceGuardado;
                        yaCompletado = progresoEncontrado.completado || false;
                        console.log(`✅ Progreso actual del texto ${contenidoId}: ${scrollMaximo}% (completado: ${yaCompletado})`);
                    }
                }
            }
            
            // Si no se encontró en el backend, intentar desde IndexedDB
            if (scrollMaximo === 0 && typeof offlineStorage !== 'undefined') {
                const progresos = await offlineStorage.getProgresosPendientes();
                const progresoEncontrado = progresos.find(p => 
                    parseInt(p.contenido_id) === contenidoId && 
                    parseInt(p.curso_id) === cursoId
                );
                if (progresoEncontrado) {
                    const avanceGuardado = parseFloat(progresoEncontrado.avance) || 0;
                    scrollMaximo = avanceGuardado;
                    yaCompletado = progresoEncontrado.completado || false;
                    console.log(`✅ Progreso actual del texto ${contenidoId} (desde IndexedDB): ${scrollMaximo}% (completado: ${yaCompletado})`);
                }
            }
            
            // Si ya está completado, mantener en 100%
            if (yaCompletado && scrollMaximo < 100) {
                scrollMaximo = 100;
            }
        }
    } catch (error) {
        console.warn('⚠️ Error al obtener progreso actual del texto (continuando de todas formas):', error);
    }
    
    let ultimaActualizacion = 0;
    const INTERVALO_ACTUALIZACION = 2000; // Actualizar cada 2 segundos
    
    const checkScroll = () => {
        const scrollTop = textoContainer.scrollTop || 0;
        const scrollHeight = textoContainer.scrollHeight || 0;
        const clientHeight = textoContainer.clientHeight || 0;
        
        if (scrollHeight <= 0) {
            console.warn('⚠️ scrollHeight es 0 o inválido');
            return;
        }
        
        const progreso = ((scrollTop + clientHeight) / scrollHeight) * 100;
        
        console.log('📊 Progreso de texto:', {
            scrollTop,
            scrollHeight,
            clientHeight,
            progreso: Math.round(progreso),
            scrollMaximo: Math.round(scrollMaximo),
            yaCompletado: yaCompletado
        });
        
        // IMPORTANTE: Solo actualizar scrollMaximo si el nuevo progreso es MAYOR
        // Esto previene que el progreso baje cuando se vuelve a abrir un contenido completado
        if (progreso > scrollMaximo) {
            scrollMaximo = progreso;
            const ahora = Date.now();
            
            // Actualizar progreso cada 2 segundos para no sobrecargar
            if (ahora - ultimaActualizacion >= INTERVALO_ACTUALIZACION) {
                ultimaActualizacion = ahora;
                // Si ya estaba completado, forzar a 100%
                const avance = yaCompletado ? 100 : Math.round(scrollMaximo);
                const completado = yaCompletado || scrollMaximo >= 90;
                
                console.log('💾 Guardando progreso de texto:', { avance, completado });
                if (typeof marcarProgresoAutomatico === 'function' && !window.modalCerrandose) {
                    marcarProgresoAutomatico(cursoId, contenidoId, avance, completado);
                }
            }
        }
        // Si ya estaba completado, mantener en 100%
        else if (yaCompletado && scrollMaximo < 100) {
            scrollMaximo = 100;
            const ahora = Date.now();
            if (ahora - ultimaActualizacion >= INTERVALO_ACTUALIZACION) {
                ultimaActualizacion = ahora;
                console.log('✅ Texto ya estaba completado. Manteniendo en 100%.');
                if (typeof marcarProgresoAutomatico === 'function' && !window.modalCerrandose) {
                    marcarProgresoAutomatico(cursoId, contenidoId, 100, true);
                }
            }
        }
        
        // Si el usuario llega al final (95% o más), marcar como completado
        if (scrollMaximo >= 95 && scrollMaximo < 100 && !yaCompletado) {
            const ahora = Date.now();
            if (ahora - ultimaActualizacion >= INTERVALO_ACTUALIZACION) {
                ultimaActualizacion = ahora;
                console.log('✅ Texto completado (95%+), marcando como completado');
                if (typeof marcarProgresoAutomatico === 'function' && !window.modalCerrandose) {
                    marcarProgresoAutomatico(cursoId, contenidoId, 100, true);
                    yaCompletado = true;
                }
            }
        }
    };
    
    // Agregar listener de scroll
    textoContainer.addEventListener('scroll', checkScroll, { passive: true });
    
    // Verificar progreso inicial
    checkScroll();
    
    // Verificar al cerrar el modal
    const modal = document.getElementById('content-modal');
    if (modal) {
        const observer = new MutationObserver(() => {
            if (modal.classList.contains('hidden') || window.modalCerrandose) {
                // Guardar progreso final cuando se cierra el modal
                console.log('🔒 Modal cerrado, guardando progreso final de texto:', Math.round(scrollMaximo));
                if (typeof marcarProgresoAutomatico === 'function' && scrollMaximo > 0) {
                    const avance = Math.round(scrollMaximo);
                    const completado = scrollMaximo >= 90;
                    marcarProgresoAutomatico(cursoId, contenidoId, avance, completado);
                }
                observer.disconnect();
                textoContainer.removeEventListener('scroll', checkScroll);
            }
        });
        
        observer.observe(modal, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
    
    console.log('✅ Seguimiento de texto configurado correctamente');
}

// Marcar progreso automático
async function marcarProgresoAutomatico(cursoId, contenidoId, avance, completado = false) {
    // Prevenir actualizaciones de progreso si el modal se está cerrando
    if (window.modalCerrandose) {
        console.log('⚠️ Modal cerrándose, ignorando actualización de progreso');
        return;
    }
    
    const user = getCurrentUser();
    if (!user || user.rol !== 'estudiante') return;
    
    // Validar que cursoId y contenidoId sean válidos
    if (!cursoId || !contenidoId) {
        console.error('Error: cursoId o contenidoId inválidos', { cursoId, contenidoId });
        return;
    }
    
    // Asegurar que son números
    cursoId = parseInt(cursoId);
    contenidoId = parseInt(contenidoId);
    
    if (isNaN(cursoId) || isNaN(contenidoId)) {
        console.error('Error: cursoId o contenidoId no son números válidos', { cursoId, contenidoId });
        return;
    }
    
    // IMPORTANTE: Obtener el progreso actual guardado para evitar que baje
    let progresoActual = null;
    try {
        // Intentar obtener del backend primero
        if (navigator.onLine && typeof fetchApi === 'function') {
            const response = await fetchApi(`/api/estudiante/cursos/${cursoId}/progreso`);
            if (response.ok) {
                const progresos = await response.json();
                const progresoEncontrado = progresos.find(p => 
                    parseInt(p.contenido_id) === contenidoId && 
                    parseInt(p.curso_id) === cursoId
                );
                if (progresoEncontrado) {
                    progresoActual = {
                        avance: parseFloat(progresoEncontrado.avance) || 0,
                        completado: progresoEncontrado.completado || false
                    };
                }
            }
        }
        
        // Si no se encontró en el backend, intentar desde IndexedDB
        if (!progresoActual && typeof offlineStorage !== 'undefined') {
            const progresos = await offlineStorage.getProgresosPendientes();
            const progresoEncontrado = progresos.find(p => 
                parseInt(p.contenido_id) === contenidoId && 
                parseInt(p.curso_id) === cursoId
            );
            if (progresoEncontrado) {
                progresoActual = {
                    avance: parseFloat(progresoEncontrado.avance) || 0,
                    completado: progresoEncontrado.completado || false
                };
            }
        }
    } catch (error) {
        console.warn('⚠️ Error al obtener progreso actual (continuando de todas formas):', error);
    }
    
    // Asegurar que el avance esté entre 0 y 100
    avance = Math.max(0, Math.min(100, Math.round(avance)));
    
    // REGLA IMPORTANTE: Si el contenido ya estaba completado (100%), NO permitir que baje
    if (progresoActual && progresoActual.completado) {
        console.log(`✅ Contenido ${contenidoId} ya estaba completado al 100%. Manteniendo progreso en 100%.`);
        avance = 100;
        completado = true;
    }
    // Si el contenido ya tenía un progreso mayor, no permitir que baje
    else if (progresoActual && progresoActual.avance > avance) {
        console.log(`📊 Contenido ${contenidoId} tenía progreso ${progresoActual.avance}%. No permitiendo que baje a ${avance}%.`);
        avance = progresoActual.avance;
        // Si el progreso anterior era >= 90%, mantener completado
        if (progresoActual.avance >= 90) {
            completado = true;
            avance = 100;
        }
    }
    // Si el avance es >= 90%, considerar completado automáticamente
    else if (avance >= 90 && !completado) {
        completado = true;
        avance = 100;
    }
    
    // Verificar que el contenido pertenece al curso correcto
    const contenido = contenidosActuales.find(c => c.id === contenidoId);
    if (contenido) {
        // Si el contenido tiene curso_id, usarlo (es más confiable)
        if (contenido.curso_id) {
            if (contenido.curso_id !== cursoId) {
                console.warn(`⚠️ ADVERTENCIA: El contenido ${contenidoId} pertenece al curso ${contenido.curso_id}, pero se está guardando progreso para el curso ${cursoId}. Usando curso_id del contenido.`);
            }
            cursoId = contenido.curso_id;
        } else if (!cursoId) {
            console.error(`❌ ERROR: No se puede guardar progreso. El contenido ${contenidoId} no tiene curso_id y no se proporcionó uno.`);
            mostrarNotificacion('Error: No se puede determinar el curso para este contenido', 'error');
            return;
        }
    } else if (!cursoId) {
        console.error(`❌ ERROR: No se puede guardar progreso. El contenido ${contenidoId} no se encontró y no se proporcionó cursoId.`);
        mostrarNotificacion('Error: Contenido no encontrado', 'error');
        return;
    }
    
    console.log(`✅ Guardando progreso: curso=${cursoId}, contenido=${contenidoId}, avance=${avance}%, completado=${completado}`);
    
    try {
        // Guardar en IndexedDB
        await offlineStorage.saveProgresoPendiente({
            usuario_id: user.id,
            curso_id: cursoId,
            contenido_id: contenidoId,
            avance: avance,
            completado: completado
        });
        
        // Enviar por WebSocket si está conectado
        if (navigator.onLine && wsClient.isConnected) {
            console.log('📤 Enviando progreso por WebSocket...');
            wsClient.send({
                type: 'SAVE_PROGRESS',
                curso_id: cursoId,
                contenido_id: contenidoId,
                avance: avance,
                completado: completado
            });
            console.log('✅ Progreso enviado por WebSocket');
        } else {
            console.log('⚠️ WebSocket no conectado o sin conexión. Progreso guardado solo en IndexedDB.');
        }
        
        // Actualizar UI inmediatamente (optimista) y luego después de un delay para sincronización
        // Actualización optimista inmediata
        if (typeof mostrarCursoDetalle === 'function') {
            const contenidoItem = document.querySelector(`[data-contenido-id="${contenidoId}"]`);
            if (contenidoItem) {
                const progressFill = contenidoItem.querySelector('.progress-fill');
                const progressPercentage = contenidoItem.querySelector('.progress-percentage');
                if (progressFill) {
                    progressFill.style.width = `${avance}%`;
                }
                if (progressPercentage) {
                    progressPercentage.textContent = `${avance}%`;
                }
            }
        }
        
        // Actualizar UI completa después de un delay para reflejar cambios en el curso
        setTimeout(async () => {
            console.log('🔄 Actualizando progreso de cursos después de guardar progreso...');
            if (typeof actualizarProgresoCursos === 'function') {
                await actualizarProgresoCursos();
            }
        }, 800);
    } catch (error) {
        console.error('Error al marcar progreso:', error);
    }
}

// Variable para almacenar el handler de ESC
let currentEscapeHandler = null;

// Configurar event listeners para cerrar el modal
function configurarCierreModal(modal) {
    console.log('Configurando cierre del modal...');
    
    // Remover handler anterior de ESC si existe
    if (currentEscapeHandler) {
        document.removeEventListener('keydown', currentEscapeHandler);
    }
    
    // Cerrar con la tecla ESC
    currentEscapeHandler = function(e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
            const activeModal = document.getElementById('content-modal');
            if (activeModal && activeModal.classList.contains('active')) {
                console.log('Tecla ESC presionada, cerrando modal...');
                e.preventDefault();
                e.stopPropagation();
                cerrarModal();
            }
        }
    };
    document.addEventListener('keydown', currentEscapeHandler, true);
    
    // Cerrar al hacer clic en el overlay (fuera del modal-content)
    // PERO NO si el clic es en el botón de cerrar
    const overlayHandler = function(e) {
        // Verificar si el clic es en el botón de cerrar
        const isCloseButton = e.target.id === 'content-modal-close-btn' || 
                              e.target.closest('#content-modal-close-btn') ||
                              e.target.classList.contains('modal-close') ||
                              e.target.closest('.modal-close');
        
        // Solo cerrar si el clic es directamente en el modal (overlay) Y no es el botón de cerrar
        if (e.target === modal && !isCloseButton) {
            console.log('Clic en overlay (no en botón), cerrando modal...');
            cerrarModal();
        }
    };
    modal.addEventListener('click', overlayHandler, false); // false = bubble phase
    
    // Prevenir que los clics dentro del modal-content cierren el modal
    // PERO permitir que el botón de cerrar funcione
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        const contentHandler = function(e) {
            // Si el clic es en el botón de cerrar o en sus hijos, NO detener la propagación
            const isCloseButton = e.target.id === 'content-modal-close-btn' || 
                                  e.target.closest('#content-modal-close-btn') ||
                                  e.target.classList.contains('modal-close') ||
                                  e.target.closest('.modal-close');
            
            if (!isCloseButton) {
                // Solo detener la propagación si NO es el botón de cerrar
                e.stopPropagation();
            }
        };
        modalContent.addEventListener('click', contentHandler, false); // false = bubble phase, no capture
    }
    
    // Configurar el botón de cerrar directamente - NO clonar, solo configurar
    let closeBtn = document.getElementById('content-modal-close-btn');
    if (!closeBtn) {
        // Si no existe, crearlo
        closeBtn = document.createElement('button');
        closeBtn.id = 'content-modal-close-btn';
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Cerrar');
        modal.appendChild(closeBtn);
    }
    
    if (closeBtn) {
        console.log('✅ Botón de cerrar encontrado/creado, configurando...');
        
        // Función para cerrar el modal - MUY SIMPLE
        const closeModalHandler = function(e) {
            console.log('🖱️🖱️🖱️ BOTÓN CERRAR CLICADO! Tipo:', e.type, 'Target:', e.target);
            try {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
                
                // Llamar directamente a window.cerrarModal (definida en utils.js)
                // NO usar la función local si existe, siempre usar la global
                console.log('🔍 Verificando window.cerrarModal:', typeof window.cerrarModal);
                
                if (typeof window.cerrarModal === 'function') {
                    console.log('✅ window.cerrarModal encontrada, llamándola directamente...');
                    window.cerrarModal();
                } else {
                    console.error('❌ cerrarModal NO encontrada!', {
                        windowCerrarModal: typeof window.cerrarModal,
                        cerrarModal: typeof cerrarModal
                    });
                    // Cerrar manualmente como fallback
                    const modalEl = document.getElementById('content-modal');
                    if (modalEl) {
                        console.log('🔧 Cerrando modal manualmente...');
                        const videos = modalEl.querySelectorAll('video');
                        videos.forEach(video => {
                            if (video && !video.paused) {
                                video.pause();
                                console.log('Video pausado');
                            }
                            if (video.src && video.src.startsWith('blob:')) {
                                URL.revokeObjectURL(video.src);
                            }
                        });
                        modalEl.classList.remove('active');
                        modalEl.classList.add('hidden');
                        modalEl.style.display = 'none';
                        modalEl.style.visibility = 'hidden';
                        const viewer = document.getElementById('content-viewer');
                        if (viewer) viewer.innerHTML = '';
                        console.log('✅ Modal cerrado manualmente');
                    } else {
                        console.error('❌ Modal no encontrado para cerrar');
                    }
                }
            } catch (err) {
                console.error('❌ Error en closeModalHandler:', err);
                // Intentar cerrar manualmente como último recurso
                try {
                    const modalEl = document.getElementById('content-modal');
                    if (modalEl) {
                        modalEl.classList.remove('active');
                        modalEl.classList.add('hidden');
                        modalEl.style.display = 'none';
                    }
                } catch (e2) {
                    console.error('Error crítico al cerrar modal:', e2);
                }
            }
            return false;
        };
        
        // Limpiar todos los event listeners anteriores
        const newCloseBtn = closeBtn.cloneNode(false);
        newCloseBtn.innerHTML = '&times;';
        newCloseBtn.id = 'content-modal-close-btn';
        newCloseBtn.className = 'modal-close';
        newCloseBtn.setAttribute('aria-label', 'Cerrar');
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        const finalBtn = document.getElementById('content-modal-close-btn');
        
        // Agregar event listeners en fase de captura (true = capture phase)
        finalBtn.addEventListener('click', closeModalHandler, true);
        finalBtn.addEventListener('mousedown', closeModalHandler, true);
        
        // También usar onclick directo
        finalBtn.onclick = closeModalHandler;
        
        // Asegurar estilos críticos con !important inline
        finalBtn.style.cssText = `
            position: fixed !important;
            right: 30px !important;
            top: 30px !important;
            z-index: 999999 !important;
            pointer-events: auto !important;
            cursor: pointer !important;
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 45px !important;
            height: 45px !important;
            font-size: 32px !important;
        `;
        
        console.log('✅ Botón de cerrar configurado:', finalBtn);
        console.log('   - ID:', finalBtn.id);
        console.log('   - z-index:', window.getComputedStyle(finalBtn).zIndex);
        console.log('   - position:', window.getComputedStyle(finalBtn).position);
        console.log('   - pointer-events:', window.getComputedStyle(finalBtn).pointerEvents);
        
        // Test: hacer clic programáticamente para verificar que funciona
        setTimeout(() => {
            console.log('🧪 Botón listo. Prueba hacer clic en él.');
        }, 500);
    } else {
        console.error('❌ ERROR: No se pudo crear/encontrar el botón de cerrar');
    }
}

// Exportar funciones globalmente
window.verContenido = verContenido;
window.descargarContenido = descargarContenido;
window.eliminarDescarga = eliminarDescarga;
window.reintentarVideo = reintentarVideo;
window.reintentarPDF = reintentarPDF;
window.handlePDFLoad = handlePDFLoad;
window.handlePDFError = handlePDFError;
window.marcarProgresoAutomatico = marcarProgresoAutomatico;
window.configurarSeguimientoPDF = configurarSeguimientoPDF;
window.configurarSeguimientoVideo = configurarSeguimientoVideo;
window.configurarSeguimientoTexto = configurarSeguimientoTexto;
window.configurarControlesVideo = configurarControlesVideo;


