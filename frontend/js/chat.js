// Funciones de chat para estudiante y tutor
// Nota: currentEstudianteId está declarada en app.js como variable global

// Enviar mensaje desde el panel de tutor
function enviarMensaje() {
    const chatInput = document.getElementById('chat-input');
    if (!chatInput || !chatInput.value.trim()) return;
    
    const user = getCurrentUser();
    if (!user || user.rol !== 'tutor') {
        mostrarNotificacion('Error: No eres un tutor', 'error');
        return;
    }
    
    if (!currentEstudianteId) {
        mostrarNotificacion('Selecciona un estudiante primero', 'warning');
        return;
    }
    
    const texto = chatInput.value.trim();
    const room = `estudiante-${currentEstudianteId}`;
    
    if (navigator.onLine && wsClient.isConnected) {
        wsClient.send({
            type: 'CHAT_MESSAGE',
            room: room,
            texto: texto,
            estudiante_id: currentEstudianteId
        });
    } else {
        // Guardar para enviar después
        offlineStorage.saveChatPendiente(room, texto);
        agregarMensajeChat({
            texto: texto,
            usuario_id: user.id,
            usuario_nombre: user.nombre || user.matricula,
            timestamp: new Date().toISOString(),
            ts: new Date().toISOString()
        });
    }
    
    chatInput.value = '';
}

// Enviar mensaje desde el panel de estudiante
function enviarMensajeEstudiante() {
    const chatInput = document.getElementById('student-chat-input');
    if (!chatInput || !chatInput.value.trim()) return;
    
    const texto = chatInput.value.trim();
    const user = getCurrentUser();
    
    if (!user || user.rol !== 'estudiante') {
        mostrarNotificacion('Error: No eres un estudiante', 'error');
        return;
    }
    
    const room = `estudiante-${user.id}`;
    
    if (navigator.onLine && wsClient.isConnected) {
        wsClient.send({
            type: 'CHAT_MESSAGE',
            room: room,
            texto: texto
        });
    } else {
        // Guardar para enviar después
        offlineStorage.saveChatPendiente(room, texto);
        agregarMensajeChat({
            texto: texto,
            usuario_id: user.id,
            usuario_nombre: user.nombre || user.matricula,
            timestamp: new Date().toISOString(),
            ts: new Date().toISOString()
        });
    }
    
    chatInput.value = '';
}

// Agregar mensaje al chat
function agregarMensajeChat(mensaje) {
    const user = getCurrentUser();
    if (!user) return;
    
    // Manejar formato de mensaje del backend (puede venir como mensaje.mensaje)
    const mensajeData = mensaje.mensaje || mensaje;
    
    const isEstudiante = user.rol === 'estudiante';
    const messagesEl = isEstudiante 
        ? document.getElementById('student-chat-messages')
        : document.getElementById('chat-messages');
    
    if (!messagesEl) {
        console.warn('No se encontró el elemento de mensajes de chat');
        return;
    }
    
    const messageDiv = document.createElement('div');
    const isOwn = mensajeData.usuario_id === user.id;
    messageDiv.className = `message ${isOwn ? 'message-own' : ''}`;
    
    const fecha = new Date(mensajeData.timestamp || mensajeData.ts || new Date());
    const hora = fecha.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Obtener nombre del mensaje
    const nombreDisplay = mensajeData.nombre || mensajeData.usuario_nombre || 'Usuario';
    const textoMensaje = mensajeData.texto || mensajeData.text || '';
    
    // Solo mostrar nombre si no es propio
    messageDiv.innerHTML = `
        ${!isOwn ? `<div class="message-header">
            <strong>${nombreDisplay}</strong>
            <span class="message-time">${hora}</span>
        </div>` : `<div class="message-header">
            <span class="message-time">${hora}</span>
        </div>`}
        <div class="message-text">${textoMensaje}</div>
    `;
    
    messagesEl.appendChild(messageDiv);
    
    // Scroll suave al final
    setTimeout(() => {
        messagesEl.scrollTo({
            top: messagesEl.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);
}

// Seleccionar estudiante (para tutor)
function seleccionarEstudiante(estudianteId) {
    if (typeof setCurrentEstudianteId === 'function') {
        setCurrentEstudianteId(estudianteId);
    } else {
        // Fallback: usar variable global si la función no existe
        if (typeof window !== 'undefined' && window.currentEstudianteId !== undefined) {
            window.currentEstudianteId = estudianteId;
        }
    }
    currentEstudianteId = estudianteId;
    
    // Actualizar UI
    document.querySelectorAll('.estudiante-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const estudianteItem = document.querySelector(`[data-estudiante-id="${estudianteId}"]`);
    if (estudianteItem) {
        estudianteItem.classList.add('selected');
    }
    
    // Limpiar mensajes actuales
    const messagesEl = document.getElementById('chat-messages');
    if (messagesEl) {
        messagesEl.innerHTML = '';
    }
    
    // Solicitar historial de chat
    if (wsClient && wsClient.isConnected) {
        wsClient.send({
            type: 'GET_CHAT_HISTORY',
            estudiante_id: estudianteId
        });
    } else {
        console.warn('WebSocket no conectado, no se puede solicitar historial de chat');
    }
}

// Exportar funciones
window.enviarMensaje = enviarMensaje;
window.enviarMensajeEstudiante = enviarMensajeEstudiante;
window.agregarMensajeChat = agregarMensajeChat;
window.seleccionarEstudiante = seleccionarEstudiante;

