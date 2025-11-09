/**
 * Script de prueba de carga para el servidor WebSocket
 * Prueba: 100 clientes simultáneos enviando SYNC_PROGRESS cada 30 segundos
 */
const WebSocket = require('ws');
const http = require('http');

const WS_URL = process.env.WS_URL || 'ws://localhost:8080/ws';
const API_URL = process.env.API_URL || 'http://localhost:8080';
const NUM_CLIENTS = parseInt(process.env.NUM_CLIENTS || '100');
const SYNC_INTERVAL = parseInt(process.env.SYNC_INTERVAL || '30000'); // 30 segundos
const TEST_DURATION = parseInt(process.env.TEST_DURATION || '300000'); // 5 minutos

// Credenciales de prueba
const TEST_MATRICULA = process.env.TEST_MATRICULA || 'estudiante01';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'estudiante123';

let clients = [];
let messagesSent = 0;
let messagesReceived = 0;
let errors = 0;
let startTime = Date.now();
let testToken = null;

// Obtener token de autenticación
async function obtenerToken() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      matricula: TEST_MATRICULA,
      password: TEST_PASSWORD
    });

    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/api/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.token) {
            resolve(response.token);
          } else {
            reject(new Error('No se obtuvo token'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Crear cliente WebSocket
function createClient(clientId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const client = {
      id: clientId,
      ws: ws,
      connected: false,
      authenticated: false,
      messageCount: 0
    };

    ws.on('open', () => {
      client.connected = true;
      
      // Autenticar
      ws.send(JSON.stringify({
        type: 'AUTH',
        token: testToken
      }));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        messagesReceived++;
        client.messageCount++;
        
        if (message.type === 'AUTH_SUCCESS') {
          client.authenticated = true;
          console.log(` Cliente ${clientId} autenticado`);
          resolve(client);
        } else if (message.type === 'SYNC_PROGRESS_SUCCESS') {
          // Progreso sincronizado correctamente
        } else if (message.type === 'ERROR') {
          errors++;
          console.error(` Error en cliente ${clientId}:`, message.error);
        }
      } catch (error) {
        console.error(` Error al procesar mensaje en cliente ${clientId}:`, error);
        errors++;
      }
    });

    ws.on('error', (error) => {
      console.error(` Error en cliente ${clientId}:`, error.message);
      errors++;
      reject(error);
    });

    ws.on('close', () => {
      client.connected = false;
      client.authenticated = false;
    });

    // Timeout para rechazar si no se autentica en 5 segundos
    setTimeout(() => {
      if (!client.authenticated) {
        reject(new Error(`Cliente ${clientId} no se autenticó a tiempo`));
      }
    }, 5000);
  });
}

// Enviar progreso de sincronización
function sendSyncProgress(client) {
  if (!client.authenticated || client.ws.readyState !== WebSocket.OPEN) {
    return;
  }

  const progreso = {
    type: 'SYNC_PROGRESS',
    progresos: [
      {
        curso_id: 1,
        contenido_id: 1,
        avance: Math.floor(Math.random() * 100),
        completado: false
      }
    ]
  };

  client.ws.send(JSON.stringify(progreso));
  messagesSent++;
}

// Crear todos los clientes
async function createClients() {
  console.log(` Creando ${NUM_CLIENTS} clientes...`);
  
  const promises = [];
  for (let i = 1; i <= NUM_CLIENTS; i++) {
    promises.push(createClient(i).catch(error => {
      console.error(` Error al crear cliente ${i}:`, error.message);
      return null;
    }));
  }

  clients = (await Promise.all(promises)).filter(c => c !== null);
  console.log(` ${clients.length} clientes conectados y autenticados`);
}

// Iniciar envío periódico de progreso
function startSendingProgress() {
  console.log(` Iniciando envío de progreso cada ${SYNC_INTERVAL / 1000} segundos...`);
  
  const interval = setInterval(() => {
    clients.forEach(client => {
      if (client.authenticated) {
        sendSyncProgress(client);
      }
    });
  }, SYNC_INTERVAL);

  return interval;
}

// Mostrar estadísticas
function showStats() {
  const elapsed = (Date.now() - startTime) / 1000;
  const messagesPerSecond = messagesSent / elapsed;
  
  console.log('\n Estadísticas:');
  console.log(`   Clientes conectados: ${clients.filter(c => c.connected).length}`);
  console.log(`   Clientes autenticados: ${clients.filter(c => c.authenticated).length}`);
  console.log(`   Mensajes enviados: ${messagesSent}`);
  console.log(`   Mensajes recibidos: ${messagesReceived}`);
  console.log(`   Errores: ${errors}`);
  console.log(`   Tiempo transcurrido: ${elapsed.toFixed(2)}s`);
  console.log(`   Mensajes/segundo: ${messagesPerSecond.toFixed(2)}`);
}

// Función principal
async function main() {
  console.log(' Iniciando prueba de carga...');
  console.log(`   URL: ${WS_URL}`);
  console.log(`   Clientes: ${NUM_CLIENTS}`);
  console.log(`   Intervalo de sincronización: ${SYNC_INTERVAL / 1000}s`);
  console.log(`   Duración: ${TEST_DURATION / 1000}s\n`);

  try {
    await createClients();
    
    if (clients.length === 0) {
      console.error(' No se pudo conectar ningún cliente');
      process.exit(1);
    }

    const interval = startSendingProgress();
    
    // Mostrar estadísticas cada 30 segundos
    const statsInterval = setInterval(showStats, 30000);
    
    // Detener después de TEST_DURATION
    setTimeout(() => {
      clearInterval(interval);
      clearInterval(statsInterval);
      showStats();
      
      // Cerrar todas las conexiones
      clients.forEach(client => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.close();
        }
      });
      
      console.log('\n Prueba de carga completada');
      process.exit(0);
    }, TEST_DURATION);

  } catch (error) {
    console.error(' Error en prueba de carga:', error);
    process.exit(1);
  }
}

// Manejo de señales
process.on('SIGINT', () => {
  console.log('\n Deteniendo prueba de carga...');
  showStats();
  clients.forEach(client => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.close();
    }
  });
  process.exit(0);
});

main();

