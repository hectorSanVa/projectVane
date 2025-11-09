// Utilidades generales de la aplicación

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'info', duracion = 5000) {
    // Eliminar notificaciones anteriores para evitar acumulación
    const notificacionesExistentes = document.querySelectorAll('.notification');
    notificacionesExistentes.forEach(n => {
        n.classList.remove('show');
        setTimeout(() => n.remove(), 300);
    });
    
    // Crear notificación
    const notification = document.createElement('div');
    notification.className = `notification ${tipo}`;
    
    // Agregar icono según el tipo
    const iconos = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    notification.innerHTML = `
        <span style="font-size: 20px; font-weight: bold; opacity: 0.9;">${iconos[tipo] || iconos.info}</span>
        <span style="flex: 1;">${mensaje}</span>
        <button class="notification-close" aria-label="Cerrar notificación">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // Forzar reflow para que la animación funcione
    notification.offsetHeight;
    
    // Mostrar con animación
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Permitir cerrar al hacer clic en el botón de cerrar
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        });
    }
    
    // Ocultar después de la duración especificada
    if (duracion > 0) {
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duracion);
    }
}

// Variable global para prevenir reapertura del modal
window.modalCerrandose = false;
window.modalAbierto = false;

// Cerrar modal de contenido
function cerrarModal() {
    console.log('🔴🔴🔴🔴🔴 cerrarModal() INICIADO - VERSIÓN DE UTILS.JS');
    
    // Marcar que el modal se está cerrando para prevenir reapertura
    window.modalCerrandose = true;
    window.modalAbierto = false;
    
    try {
        const modal = document.getElementById('content-modal');
        if (!modal) {
            console.error('❌ Modal content-modal no encontrado en el DOM');
            window.modalCerrandose = false;
            return;
        }
        
        console.log('✅ Modal encontrado. Estado ANTES de cerrar:', {
            classList: Array.from(modal.classList),
            display: window.getComputedStyle(modal).display,
            visibility: window.getComputedStyle(modal).visibility,
            opacity: window.getComputedStyle(modal).opacity
        });
        
        // Pausar todos los videos antes de cerrar
        const videos = modal.querySelectorAll('video');
        console.log(`📹 Encontrados ${videos.length} video(s) para pausar`);
        videos.forEach((video, index) => {
            if (video) {
                if (!video.paused) {
                    video.pause();
                    console.log(`📹 Video ${index + 1} pausado`);
                }
                // Limpiar el src del video para liberar recursos
                if (video.src && video.src.startsWith('blob:')) {
                    try {
                        URL.revokeObjectURL(video.src);
                        console.log(`📹 Blob URL ${index + 1} revocada`);
                    } catch (e) {
                        console.warn(`Error al revocar blob URL ${index + 1}:`, e);
                    }
                }
                // NO limpiar el src inmediatamente para evitar errores
                // Solo pausar y detener la reproducción de forma suave
                try {
                    // Pausar primero
                    if (!video.paused) {
                        video.pause();
                    }
                    // Remover event listeners de error para prevenir que se disparen
                    // al limpiar el video
                    const errorHandler = (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        console.log('⚠️ Error de video ignorado durante cierre de modal');
                    };
                    video.addEventListener('error', errorHandler, { once: true, capture: true });
                    
                    // Solo resetear currentTime, NO limpiar src
                    video.currentTime = 0;
                    video.load(); // Esto puede disparar error, pero lo capturamos arriba
                } catch (e) {
                    console.warn(`Error al limpiar video ${index + 1}:`, e);
                    // Si falla, solo pausar sin hacer nada más
                    try {
                        if (!video.paused) {
                            video.pause();
                        }
                    } catch (e2) {
                        console.warn(`Error al pausar video ${index + 1}:`, e2);
                    }
                }
            }
        });
        
        // Cerrar el modal - FORZAR con múltiples métodos
        console.log('🔧 Paso 1: Removiendo clase "active"...');
        modal.classList.remove('active');
        
        console.log('🔧 Paso 2: Agregando clase "hidden"...');
        modal.classList.add('hidden');
        
        console.log('🔧 Paso 3: Aplicando estilos inline forzados...');
        // Forzar estilos inline con !important usando setProperty
        modal.style.setProperty('display', 'none', 'important');
        modal.style.setProperty('visibility', 'hidden', 'important');
        modal.style.setProperty('opacity', '0', 'important');
        modal.style.setProperty('pointer-events', 'none', 'important');
        modal.style.setProperty('z-index', '-1', 'important');
        
        // Restaurar scroll en el body cuando se cierra el modal
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.classList.remove('modal-open');
        document.documentElement.style.overflow = ''; // Restaurar scroll en html también
        document.documentElement.classList.remove('modal-open');
        
        console.log('✅ Estilos aplicados. Estado DESPUÉS de aplicar estilos:', {
            classList: Array.from(modal.classList),
            display: modal.style.display,
            visibility: modal.style.visibility,
            computedDisplay: window.getComputedStyle(modal).display,
            computedVisibility: window.getComputedStyle(modal).visibility
        });
        
        // Limpiar contenido
        const viewer = document.getElementById('content-viewer');
        if (viewer) {
            viewer.innerHTML = '';
            console.log('✅ Contenido del viewer limpiado');
        }
        
        // Verificar INMEDIATAMENTE que realmente se cerró
        requestAnimationFrame(() => {
            const computedDisplay = window.getComputedStyle(modal).display;
            const computedVisibility = window.getComputedStyle(modal).visibility;
            
            console.log('🔍 Verificación inmediata:', {
                computedDisplay,
                computedVisibility,
                tieneClaseActive: modal.classList.contains('active'),
                tieneClaseHidden: modal.classList.contains('hidden')
            });
            
            if (computedDisplay === 'none' && computedVisibility === 'hidden') {
                console.log('✅✅✅✅✅ Modal cerrado correctamente (verificado en RAF)');
                // Permitir que se abra de nuevo después de un breve delay
                setTimeout(() => {
                    window.modalCerrandose = false;
                    console.log('✅ Flag modalCerrandose reseteado');
                }, 500);
            } else {
                console.error('❌❌❌ ERROR: Modal NO se cerró correctamente!', {
                    display: computedDisplay,
                    visibility: computedVisibility
                });
                // Intentar cerrar de nuevo de forma MÁS agresiva
                console.log('🔧 Aplicando cierre ULTRA forzado...');
                modal.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; z-index: -1 !important; position: fixed !important;';
                
                // Restaurar scroll en el body
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
                document.body.style.height = '';
                document.body.classList.remove('modal-open');
                document.documentElement.style.overflow = '';
                document.documentElement.classList.remove('modal-open');
                
                // También intentar remover del DOM temporalmente
                const parent = modal.parentNode;
                if (parent) {
                    console.log('🔧 Removiendo modal del DOM temporalmente...');
                    parent.removeChild(modal);
                    setTimeout(() => {
                        parent.appendChild(modal);
                        modal.style.cssText = 'display: none !important; visibility: hidden !important;';
                        window.modalCerrandose = false;
                    }, 100);
                } else {
                    window.modalCerrandose = false;
                }
            }
        });
        
        console.log('🔴🔴🔴🔴🔴 cerrarModal() FINALIZADO');
    } catch (error) {
        console.error('❌❌❌ ERROR CRÍTICO en cerrarModal():', error);
        console.error('Stack:', error.stack);
        // Intentar cerrar de todas formas
        try {
            const modal = document.getElementById('content-modal');
            if (modal) {
                modal.style.cssText = 'display: none !important;';
                modal.classList.add('hidden');
                modal.classList.remove('active');
            }
            // Restaurar scroll en el body
            document.body.style.overflow = '';
            document.body.classList.remove('modal-open');
            document.documentElement.style.overflow = '';
        } catch (e2) {
            console.error('Error al intentar cerrar modal en catch:', e2);
        }
    }
}

// Función para cerrar modales de tutor (separada para evitar conflictos)
function cerrarModalTutor() {
    const tutorModal = document.getElementById('tutor-modal');
    if (tutorModal) {
        tutorModal.remove();
        console.log('✅ Modal de tutor removido');
    }
}

// Actualizar estado de conexión en la UI
function updateConnectionStatus(connected) {
    const connectionStatusEl = document.getElementById('connection-status');
    if (connectionStatusEl) {
        if (connected) {
            connectionStatusEl.textContent = 'Conectado';
            connectionStatusEl.style.color = '#4caf50';
            connectionStatusEl.classList.remove('offline');
            connectionStatusEl.classList.add('online');
        } else {
            connectionStatusEl.textContent = 'Desconectado';
            connectionStatusEl.style.color = '#f44336';
            connectionStatusEl.classList.remove('online');
            connectionStatusEl.classList.add('offline');
        }
    }
}

// Actualizar presencia del tutor
function updateTutorPresence(online, tutorNombre) {
    const tutorPresenceEl = document.getElementById('tutor-presence');
    if (tutorPresenceEl) {
        if (online) {
            tutorPresenceEl.textContent = `Tutor ${tutorNombre || ''} está en línea`;
            tutorPresenceEl.style.color = '#4caf50';
        } else {
            tutorPresenceEl.textContent = `Tutor ${tutorNombre || ''} está fuera de línea`;
            tutorPresenceEl.style.color = '#757575';
        }
    }
}

// Exportar funciones globalmente
window.mostrarNotificacion = mostrarNotificacion;
window.cerrarModal = cerrarModal; // Para cerrar el modal de contenido
window.cerrarModalTutor = cerrarModalTutor; // Para cerrar el modal de tutor
window.updateConnectionStatus = updateConnectionStatus;
window.updateTutorPresence = updateTutorPresence;

