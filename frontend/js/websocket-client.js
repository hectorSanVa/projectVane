// Cliente WebSocket para comunicación con el servidor
class WebSocketClient {
    constructor() {
        this.ws = null;
        // Usar configuración global o valores por defecto
        const wsUrl = (window.Config && window.Config.WS_URL) || 'ws://localhost:8080';
        this.url = `${wsUrl}/ws`;
        this.reconnectInterval = (window.Config && window.Config.WS_RECONNECT_INTERVAL) || 1000; // Base delay para backoff exponencial
        this.maxReconnectAttempts = (window.Config && window.Config.WS_MAX_RECONNECT_ATTEMPTS) || 5;
        this.reconnectAttempts = 0;
        this.isConnected = false;
        this.shouldReconnect = true;
        this.messageHandlers = new Map();
        this.onConnectionChange = null;
        this.currentToken = null;
        this.reconnectTimeout = null;
    }

    connect(token) {
        // Cancelar cualquier reconexión pendiente
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        
        this.shouldReconnect = true;
        this.currentToken = token;
        
        return new Promise((resolve, reject) => {
            try {
                // Cerrar conexión existente si hay una
                if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
                    this.ws.close();
                }
                
                this.ws = new WebSocket(this.url);

                this.ws.onopen = () => {
                    console.log('Conexion WebSocket establecida');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.updateConnectionStatus(true);
                    
                    // Autenticar
                    if (this.currentToken) {
                        this.send({
                            type: 'AUTH',
                            token: this.currentToken
                        });
                    }
                    
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleMessage(data);
                    } catch (error) {
                        console.error('Error al procesar mensaje:', error);
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('Error en WebSocket:', error);
                    this.updateConnectionStatus(false);
                    reject(error);
                };

                this.ws.onclose = (event) => {
                    console.log('Conexion WebSocket cerrada');
                    this.isConnected = false;
                    this.updateConnectionStatus(false);
                    
                    // Solo reconectar si shouldReconnect es true y tenemos un token
                    if (this.shouldReconnect && this.currentToken && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        // Backoff exponencial: delay = baseDelay * 2^(intento-1)
                        const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
                        console.log(`Intentando reconectar en ${delay}ms... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                        this.reconnectTimeout = setTimeout(() => {
                            if (this.shouldReconnect && this.currentToken) {
                                this.connect(this.currentToken);
                            }
                        }, delay);
                    } else {
                        console.log('Reconexion deshabilitada o sin token');
                    }
                };

            } catch (error) {
                console.error('Error al conectar WebSocket:', error);
                reject(error);
            }
        });
    }

    handleMessage(data) {
        // Llamar handlers específicos primero
        if (this.messageHandlers.has(data.type)) {
            this.messageHandlers.get(data.type)(data);
        }
        
        // También llamar handlers temporales (para promesas)
        if (data.type === 'SYNC_PROGRESS_SUCCESS' && this.messageHandlers.has('SYNC_PROGRESS_SUCCESS_TEMP')) {
            this.messageHandlers.get('SYNC_PROGRESS_SUCCESS_TEMP')(data);
        }

        // Handler genérico
        if (data.type === 'AUTH_SUCCESS') {
            console.log('Autenticacion exitosa');
            // Intentar sincronizar automáticamente después de autenticar
            if (typeof handleSync === 'function' && navigator.onLine) {
                setTimeout(() => {
                    handleSync();
                }, 1000);
            }
        } else if (data.type === 'AUTH_ERROR') {
            console.error('Error de autenticacion:', data.error);
        } else if (data.type === 'ERROR') {
            console.error('Error:', data.error);
        } else if (data.type === 'PONG') {
            // Respuesta al ping, conexión activa
        }
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket no esta conectado. Mensaje guardado para envio posterior.');
            // Guardar en IndexedDB para enviar cuando se reconecte
            if (data.type === 'SAVE_PROGRESS') {
                offlineStorage.saveProgresoPendiente(data);
            } else if (data.type === 'CHAT_MESSAGE') {
                offlineStorage.saveChatPendiente(data.room, data.text);
            }
        }
    }

    onMessage(type, handler) {
        this.messageHandlers.set(type, handler);
    }

    updateConnectionStatus(connected) {
        if (this.onConnectionChange) {
            this.onConnectionChange(connected);
        }
    }

    disconnect() {
        // Deshabilitar reconexión automática
        this.shouldReconnect = false;
        this.currentToken = null;
        
        // Cancelar cualquier reconexión pendiente
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        
        // Cerrar conexión
        if (this.ws) {
            // Remover listeners para evitar que se active el reconectar
            this.ws.onclose = null;
            this.ws.close();
            this.ws = null;
        }
        
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.updateConnectionStatus(false);
        console.log('WebSocket desconectado y reconexion deshabilitada');
    }

    // Ping periódico para mantener conexión activa
    startPing() {
        setInterval(() => {
            if (this.isConnected) {
                this.send({ type: 'PING' });
            }
        }, 30000); // Cada 30 segundos
    }
}

// Instancia global
const wsClient = new WebSocketClient();

