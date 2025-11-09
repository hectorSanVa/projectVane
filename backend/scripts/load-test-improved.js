/**
 * Script mejorado de prueba de carga para el servidor WebSocket
 * Prueba: 100 clientes simultáneos enviando SYNC_PROGRESS cada 30 segundos
 * 
 * Uso:
 *   node scripts/load-test-improved.js
 * 
 * Variables de entorno:
 *   NUM_CLIENTS: Número de clientes (default: 100)
 *   SYNC_INTERVAL: Intervalo de sincronización en ms (default: 30000)
 *   TEST_DURATION: Duración de la prueba en ms (default: 300000)
 *   TEST_MATRICULA: Matrícula de prueba (default: estudiante01)
 *   TEST_PASSWORD: Contraseña de prueba (default: estudiante123)
 */
const WebSocket = require('ws');
const http = require('http');

const WS_URL = process.env.WS_URL || 'ws://localhost:8080/ws';
const API_URL = process.env.API_URL || 'http://localhost:8080';
const NUM_CLIENTS = parseInt(process.env.NUM_CLIENTS || '100');
const SYNC_INTERVAL = parseInt(process.env.SYNC_INTERVAL || '30000');
const TEST_DURATION = parseInt(process.env.TEST_DURATION || '300000');
const TEST_MATRICULA = process.env.TEST_MATRICULA || 'estudiante01';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'estudiante123';

let clients = [];
let stats = {
  messagesSent: 0,
  messagesReceived: 0,
  errors: 0,
  connections: 0,
  authenticated: 0,
  syncsCompleted: 0
};
let startTime = Date.now();
let testToken = null;

/**
 * Obtener token de autenticación
 */
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
      },
      timeout: 5000
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
            reject(new Error('No se obtuvo token: ' + body));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout al obtener token'));
    });

    req.write(data);
    req.end();
  });
}

/**
 * Crear cliente WebSocket
 */
function createClient(clientId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const client = {
      id: clientId,
      ws: ws,
      connected: false,
      authenticated: false,
      messageCount: 0,
      errorCount: 0
    };

    const timeout = setTimeout(() => {
      if (!client.connected) {
        reject(new Error(`Timeout conectando cliente ${clientId}`));
      }
    }, 10000);

    ws.on('open', () => {
      clearTimeout(timeout);
      client.connected = true;
      stats.connections++;
      
      // Autenticar
      ws.send(JSON.stringify({
        type: 'AUTH',
        token: testToken
      }));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        stats.messagesReceived++;
        client.messageCount++;
        
        if (message.type === 'AUTH_SUCCESS') {
          client.authenticated = true;
          stats.authenticated++;
          resolve(client);
        } else if (message.type === 'SYNC_PROGRESS_SUCCESS' || message.type === 'SYNC_SUCCESS') {
          stats.syncsCompleted++;
        } else if (message.type === 'ERROR' || message.type === 'AUTH_ERROR') {
          stats.errors++;
          client.errorCount++;
        }
      } catch (error) {
        stats.errors++;
        client.errorCount++;
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      stats.errors++;
      client.errorCount++;
      reject(error);
    });

    ws.on('close', () => {
      client.connected = false;
      client.authenticated = false;
    });
  });
}

/**
 * Enviar SYNC_PROGRESS desde un cliente
 */
function sendSyncProgress(client) {
  if (!client.authenticated || client.ws.readyState !== WebSocket.OPEN) {
    return;
  }

  const progresos = [
    {
      curso_id: 1,
      contenido_id: 1,
      avance: Math.floor(Math.random() * 100),
      completado: false
    }
  ];

  try {
    client.ws.send(JSON.stringify({
      type: 'SYNC_PROGRESS',
      progresos: progresos
    }));
    stats.messagesSent++;
  } catch (error) {
    stats.errors++;
    client.errorCount++;
  }
}

/**
 * Imprimir estadísticas
 */
