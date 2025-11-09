# Documentación de API - Kiosco Educativo

## Base URL
```
http://localhost:8080
```

## Autenticación

La mayoría de los endpoints requieren autenticación mediante JWT. El token se obtiene del endpoint de login y debe enviarse en el header `Authorization` como `Bearer <token>`.

## Endpoints REST

### POST /api/login
Autentica un usuario y devuelve un token JWT.

**Request Body:**
```json
{
  "matricula": "estudiante01",
  "password": "estudiante123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "matricula": "estudiante01",
    "rol": "estudiante",
    "nombre": "Estudiante de Prueba",
    "email": "estudiante@kiosco.edu"
  }
}
```

**Errores:**
- `400`: Datos de solicitud inválidos
- `401`: Credenciales inválidas
- `429`: Demasiadas solicitudes (rate limiting)

---

### GET /api/cursos
Obtiene la lista de todos los cursos disponibles.

**Response (200):**
```json
[
  {
    "id": 1,
    "nombre": "Matemáticas Básicas",
    "descripcion": "Curso introductorio de matemáticas"
  }
]
```

---

### GET /api/cursos/:id/contenidos
Obtiene los contenidos de un curso específico.

**Parámetros:**
- `id` (path): ID del curso

**Response (200):**
```json
[
  {
    "id": 1,
    "curso_id": 1,
    "tipo": "pdf",
    "url_local": "/contenidos/introduccion.pdf",
    "nombre": "Introducción a las Matemáticas",
    "peso_mb": 2.5,
    "orden": 1
  }
]
```

**Errores:**
- `400`: ID de curso inválido
- `500`: Error del servidor

---

### GET /api/contenidos/:id/preguntas
Obtiene las preguntas de un cuestionario (quiz).

**Parámetros:**
- `id` (path): ID del contenido tipo quiz

**Response (200):**
```json
[
  {
    "id": 1,
    "contenido_id": 1,
    "texto": "¿Cuánto es 2 + 2?",
    "tipo": "opcion_multiple",
    "orden": 1,
    "puntaje": 1,
    "opciones": [
      {
        "id": 1,
        "texto": "3",
        "es_correcta": false,
        "orden": 1
      },
      {
        "id": 2,
        "texto": "4",
        "es_correcta": true,
        "orden": 2
      }
    ]
  }
]
```

---

### POST /api/contenidos/:id/respuestas
Guarda las respuestas de un cuestionario.

**Headers:**
```
Authorization: Bearer <token>
```

**Parámetros:**
- `id` (path): ID del contenido tipo quiz

**Request Body:**
```json
{
  "respuestas": [
    {
      "pregunta_id": 1,
      "opcion_id": 2
    },
    {
      "pregunta_id": 2,
      "opcion_id": 5
    }
  ]
}
```

**Response (200):**
```json
{
  "mensaje": "Respuestas guardadas",
  "resultados": [...],
  "calificacion": {
    "total_preguntas": 3,
    "puntaje_obtenido": 2,
    "puntaje_total": 3,
    "porcentaje": 66.67
  }
}
```

---

### GET /api/contenidos/:id/calificacion
Obtiene la calificación de un cuestionario.

**Headers:**
```
Authorization: Bearer <token>
```

**Parámetros:**
- `id` (path): ID del contenido tipo quiz

**Response (200):**
```json
{
  "total_preguntas": 3,
  "puntaje_obtenido": 2,
  "puntaje_total": 3,
  "porcentaje": 66.67
}
```

---

