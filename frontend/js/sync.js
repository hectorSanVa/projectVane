// Funciones de sincronización

// Sincronizar progreso pendiente con reintentos robustos y backoff exponencial
async function handleSync(retries = 5, baseDelay = 1000) {
    const token = getCurrentToken();
    if (!token) {
        mostrarNotificacion('No hay sesión activa', 'error');
        return;
    }
    
    if (!navigator.onLine) {
        mostrarNotificacion('Sin conexión a Internet. No se puede sincronizar.', 'warning');
        return;
    }
    
    if (!wsClient.isConnected) {
        mostrarNotificacion('No hay conexión con el servidor. Intentando reconectar...', 'warning');
        try {
            await wsClient.connect(token);
        } catch (error) {
            console.error('Error al conectar con el servidor:', error);
            if (retries > 0) {
                const delay = baseDelay * Math.pow(2, 5 - retries); // Backoff exponencial
                console.log(`Reintentando conexión en ${delay}ms... (${retries} intentos restantes)`);
                setTimeout(() => handleSync(retries - 1, baseDelay), delay);
            } else {
                mostrarNotificacion('Error al conectar con el servidor después de múltiples intentos', 'error');
            }
            return;
        }
    }
    
    try {
        if (retries < 5) {
            mostrarNotificacion('Sincronizando...', 'info');
        }
        
        // Obtener progreso pendiente
        const progresosPendientes = await offlineStorage.getProgresosPendientes();
        
        // Obtener mensajes de chat pendientes
        const chatPendiente = await offlineStorage.getChatPendientes();
        
        if (progresosPendientes.length === 0 && chatPendiente.length === 0) {
            if (retries === 5) {
                mostrarNotificacion('No hay datos pendientes de sincronizar', 'success');
            }
            return;
        }
        
        let errores = 0;
        
        // Enviar cada progreso pendiente
        for (const progreso of progresosPendientes) {
            if (!progreso.sincronizado) {
                try {
                    wsClient.send({
                        type: 'SAVE_PROGRESS',
                        curso_id: progreso.curso_id,
                        contenido_id: progreso.contenido_id,
                        avance: progreso.avance,
                        completado: progreso.completado || false
                    });
                    // Pequeño delay entre envíos para no saturar
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (error) {
                    console.error('Error al enviar progreso:', error);
                    errores++;
                }
            }
        }
        
        // Enviar mensajes de chat pendientes
        for (const mensaje of chatPendiente) {
            if (!mensaje.sincronizado) {
                try {
                    wsClient.send({
                        type: 'CHAT_MESSAGE',
                        room: mensaje.room,
                        texto: mensaje.texto
                    });
                    // Pequeño delay entre envíos
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (error) {
                    console.error('Error al enviar mensaje de chat:', error);
                    errores++;
                }
            }
        }
        
        if (errores === 0) {
            mostrarNotificacion('Sincronización completada', 'success');
        } else if (retries > 0) {
            const delay = baseDelay * Math.pow(2, 5 - retries); // Backoff exponencial
            console.log(`Algunos datos no se sincronizaron. Reintentando en ${delay}ms... (${retries} intentos restantes)`);
            setTimeout(() => handleSync(retries - 1, baseDelay), delay);
        } else {
            mostrarNotificacion(`Sincronización completada con ${errores} error(es)`, 'warning');
        }
    } catch (error) {
        console.error('Error en sincronización:', error);
        if (retries > 0) {
            const delay = baseDelay * Math.pow(2, 5 - retries); // Backoff exponencial
            console.log(`Error en sincronización. Reintentando en ${delay}ms... (${retries} intentos restantes)`);
            setTimeout(() => handleSync(retries - 1, baseDelay), delay);
        } else {
            mostrarNotificacion('Error al sincronizar después de múltiples intentos. Intenta más tarde.', 'error');
        }
    }
}

// Exportar funciones
window.handleSync = handleSync;