function printStats() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const activeConnections = clients.filter(c => c.connected).length;
  const authenticated = clients.filter(c => c.authenticated).length;
  
  console.log('\n========================================');
  console.log('  ESTADISTICAS DE PRUEBA DE CARGA');
  console.log('========================================');
  console.log(`Tiempo transcurrido: ${elapsed}s`);
  console.log(`Clientes totales: ${NUM_CLIENTS}`);
  console.log(`Conexiones activas: ${activeConnections}`);
  console.log(`Autenticados: ${authenticated}`);
  console.log(`Mensajes enviados: ${stats.messagesSent}`);
  console.log(`Mensajes recibidos: ${stats.messagesReceived}`);
  console.log(`Sincronizaciones completadas: ${stats.syncsCompleted}`);
  console.log(`Errores: ${stats.errors}`);
  console.log(`Mensajes/segundo: ${(stats.messagesSent / elapsed).toFixed(2)}`);
  console.log('========================================\n');
}

/**
 * Iniciar prueba de carga
 */
async function iniciarPrueba() {
  console.log('Iniciando prueba de carga...\n');
  console.log(`Configuracion:`);
  console.log(`- Clientes: ${NUM_CLIENTS}`);
  console.log(`- Intervalo de sync: ${SYNC_INTERVAL}ms`);
  console.log(`- Duracion: ${TEST_DURATION}ms\n`);

  // Obtener token
  console.log('Obteniendo token de autenticacion...');
  try {
    testToken = await obtenerToken();
    console.log('Token obtenido exitosamente\n');
  } catch (error) {
    console.error('Error al obtener token:', error.message);
    process.exit(1);
  }

  // Crear clientes
  console.log(`Creando ${NUM_CLIENTS} clientes...`);
  const createPromises = [];
  for (let i = 0; i < NUM_CLIENTS; i++) {
    createPromises.push(
      createClient(i + 1)
        .then(client => {
          clients.push(client);
          if (clients.length % 10 === 0) {
            process.stdout.write(`\rClientes creados: ${clients.length}/${NUM_CLIENTS}`);
          }
        })
        .catch(error => {
          console.error(`\nError creando cliente ${i + 1}:`, error.message);
        })
    );
  }

  await Promise.all(createPromises);
  console.log(`\n\n${clients.length} clientes creados`);
  console.log(`${stats.authenticated} clientes autenticados\n`);

  // Iniciar envío periódico de SYNC_PROGRESS
  console.log('Iniciando envio periodico de SYNC_PROGRESS...\n');
  const syncInterval = setInterval(() => {
    clients.forEach(client => {
      if (client.authenticated) {
        sendSyncProgress(client);
      }
    });
  }, SYNC_INTERVAL);

  // Imprimir estadísticas periódicamente
  const statsInterval = setInterval(() => {
    printStats();
  }, 30000); // Cada 30 segundos

  // Finalizar prueba después de TEST_DURATION
  setTimeout(() => {
    console.log('\nFinalizando prueba de carga...\n');
    clearInterval(syncInterval);
    clearInterval(statsInterval);

    // Cerrar todas las conexiones
    clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close();
      }
    });

    // Estadísticas finales
    printStats();

    // Métricas de rendimiento
    const elapsed = (Date.now() - startTime) / 1000;
    const avgMessagesPerSecond = stats.messagesSent / elapsed;
    const successRate = stats.syncsCompleted > 0 
      ? (stats.syncsCompleted / stats.messagesSent) * 100 
      : 0;

    console.log('MÉTRICAS DE RENDIMIENTO:');
    console.log(`- Mensajes promedio por segundo: ${avgMessagesPerSecond.toFixed(2)}`);
    console.log(`- Tasa de éxito: ${successRate.toFixed(2)}%`);
    console.log(`- Tasa de error: ${((stats.errors / stats.messagesSent) * 100).toFixed(2)}%`);
    console.log('');

    process.exit(0);
  }, TEST_DURATION);

  // Manejar señales de terminación
  process.on('SIGINT', () => {
    console.log('\n\nPrueba interrumpida por el usuario');
    clearInterval(syncInterval);
    clearInterval(statsInterval);
    clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close();
      }
    });
    printStats();
    process.exit(0);
  });
}

// Iniciar prueba
iniciarPrueba().catch(error => {
  console.error('Error en la prueba:', error);
  process.exit(1);
});

