// Aplicación principal - Inicialización y orquestación
// Variables globales compartidas
let cursos = [];
let contenidosActuales = [];
let currentEstudianteId = null;

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar que offlineStorage esté disponible
    if (typeof offlineStorage === 'undefined') {
        console.error('❌ ERROR: offlineStorage no está disponible. Asegúrate de que offline-storage.js se cargue antes que app.js');
        // Intentar esperar un momento y verificar de nuevo
        await new Promise(resolve => setTimeout(resolve, 100));
        if (typeof offlineStorage === 'undefined') {
            console.error('❌ ERROR CRÍTICO: offlineStorage aún no está disponible después de esperar');
            alert('Error: No se pudo inicializar el almacenamiento offline. Por favor, recarga la página.');
            return;
        }
    }
    
    try {
        await offlineStorage.init();
    } catch (error) {
        console.error('Error al inicializar offlineStorage:', error);
        // Continuar de todas formas, pero mostrar advertencia
        console.warn('⚠️ Continuando sin almacenamiento offline. Algunas funcionalidades pueden no estar disponibles.');
    }
    
    // Limpiar progresos duplicados al iniciar (solo una vez)
    try {
        const limpiezaRealizada = localStorage.getItem('progresos_limpiados');
        if (!limpiezaRealizada) {
            const eliminados = await offlineStorage.limpiarProgresosDuplicados();
            if (eliminados > 0) {
                console.log(`Se limpiaron ${eliminados} progresos duplicados`);
            }
            localStorage.setItem('progresos_limpiados', 'true');
        }
    } catch (error) {
        console.warn('Error al limpiar progresos duplicados:', error);
    }
    
    // Limpiar progresos con curso_id inválidos después de cargar cursos
    // Esto se hará después de que el usuario se autentique y se carguen los cursos
    
    // Intentar restaurar sesión guardada
    await iniciarAplicacion();

    // Event listeners
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');
    const syncBtn = document.getElementById('sync-btn');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    if (syncBtn) {
        syncBtn.addEventListener('click', handleSync);
    }
    
    // Event listeners para chat de tutor
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');
    if (sendBtn) {
        sendBtn.addEventListener('click', enviarMensaje);
    }
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                enviarMensaje();
            }
        });
    }
    
    // Event listeners para panel de estudiante
    const dashboardBtn = document.getElementById('student-dashboard-btn');
    const cursosBtn = document.getElementById('student-cursos-btn');
    const chatBtn = document.getElementById('student-chat-btn');
    const studentSendBtn = document.getElementById('student-send-btn');
    const studentChatInput = document.getElementById('student-chat-input');
    
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', () => mostrarVistaEstudiante('dashboard'));
    }
    if (cursosBtn) {
        cursosBtn.addEventListener('click', () => mostrarVistaEstudiante('cursos'));
    }
    if (chatBtn) {
        chatBtn.addEventListener('click', () => mostrarVistaEstudiante('chat'));
    }
    if (studentSendBtn) {
        studentSendBtn.addEventListener('click', enviarMensajeEstudiante);
    }
    if (studentChatInput) {
        studentChatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                enviarMensajeEstudiante();
            }
        });
    }

    // Configurar handlers de WebSocket
    wsClient.onConnectionChange = (connected) => {
        if (typeof updateConnectionStatus === 'function') {
            updateConnectionStatus(connected);
        }
    };
    
    // Detectar cambios en la conexión de Internet
    window.addEventListener('online', () => {
        console.log('Conexión a Internet restaurada');
        if (typeof updateConnectionStatus === 'function') {
            updateConnectionStatus(true);
        }
        const token = getCurrentToken();
        if (token && !wsClient.isConnected) {
            wsClient.connect(token).then(() => {
                mostrarNotificacion('Conexión restaurada. Sincronizando...', 'success');
                setTimeout(() => {
                    if (typeof handleSync === 'function') {
                        handleSync();
                    }
                }, 1000);
            }).catch(err => {
                console.error('Error al reconectar:', err);
            });
        }
    });
    
    window.addEventListener('offline', () => {
        console.log('Conexión a Internet perdida');
        if (typeof updateConnectionStatus === 'function') {
            updateConnectionStatus(false);
        }
        mostrarNotificacion('Sin conexión a Internet. Trabajando en modo offline.', 'warning');
    });
    
    // Verificar estado inicial de conexión
    if (typeof updateConnectionStatus === 'function') {
        updateConnectionStatus(navigator.onLine);
    }

    // Configurar handlers de mensajes WebSocket
    wsClient.onMessage('AUTH_SUCCESS', (data) => {
        setCurrentUser(data.user);
        mostrarPantallaPrincipal();
        if (data.user.rol === 'tutor') {
            // Mostrar panel de tutor y ocultar panel de estudiante
            document.getElementById('tutor-panel').classList.remove('hidden');
            document.getElementById('student-panel').classList.add('hidden');
            setTimeout(() => {
                if (typeof inicializarTutor === 'function') {
                    inicializarTutor();
                }
            }, 100);
        } else if (data.user.rol === 'estudiante') {
            // Mostrar panel de estudiante y ocultar panel de tutor
            document.getElementById('student-panel').classList.remove('hidden');
            document.getElementById('tutor-panel').classList.add('hidden');
            if (typeof mostrarVistaEstudiante === 'function') {
                mostrarVistaEstudiante('dashboard');
            }
            if (typeof cargarCursos === 'function') {
                cargarCursos();
            }
        }
    });
    
    // Handler para cuando se guarda progreso exitosamente
    wsClient.onMessage('SAVE_PROGRESS_SUCCESS', async (data) => {
        console.log('✅ Progreso guardado exitosamente en el servidor:', data.progreso);
        
        // Marcar como sincronizado en IndexedDB
        if (data.progreso && typeof offlineStorage !== 'undefined') {
            try {
                const user = getCurrentUser();
                if (!user) {
                    console.warn('⚠️ No hay usuario actual, no se puede actualizar progreso');
                    return;
                }
                
                // Usar los datos del servidor para actualizar IndexedDB
                const progresoActualizado = {
                    usuario_id: user.id, // Usar el ID del usuario actual
                    curso_id: data.progreso.curso_id,
                    contenido_id: data.progreso.contenido_id,
                    avance: data.progreso.avance,
                    completado: data.progreso.completado || false,
                    sincronizado: true // Marcar como sincronizado
                };
                
                // Guardar el progreso actualizado (con sincronizado = true)
                await offlineStorage.saveProgresoPendiente(progresoActualizado);
                console.log('✅ Progreso marcado como sincronizado en IndexedDB');
                
                // Actualizar la UI del progreso inmediatamente
                if (typeof actualizarProgresoCursos === 'function') {
                    // Usar un delay más corto para actualización más rápida
                    setTimeout(async () => {
                        console.log('🔄 Actualizando UI del progreso después de guardar...');
                        await actualizarProgresoCursos();
                        
                        // También actualizar el dashboard si está visible
                        const dashboardEl = document.getElementById('student-dashboard');
                        if (dashboardEl && !dashboardEl.classList.contains('hidden')) {
                            console.log('🔄 Actualizando dashboard después de guardar progreso...');
                            if (typeof cargarDashboard === 'function') {
                                await cargarDashboard();
                            }
                        }
                    }, 300);
                }
            } catch (error) {
                console.error('❌ Error al marcar progreso como sincronizado:', error);
                console.error('Stack:', error.stack);
            }
        }
    });
    
    // Handler para errores al guardar progreso
    wsClient.onMessage('SAVE_PROGRESS_ERROR', (data) => {
        console.error('❌ Error al guardar progreso en el servidor:', data.error);
        
        // No mostrar notificación para errores de llave foránea (son errores de datos)
        // ya que el backend ahora los maneja correctamente
        const errorMessage = data.error || 'Error desconocido';
        if (errorMessage.includes('llave foránea') || errorMessage.includes('foreign key')) {
            console.warn('⚠️ Error de llave foránea detectado. El backend debería haberlo manejado.');
            // El backend ahora valida antes de guardar, así que esto no debería pasar
        } else {
            // Mostrar notificación solo para otros tipos de errores
            mostrarNotificacion('Error al guardar progreso: ' + errorMessage, 'error');
        }
    });

    wsClient.onMessage('TUTOR_ONLINE', (data) => {
        if (typeof updateTutorPresence === 'function') {
            updateTutorPresence(true, data.tutor_nombre);
        }
    });

    wsClient.onMessage('TUTOR_OFFLINE', (data) => {
        if (typeof updateTutorPresence === 'function') {
            updateTutorPresence(false, data.tutor_nombre);
        }
    });

    // Handler para mensajes de chat
    wsClient.onMessage('CHAT_MESSAGE', (data) => {
        if (data.mensaje && typeof agregarMensajeChat === 'function') {
            agregarMensajeChat(data);
        }
    });

    // Handler para historial de chat
    wsClient.onMessage('CHAT_HISTORY', (data) => {
        const user = getCurrentUser();
        if (!user) return;
        
        const isEstudiante = user.rol === 'estudiante';
        const messagesEl = isEstudiante 
            ? document.getElementById('student-chat-messages')
            : document.getElementById('chat-messages');
        
        if (!messagesEl) return;
        
        // Limpiar mensajes actuales
        messagesEl.innerHTML = '';
        
        // Agregar mensajes del historial
        if (data.messages && Array.isArray(data.messages)) {
            data.messages.forEach(mensaje => {
                agregarMensajeChat(mensaje);
            });
        }
    });

    // Handler para errores de chat
    wsClient.onMessage('CHAT_ERROR', (data) => {
        mostrarNotificacion('Error en el chat: ' + (data.error || 'Error desconocido'), 'error');
    });

    // Iniciar ping periódico
    wsClient.startPing();
});