### GET /health
Endpoint de health check del servidor.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "connections": 10,
  "rooms": 5,
  "memory": {
    "used": 50,
    "total": 100
  }
}
```

---

## WebSocket

### Conexión
```
ws://localhost:8080/ws
```

### Autenticación
Primero debes autenticarte enviando un mensaje de tipo `AUTH`:

```json
{
  "type": "AUTH",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Respuesta:**
```json
{
  "type": "AUTH_SUCCESS",
  "user": {
    "id": 1,
    "matricula": "estudiante01",
    "rol": "estudiante",
    "nombre": "Estudiante de Prueba"
  }
}
```

---

### Mensajes WebSocket

#### SYNC_PROGRESS
Sincroniza múltiples progresos offline.

**Request:**
```json
{
  "type": "SYNC_PROGRESS",
  "progresos": [
    {
      "curso_id": 1,
      "contenido_id": 1,
      "avance": 75,
      "completado": false
    }
  ]
}
```

**Response:**
```json
{
  "type": "SYNC_PROGRESS_SUCCESS",
  "message": "Sincronizados 1 progresos",
  "resultados": [...]
}
```

---

#### SAVE_PROGRESS
Guarda o actualiza el progreso de un contenido.

**Request:**
```json
{
  "type": "SAVE_PROGRESS",
  "curso_id": 1,
  "contenido_id": 1,
  "avance": 50,
  "completado": false
}
```

**Response:**
```json
{
  "type": "SAVE_PROGRESS_SUCCESS",
  "progreso": {
    "id": 1,
    "usuario_id": 1,
    "curso_id": 1,
    "contenido_id": 1,
    "avance": 50,
    "completado": false,
    "ts": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### CHAT_MESSAGE
Envía un mensaje de chat.

**Request:**
```json
{
  "type": "CHAT_MESSAGE",
  "texto": "Hola, tengo una pregunta",
  "room": "estudiante-1"
}
```

**Response (broadcast a todos en la sala):**
```json
{
  "type": "CHAT_MESSAGE",
  "mensaje": {
    "id": 1,
    "room": "estudiante-1",
    "usuario_id": 1,
    "texto": "Hola, tengo una pregunta",
    "ts": "2024-01-01T00:00:00.000Z",
    "nombre": "Estudiante de Prueba",
    "rol": "estudiante",
    "matricula": "estudiante01"
  }
}
```

---

#### GET_PROGRESS
Obtiene el progreso del usuario en un curso.

**Request:**
```json
{
  "type": "GET_PROGRESS",
  "curso_id": 1
}
```

**Response:**
```json
{
  "type": "PROGRESS_DATA",
  "progresos": [
    {
      "id": 1,
      "usuario_id": 1,
      "curso_id": 1,
      "contenido_id": 1,
      "avance": 75,
      "completado": false,
      "ts": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### PING
Mantiene la conexión activa (heartbeat).

**Request:**
```json
{
  "type": "PING"
}
```

**Response:**
```json
{
  "type": "PONG"
}
```

---

## Códigos de Error

- `400`: Solicitud inválida (datos mal formados)
- `401`: No autorizado (token inválido o faltante)
- `404`: Recurso no encontrado
- `409`: Conflicto (datos duplicados)
- `429`: Demasiadas solicitudes (rate limiting)
- `500`: Error interno del servidor

---

## Rate Limiting

El servidor implementa rate limiting para prevenir abuso:
- **Límite**: 100 solicitudes por minuto por IP
- **Respuesta 429**: Cuando se excede el límite
- **Header de respuesta**: Incluye información sobre el tiempo hasta el siguiente reset

---

## Seguridad

1. **Autenticación JWT**: Todos los endpoints protegidos requieren un token válido
2. **Sanitización**: Todos los textos de usuario se sanitizan para prevenir XSS
3. **Validación**: Todas las entradas se validan antes de procesarse
4. **Rate Limiting**: Protección contra ataques de fuerza bruta
5. **Hashing de contraseñas**: Las contraseñas se almacenan con bcrypt

---

## Ejemplos de Uso

### Ejemplo completo: Login y obtener cursos

```javascript
// 1. Login
const loginResponse = await fetch('http://localhost:8080/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    matricula: 'estudiante01',
    password: 'estudiante123'
  })
});

const { token, user } = await loginResponse.json();

// 2. Obtener cursos
const cursosResponse = await fetch('http://localhost:8080/api/cursos', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const cursos = await cursosResponse.json();
```

### Ejemplo: WebSocket con sincronización

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onopen = () => {
  // Autenticar
  ws.send(JSON.stringify({
    type: 'AUTH',
    token: token
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'AUTH_SUCCESS') {
    // Sincronizar progreso
    ws.send(JSON.stringify({
      type: 'SYNC_PROGRESS',
      progresos: [
        {
          curso_id: 1,
          contenido_id: 1,
          avance: 75,
          completado: false
        }
      ]
    }));
  }
};
```