// Iniciar aplicación (restaurar sesión)
async function iniciarAplicacion() {
    try {
        const auth = await offlineStorage.getAuth();
        if (auth && auth.token && auth.user) {
            console.log('Verificando sesión guardada:', auth.user);
            setCurrentToken(auth.token);
            setCurrentUser(auth.user);
            
            if (typeof quizManager !== 'undefined' && quizManager && typeof quizManager.setToken === 'function') {
                quizManager.setToken(auth.token);
            }
            
            console.log('Sesión encontrada, restaurando...');
            
            try {
                await wsClient.connect(auth.token);
            } catch (wsError) {
                console.warn('Error al conectar WebSocket (continuando):', wsError);
            }
            
            mostrarPantallaPrincipal();
            
            if (auth.user.rol === 'tutor') {
                console.log('Restaurando sesión de tutor, mostrando panel...');
                const tutorPanel = document.getElementById('tutor-panel');
                const studentPanel = document.getElementById('student-panel');
                if (tutorPanel) {
                    tutorPanel.classList.remove('hidden');
                    console.log('Panel de tutor mostrado');
                }
                if (studentPanel) {
                    studentPanel.classList.add('hidden');
                }
                setTimeout(() => {
                    console.log('Inicializando tutor después de restaurar sesión...');
                    if (typeof inicializarTutor === 'function') {
                        inicializarTutor();
                    } else {
                        console.error('ERROR: inicializarTutor no está definida');
                    }
                }, 300);
            } else if (auth.user.rol === 'estudiante') {
                document.getElementById('student-panel').classList.remove('hidden');
                document.getElementById('tutor-panel').classList.add('hidden');
                if (typeof mostrarVistaEstudiante === 'function') {
                    mostrarVistaEstudiante('dashboard');
                }
                if (typeof cargarCursos === 'function') {
                    cargarCursos();
                }
                
                if (navigator.onLine && wsClient.isConnected) {
                    setTimeout(async () => {
                        if (typeof descargarContenidosAutomaticamente === 'function') {
                            await descargarContenidosAutomaticamente();
                        }
                    }, 2000);
                }
            }
        } else {
            console.log('No hay sesión guardada, mostrando pantalla de login');
            wsClient.disconnect();
            mostrarPantallaLogin();
        }
    } catch (error) {
        console.error('Error al iniciar aplicación:', error);
        mostrarPantallaLogin();
    }
}

// Descargar contenidos automáticamente después del login
async function descargarContenidosAutomaticamente() {
    try {
        const user = getCurrentUser();
        if (!user || user.rol !== 'estudiante') {
            return;
        }
        
        console.log('Iniciando descarga automática de contenidos...');
        
        if (typeof cargarCursos === 'function') {
            await cargarCursos();
        }
        
        if (cursos.length === 0) {
            console.log('No hay cursos asignados para descargar contenidos');
            return;
        }
        
        const token = getCurrentToken();
        for (const curso of cursos) {
            try {
                const response = await fetchApi(`/api/cursos/${curso.id}/contenidos`);
                
                if (response.ok) {
                    const contenidos = await response.json();
                    console.log(`Descargando contenidos del curso ${curso.nombre}...`);
                    
                    for (const contenido of contenidos) {
                        const yaDescargado = await offlineStorage.isContenidoDescargado(contenido.id);
                        if (!yaDescargado && contenido.url_local) {
                            try {
                                if (typeof descargarContenido === 'function') {
                                    await descargarContenido(contenido.id);
                                }
                                console.log(`Contenido ${contenido.nombre} descargado`);
                            } catch (error) {
                                console.error(`Error al descargar contenido ${contenido.id}:`, error);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`Error al obtener contenidos del curso ${curso.id}:`, error);
            }
        }
        
        console.log('Descarga automática de contenidos completada');
    } catch (error) {
        console.error('Error en descarga automática de contenidos:', error);
    }
}

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
    const modal = document.getElementById('content-modal');
    if (e.target === modal) {
        cerrarModal();
    }
});

// Exportar variables globales
window.cursos = cursos;
window.contenidosActuales = contenidosActuales;
window.currentEstudianteId = currentEstudianteId;
window.descargarContenidosAutomaticamente = descargarContenidosAutomaticamente;
window.iniciarAplicacion = iniciarAplicacion;

// Funciones para acceder/modificar currentEstudianteId desde otros módulos
window.getCurrentEstudianteId = () => currentEstudianteId;
window.setCurrentEstudianteId = (id) => { currentEstudianteId = id; };
