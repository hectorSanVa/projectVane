const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
require('dotenv').config();

const { 
  verifyToken, 
  generateToken, 
  generateRefreshToken,
  verifyRefreshToken,
  saveRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  cleanupExpiredTokens
} = require('./middleware/auth');
const { errorHandler, asyncHandler } = require('./middleware/errorHandler');
const validator = require('./utils/validator');
const logger = require('./utils/logger');
const { rateLimiter, loginRateLimiter } = require('./utils/rateLimiter');
const Usuario = require('./models/usuario');
const Progreso = require('./models/progreso');
const Chat = require('./models/chat');
const Curso = require('./models/curso');
const Quiz = require('./models/quiz');
const Asignacion = require('./models/asignacion');
const pool = require('./config/database');

const app = express();
const path = require('path');
app.use(cors());
app.use(express.json());

// Servir archivos estáticos (contenidos) con soporte para range requests (streaming de video)
// express.static ya maneja range requests automáticamente, solo necesitamos configurar headers apropiados
app.use('/contenidos', express.static(path.join(__dirname, 'contenidos'), {
    setHeaders: (res, filePath, stat) => {
        // Para videos, configurar headers apropiados para streaming
        const ext = path.extname(filePath).toLowerCase();
        if (['.mp4', '.webm', '.ogg', '.avi', '.mov'].includes(ext)) {
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            // El Content-Type se establecerá automáticamente según la extensión
        }
        // Habilitar CORS para recursos multimedia
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range');
    },
    dotfiles: 'ignore',
    etag: true,
    lastModified: true
}));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// Almacenar conexiones activas
const connections = new Map(); // userId -> WebSocket
const rooms = new Map(); // room -> Set<WebSocket>

const PORT = process.env.PORT || 8080;

// Middleware de rate limiting (excluir endpoints críticos)
app.use((req, res, next) => {
  // Excluir endpoints que no necesitan rate limiting estricto
  const excludedPaths = ['/api/login', '/health', '/api/cursos', '/contenidos'];
  const isExcluded = excludedPaths.some(path => req.path.startsWith(path));
  
  if (isExcluded) {
    // Para endpoints excluidos, aplicar rate limiting más permisivo
    return next();
  }
  
  const identifier = req.ip || req.connection.remoteAddress;
  if (!rateLimiter.isAllowed(identifier)) {
    const timeUntilReset = Math.ceil(rateLimiter.getTimeUntilReset(identifier) / 1000);
    return res.status(429).json({
      error: 'Demasiadas solicitudes',
      message: `Límite de solicitudes excedido. Intenta de nuevo en ${timeUntilReset} segundos.`
    });
  }
  next();
});

// API REST para autenticación (con rate limiting específico para login)
app.post('/api/login', asyncHandler(async (req, res) => {
  // Rate limiting específico para login (más estricto para prevenir fuerza bruta)
  const identifier = req.ip || req.connection.remoteAddress || 'unknown';
  if (!loginRateLimiter.isAllowed(identifier)) {
    const timeUntilReset = Math.ceil(loginRateLimiter.getTimeUntilReset(identifier) / 1000);
    logger.warn('Intento de login bloqueado por rate limiting', { ip: identifier });
    return res.status(429).json({
      error: 'Demasiados intentos de login',
      message: `Demasiados intentos de inicio de sesión. Intenta de nuevo en ${timeUntilReset} segundos.`
    });
  }

  // Validar solicitud
  const validation = validator.validateLoginRequest(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const { matricula, password } = req.body;
  
  logger.info('Intento de login', { matricula: matricula.trim() });

  const user = await Usuario.authenticate(matricula.trim(), password);
  
  if (!user) {
    logger.warn('Login fallido', { matricula: matricula.trim() });
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  
  // Guardar refresh token en la base de datos
  try {
    await saveRefreshToken(user.id, refreshToken);
  } catch (error) {
    logger.error('Error al guardar refresh token', error, { userId: user.id });
    // Continuar con el login aunque falle guardar el refresh token
  }
  
  logger.info('Login exitoso', { 
    userId: user.id, 
    matricula: user.matricula,
    rol: user.rol 
  });
  
  res.json({
    token,
    refreshToken,
    user: {
      id: user.id,
      matricula: user.matricula,
      rol: user.rol,
      nombre: user.nombre,
      email: user.email
    }
  });
}));

// API REST para renovar token (refresh token)
app.post('/api/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ error: 'Refresh token requerido' });
  }

  try {
    const user = await verifyRefreshToken(refreshToken);
    
    // Generar nuevo token de acceso
    const newToken = generateToken(user.id);
    
    logger.info('Token renovado exitosamente', { 
      userId: user.id, 
      matricula: user.matricula 
    });
    
    res.json({
      token: newToken,
      user: {
        id: user.id,
        matricula: user.matricula,
        rol: user.rol,
        nombre: user.nombre,
        email: user.email
      }
    });
  } catch (error) {
    logger.warn('Error al renovar token', { error: error.message });
    return res.status(401).json({ error: 'Refresh token inválido o expirado' });
  }
}));

// API REST para cerrar sesión (revocar refresh token)
app.post('/api/logout', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (refreshToken) {
    try {
      await revokeRefreshToken(refreshToken);
      logger.info('Refresh token revocado', { refreshToken: refreshToken.substring(0, 20) + '...' });
    } catch (error) {
      logger.error('Error al revocar refresh token', error);
    }
  }

  // Si hay token, intentar obtener el usuario y revocar todos sus tokens
  if (token) {
    try {
      const user = await verifyToken(token);
      await revokeAllRefreshTokens(user.id);
      logger.info('Todos los refresh tokens revocados', { userId: user.id });
    } catch (error) {
      // Si el token es inválido o expirado, no es problema
      logger.debug('No se pudo verificar token para logout', { error: error.message });
    }
  }

  res.json({ message: 'Sesión cerrada exitosamente' });
}));

// API REST para registro de estudiantes
app.post('/api/register/estudiante', asyncHandler(async (req, res) => {
  const { matricula, password, nombre, email } = req.body;
  
  if (!matricula || !password) {
    return res.status(400).json({ error: 'Matrícula y contraseña son requeridos' });
  }
  
  try {
    const usuario = await Usuario.create(matricula, password, 'estudiante', nombre, email);
    logger.info('Estudiante registrado', { matricula: usuario.matricula });
    res.status(201).json({ 
      mensaje: 'Registro exitoso',
      user: {
        id: usuario.id,
        matricula: usuario.matricula,
        rol: usuario.rol,
        nombre: usuario.nombre,
        email: usuario.email
      }
    });
  } catch (error) {
    logger.error('Error en registro de estudiante', error, { matricula });
    res.status(400).json({ error: error.message || 'Error al registrar estudiante' });
  }
}));

// API REST para registro de tutores
app.post('/api/register/tutor', asyncHandler(async (req, res) => {
  const { matricula, password, nombre, email } = req.body;
  
  if (!matricula || !password) {
    return res.status(400).json({ error: 'Matrícula y contraseña son requeridos' });
  }
  
  try {
    const usuario = await Usuario.create(matricula, password, 'tutor', nombre, email);
    logger.info('Tutor registrado', { matricula: usuario.matricula });
    res.status(201).json({ 
      mensaje: 'Registro exitoso',
      user: {
        id: usuario.id,
        matricula: usuario.matricula,
        rol: usuario.rol,
        nombre: usuario.nombre,
        email: usuario.email
      }
    });
  } catch (error) {
    logger.error('Error en registro de tutor', error, { matricula });
    res.status(400).json({ error: error.message || 'Error al registrar tutor' });
  }
}));

// API REST para obtener cursos (públicos, con información del tutor)
app.get('/api/cursos', asyncHandler(async (req, res) => {
  const cursos = await Curso.getAll();
  logger.debug('Cursos obtenidos', { count: cursos.length });
  res.json(cursos);
}));

// API REST para estudiantes: obtener progresos de un curso específico
// IMPORTANTE: Esta ruta debe estar ANTES de /api/estudiante/cursos para evitar conflictos
app.get('/api/estudiante/cursos/:cursoId/progreso', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const user = await verifyToken(token);
  if (!user || user.rol !== 'estudiante') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de estudiante' });
  }

  const cursoId = req.params.cursoId;
  if (!validator.isValidId(cursoId)) {
    return res.status(400).json({ error: 'ID de curso inválido' });
  }

  try {
    const progresos = await Progreso.getByUsuario(user.id, parseInt(cursoId));
    
    // Filtrar progresos con IDs inválidos antes de enviarlos
    const progresosValidos = progresos.filter(prog => {
      const contenidoId = parseInt(prog.contenido_id);
      const cursoIdProg = parseInt(prog.curso_id);
      
      // Validar que los IDs sean números válidos
      if (isNaN(contenidoId) || contenidoId <= 0 || isNaN(cursoIdProg) || cursoIdProg <= 0) {
        logger.warn('Progreso con ID inválido filtrado', {
          progresoId: prog.id,
          contenido_id: prog.contenido_id,
          curso_id: prog.curso_id,
          estudianteId: user.id
        });
        return false;
      }
      
      // Validar que el curso_id coincida con el curso solicitado
      if (cursoIdProg !== parseInt(cursoId)) {
        logger.warn('Progreso con curso_id incorrecto filtrado', {
          progresoId: prog.id,
          contenido_id: prog.contenido_id,
          curso_id: prog.curso_id,
          cursoIdSolicitado: cursoId,
          estudianteId: user.id
        });
        return false;
      }
      
      return true;
    });
    
    logger.debug('Progresos del curso obtenidos', { 
      estudianteId: user.id, 
      cursoId, 
      countTotal: progresos.length,
      countValidos: progresosValidos.length,
      countFiltrados: progresos.length - progresosValidos.length
    });
    
    res.json(progresosValidos);
  } catch (error) {
    logger.error('Error al obtener progresos del curso', error, { 
      estudianteId: user.id, 
      cursoId 
    });
    res.status(500).json({ 
      error: 'Error al obtener progresos del curso', 
      details: error.message 
    });
  }
}));

// API REST para estudiantes: obtener cursos asignados
app.get('/api/estudiante/cursos', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const user = await verifyToken(token);
  if (!user || user.rol !== 'estudiante') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de estudiante' });
  }

  try {
    const cursos = await Asignacion.getCursosDeEstudiante(user.id);
    logger.debug('Cursos de estudiante obtenidos', { estudianteId: user.id, count: cursos.length });
    res.json(cursos);
  } catch (error) {
    logger.error('Error al obtener cursos del estudiante', error, { estudianteId: user.id });
    res.status(500).json({ error: 'Error al obtener cursos del estudiante', details: error.message });
  }
}));

// API REST para estudiantes: obtener cursos disponibles (no asignados)
app.get('/api/estudiante/cursos-disponibles', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const user = await verifyToken(token);
  if (user.rol !== 'estudiante') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de estudiante' });
  }

  const cursos = await Asignacion.getCursosDisponibles(user.id);
  logger.debug('Cursos disponibles obtenidos', { estudianteId: user.id, count: cursos.length });
  res.json(cursos);
}));

// API REST para estudiantes: obtener tutores disponibles con sus cursos
app.get('/api/estudiante/tutores', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    logger.warn('Intento de acceso a /api/estudiante/tutores sin token');
    return res.status(401).json({ error: 'Token requerido' });
  }

  let user;
  try {
    user = await verifyToken(token);
  } catch (authError) {
    logger.error('Error de autenticación al obtener tutores', authError);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  if (user.rol !== 'estudiante') {
    logger.warn('Intento de acceso a /api/estudiante/tutores con rol incorrecto', { 
      userId: user.id, 
      rol: user.rol 
    });
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de estudiante' });
  }

  try {
    // Obtener todos los tutores (incluso si no tienen cursos)
    const tutoresResult = await pool.query(
      `SELECT u.id, u.nombre, u.matricula, u.email
       FROM usuario u
       WHERE u.rol = 'tutor'
       ORDER BY u.nombre, u.matricula`
    );

    logger.debug('Tutores encontrados en BD', { count: tutoresResult.rows.length });

    const tutores = [];
    
    for (const tutor of tutoresResult.rows) {
      try {
        // Obtener cursos del tutor
        const cursosResult = await pool.query(
          `SELECT c.*, 
           CASE WHEN ce.estudiante_id = $1 AND ce.activo = TRUE THEN TRUE ELSE FALSE END as ya_inscrito
           FROM curso c
           LEFT JOIN curso_estudiante ce ON c.id = ce.curso_id AND ce.estudiante_id = $1 AND ce.activo = TRUE
           WHERE c.tutor_id = $2
           ORDER BY c.nombre`,
          [user.id, tutor.id]
        );

        const cursos = cursosResult.rows || [];

        // Incluir todos los tutores, incluso si no tienen cursos
        // Si no tiene cursos, mostrar array vacío
        const cursosDisponibles = cursos.filter(c => !c.ya_inscrito);
        
        tutores.push({
          id: tutor.id,
          nombre: tutor.nombre || tutor.matricula || 'Sin nombre',
          matricula: tutor.matricula,
          email: tutor.email || null,
          cursos: cursos,
          cursos_disponibles: cursosDisponibles.length,
          total_cursos: cursos.length
        });
      } catch (tutorError) {
        logger.error('Error al obtener cursos del tutor', tutorError, { 
          tutorId: tutor.id, 
          estudianteId: user.id 
        });
        // Continuar con el siguiente tutor en lugar de fallar completamente
        // Incluir el tutor sin cursos si hay error
        tutores.push({
          id: tutor.id,
          nombre: tutor.nombre || tutor.matricula || 'Sin nombre',
          matricula: tutor.matricula,
          email: tutor.email || null,
          cursos: [],
          cursos_disponibles: 0,
          total_cursos: 0
        });
      }
    }

    logger.debug('Tutores obtenidos exitosamente', { 
      estudianteId: user.id, 
      count: tutores.length,
      tutoresConCursos: tutores.filter(t => t.total_cursos > 0).length
    });
    
    // Siempre retornar un array, aunque esté vacío
    res.json(tutores);
  } catch (error) {
    logger.error('Error al obtener tutores', error, { 
      estudianteId: user.id,
      errorMessage: error.message,
      errorStack: error.stack
    });
    res.status(500).json({ 
      error: 'Error al obtener tutores',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// API REST para estudiantes: inscribirse a un curso
app.post('/api/estudiante/cursos/:cursoId/inscribirse', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const user = await verifyToken(token);
  if (user.rol !== 'estudiante') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de estudiante' });
  }

  const cursoId = req.params.cursoId;
  if (!validator.isValidId(cursoId)) {
    return res.status(400).json({ error: 'ID de curso inválido' });
  }

  // Verificar que el curso existe
  const curso = await Curso.getById(cursoId);
  if (!curso) {
    return res.status(404).json({ error: 'Curso no encontrado' });
  }

  // Verificar que no esté ya inscrito
  const yaInscrito = await Asignacion.estaAsignado(cursoId, user.id);
  if (yaInscrito) {
    return res.status(400).json({ error: 'Ya estás inscrito en este curso' });
  }

  const asignacion = await Asignacion.asignarEstudianteACurso(cursoId, user.id);
  logger.info('Estudiante inscrito en curso', { cursoId, estudianteId: user.id });
  res.status(201).json({ mensaje: 'Inscripción exitosa', asignacion });
}));

// API REST para obtener contenidos de un curso
app.get('/api/cursos/:id/contenidos', asyncHandler(async (req, res) => {
  const cursoId = req.params.id;
  
  if (!validator.isValidId(cursoId)) {
    return res.status(400).json({ error: 'ID de curso inválido' });
  }

  const contenidos = await Curso.getContenidos(cursoId);
  logger.debug('Contenidos obtenidos', { cursoId, count: contenidos.length });
  res.json(contenidos);
}));

// API REST para obtener preguntas de un quiz
app.get('/api/contenidos/:id/preguntas', asyncHandler(async (req, res) => {
  const contenidoId = req.params.id;
  
  if (!validator.isValidId(contenidoId)) {
    return res.status(400).json({ error: 'ID de contenido inválido' });
  }

  const preguntas = await Quiz.getPreguntas(contenidoId);
  logger.debug('Preguntas obtenidas', { contenidoId, count: preguntas.length });
  res.json(preguntas);
}));

// API REST para guardar respuestas de un quiz
app.post('/api/contenidos/:id/respuestas', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const contenidoId = req.params.id;
  if (!validator.isValidId(contenidoId)) {
    return res.status(400).json({ error: 'ID de contenido inválido' });
  }

  const user = await verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const { respuestas } = req.body;

  if (!Array.isArray(respuestas) || respuestas.length === 0) {
    return res.status(400).json({ error: 'Las respuestas son requeridas' });
  }

  // Verificar número de intentos antes de guardar
  const intentosRealizados = await Quiz.contarIntentos(user.id, contenidoId);
  if (intentosRealizados >= 3) {
    return res.status(400).json({ 
      error: 'Se ha alcanzado el límite máximo de 3 intentos para este cuestionario' 
    });
  }

  // Guardar respuestas con el número de intento
  const { resultados, numeroIntento } = await Quiz.guardarRespuestas(user.id, contenidoId, respuestas);
  
  // Calcular calificación del intento actual
  const calificacionIntento = await Quiz.calcularCalificacion(user.id, contenidoId, numeroIntento);
  
  // Calcular la mejor calificación de todos los intentos
  const mejorCalificacion = await Quiz.calcularCalificacion(user.id, contenidoId);

  // Obtener el curso_id del contenido para actualizar el progreso
  const contenidoResult = await pool.query(
    'SELECT curso_id FROM contenido WHERE id = $1',
    [contenidoId]
  );
  
  const cursoId = contenidoResult.rows[0]?.curso_id;
  
  // Si la calificación es >= 60%, marcar como completado automáticamente
  const aprobado = mejorCalificacion.porcentaje >= 60;
  // El avance del quiz es el porcentaje de la mejor calificación
  // Si aprobó (>=60%), marcar como 100% completado
  // Si no aprobó, usar el porcentaje obtenido como avance
  const avanceQuiz = aprobado ? 100 : mejorCalificacion.porcentaje;
  
  if (cursoId) {
    try {
      // Actualizar progreso del quiz
      const progresoGuardado = await Progreso.saveOrUpdate(
        user.id,
        cursoId,
        contenidoId,
        avanceQuiz,
        aprobado
      );
      
      logger.info('✅ Progreso de quiz actualizado automáticamente', {
        userId: user.id,
        cursoId,
        contenidoId,
        avance: avanceQuiz,
        completado: aprobado,
        calificacion: mejorCalificacion.porcentaje,
        progresoId: progresoGuardado?.id
      });
    } catch (error) {
      logger.error('❌ Error al actualizar progreso del quiz', error, {
        userId: user.id,
        cursoId,
        contenidoId,
        avance: avanceQuiz
      });
      // No fallar la respuesta si el progreso no se puede guardar
      // pero registrar el error
    }
  } else {
    logger.warn('⚠️ No se pudo actualizar progreso del quiz: cursoId no encontrado', {
      userId: user.id,
      contenidoId
    });
  }

  logger.info('Respuestas guardadas', { 
    userId: user.id, 
    contenidoId,
    numeroIntento,
    intentosRealizados: intentosRealizados + 1,
    calificacionIntento: calificacionIntento.porcentaje,
    mejorCalificacion: mejorCalificacion.porcentaje,
    aprobado: aprobado
  });

  res.json({
    mensaje: 'Respuestas guardadas',
    resultados: resultados,
    calificacion: calificacionIntento,
    mejorCalificacion: mejorCalificacion,
    numeroIntento: numeroIntento,
    intentosRealizados: intentosRealizados + 1,
    intentosRestantes: Math.max(0, 3 - (intentosRealizados + 1)),
    aprobado: aprobado
  });
}));

// API REST para obtener calificación de un quiz
app.get('/api/contenidos/:id/calificacion', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const contenidoId = req.params.id;
  if (!validator.isValidId(contenidoId)) {
    return res.status(400).json({ error: 'ID de contenido inválido' });
  }

  const user = await verifyToken(token);
  
  // Obtener la mejor calificación (de todos los intentos)
  const calificacion = await Quiz.calcularCalificacion(user.id, contenidoId);
  
  // Obtener número de intentos realizados
  const intentosRealizados = await Quiz.contarIntentos(user.id, contenidoId);
  
  res.json({
    ...calificacion,
    intentosRealizados: intentosRealizados,
    intentosRestantes: Math.max(0, 3 - intentosRealizados)
  });
}));

// Obtener resultados detallados de un quiz
app.get('/api/contenidos/:id/resultados', asyncHandler(async (req, res) => {
  const contenidoId = req.params.id;
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const user = await verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  if (!validator.isValidId(contenidoId)) {
    return res.status(400).json({ error: 'ID de contenido inválido' });
  }

  const resultados = await Quiz.getResultados(user.id, contenidoId);
  const calificacion = await Quiz.calcularCalificacion(user.id, contenidoId);

  res.json({
    resultados,
    calificacion
  });
}));

// Rutas de tutor (gestión de cursos, contenidos y estudiantes)
const tutorRoutes = require('./routes/tutor');
app.use('/api/tutor', tutorRoutes);

// Servir archivos estáticos del frontend (CSS, JS, imágenes, etc.)
// IMPORTANTE: Debe ir después de las rutas API pero antes del errorHandler
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath, {
  index: false, // No servir index.html automáticamente, lo serviremos manualmente
  setHeaders: (res, filePath) => {
    // Configurar headers apropiados para archivos estáticos
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (ext === '.css') {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (ext === '.js') {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    // Habilitar CORS para archivos estáticos
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Ruta para servir index.html en la raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Ruta catch-all: servir index.html para todas las rutas que no sean API/contenidos/ws
// Esto permite que el frontend maneje el routing (SPA - Single Page Application)
// IMPORTANTE: Esta ruta debe ir DESPUÉS de servir archivos estáticos pero ANTES del errorHandler
app.get('*', (req, res, next) => {
  // Si la ruta comienza con /api, /contenidos, /ws, no servir index.html
  if (req.path.startsWith('/api') || 
      req.path.startsWith('/contenidos') || 
      req.path.startsWith('/ws') ||
      req.path.startsWith('/health')) {
    return next(); // Pasar al siguiente middleware (errorHandler)
  }
  
  // Si la ruta tiene una extensión de archivo común (ej: .css, .js, .png, .jpg, etc.),
  // no servir index.html (dejar que express.static o errorHandler lo maneje)
  const hasExtension = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|xml|txt|pdf|mp4|webm)$/i.test(req.path);
  if (hasExtension) {
    return next(); // Pasar al siguiente middleware (errorHandler para 404)
  }
  
  // Para todas las demás rutas (sin extensión y que no sean API/contenidos/ws),
  // servir index.html para que el frontend maneje el routing SPA
  const indexPath = path.join(frontendPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // Si hay un error al servir index.html, pasar al errorHandler
      logger.error('Error al servir index.html', err);
      next(err);
    }
  });
});

// Middleware de manejo de errores (debe ser el último)
app.use(errorHandler);

// Función para obtener room de chat
function getChatRoom(usuarioId, rol) {
  if (rol === 'tutor') {
    return 'tutor-room';
  }
  return `estudiante-${usuarioId}`;
}

// Manejar conexiones WebSocket
wss.on('connection', async (ws, req) => {
  let user = null;
  let userId = null;
  const clientIp = req.socket.remoteAddress;
  
  logger.info('Nueva conexión WebSocket', { ip: clientIp });

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Validar que el mensaje tenga un tipo
      if (!data.type || typeof data.type !== 'string') {
        ws.send(JSON.stringify({
          type: 'ERROR',
          error: 'Tipo de mensaje inválido'
        }));
        return;
      }
      
      // Manejar autenticación
      if (data.type === 'AUTH') {
        try {
          if (!data.token || typeof data.token !== 'string') {
            throw new Error('Token requerido');
          }

          user = await verifyToken(data.token);
          userId = user.id;
          connections.set(userId, ws);
          
          // Unirse a la sala de chat correspondiente
          const room = getChatRoom(userId, user.rol);
          if (!rooms.has(room)) {
            rooms.set(room, new Set());
          }
          rooms.get(room).add(ws);
          ws.room = room;
          ws.userId = userId;
          ws.userRol = user.rol;
          
          // Si es tutor, también unirse a todas las salas de estudiantes para recibir mensajes
          if (user.rol === 'tutor') {
            // Obtener todos los estudiantes activos
            const estudiantes = await pool.query(
              'SELECT id FROM usuario WHERE rol = $1',
              ['estudiante']
            );
            
            estudiantes.rows.forEach(estudiante => {
              const estudianteRoom = `estudiante-${estudiante.id}`;
              if (!rooms.has(estudianteRoom)) {
                rooms.set(estudianteRoom, new Set());
              }
              rooms.get(estudianteRoom).add(ws);
            });
            
            // Notificar a todos los estudiantes que el tutor está online
            const tutorOnlineMessage = JSON.stringify({
              type: 'TUTOR_ONLINE',
              tutor_id: user.id,
              tutor_nombre: user.nombre || user.matricula
            });
            
            estudiantes.rows.forEach(estudiante => {
              const estudianteRoom = `estudiante-${estudiante.id}`;
              const estudianteRoomSet = rooms.get(estudianteRoom);
              if (estudianteRoomSet) {
                estudianteRoomSet.forEach(client => {
                  // No enviar al mismo WebSocket del tutor
                  if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(tutorOnlineMessage);
                  }
                });
              }
            });
            
            logger.info('Tutor conectado', { tutorId: user.id, nombre: user.nombre });
          }
          
          // Enviar mensajes históricos del chat
          const messages = await Chat.getMessages(room, 50);
          ws.send(JSON.stringify({
            type: 'CHAT_HISTORY',
            messages: messages
          }));
          
          ws.send(JSON.stringify({
            type: 'AUTH_SUCCESS',
            user: user
          }));
          
          logger.info('Usuario autenticado via WebSocket', { 
            userId, 
            nombre: user.nombre, 
            rol: user.rol,
            room 
          });
        } catch (error) {
          logger.warn('Error de autenticación WebSocket', { 
            error: error.message,
            ip: clientIp 
          });
          ws.send(JSON.stringify({
            type: 'AUTH_ERROR',
            error: 'Token inválido o expirado'
          }));
          ws.close();
        }
        return;
      }

      // Requiere autenticación para el resto de operaciones
      if (!user || !userId) {
        ws.send(JSON.stringify({
          type: 'ERROR',
          error: 'No autenticado'
        }));
        return;
      }

      // Manejar sincronización de progreso
      if (data.type === 'SYNC_PROGRESS') {
        try {
          const { progresos } = data;
          
          if (!Array.isArray(progresos)) {
            throw new Error('Progresos debe ser un array');
          }

          if (progresos.length === 0) {
            ws.send(JSON.stringify({
              type: 'SYNC_PROGRESS_SUCCESS',
              message: 'No hay progresos para sincronizar',
              resultados: []
            }));
            return;
          }

          // Validar cada progreso
          for (const progreso of progresos) {
            if (!validator.isValidId(progreso.curso_id) || 
                !validator.isValidId(progreso.contenido_id) ||
                !validator.isValidAvance(progreso.avance)) {
              throw new Error('Datos de progreso inválidos');
            }
          }

          const resultados = await Progreso.syncMultiple(userId, progresos);
          
          ws.send(JSON.stringify({
            type: 'SYNC_PROGRESS_SUCCESS',
            message: `Sincronizados ${resultados.length} progresos`,
            resultados: resultados
          }));
          
          logger.info('Progreso sincronizado', { 
            userId, 
            registros: resultados.length 
          });
        } catch (error) {
          logger.error('Error en SYNC_PROGRESS', error, { userId });
          ws.send(JSON.stringify({
            type: 'SYNC_PROGRESS_ERROR',
            error: error.message || 'Error al sincronizar progreso'
          }));
        }
        return;
      }

      // Manejar guardado de progreso individual
      if (data.type === 'SAVE_PROGRESS') {
        try {
          const { curso_id, contenido_id, avance, completado } = data;
          
          if (!validator.isValidId(curso_id) || !validator.isValidId(contenido_id)) {
            throw new Error('IDs inválidos');
          }
          
          if (!validator.isValidAvance(avance)) {
            throw new Error('Avance inválido (debe ser entre 0 y 100)');
          }

          // Verificar que el curso existe
          const cursoCheck = await pool.query(
            'SELECT id FROM curso WHERE id = $1',
            [curso_id]
          );
          
          if (cursoCheck.rows.length === 0) {
            logger.error('Curso no encontrado al guardar progreso', { userId, curso_id, contenido_id });
            throw new Error(`El curso con ID ${curso_id} no existe`);
          }

          // Verificar que el contenido existe y pertenece al curso
          const contenidoCheck = await pool.query(
            'SELECT id, curso_id FROM contenido WHERE id = $1',
            [contenido_id]
          );
          
          if (contenidoCheck.rows.length === 0) {
            logger.error('Contenido no encontrado al guardar progreso', { userId, curso_id, contenido_id });
            throw new Error(`El contenido con ID ${contenido_id} no existe`);
          }
          
          const contenidoCursoId = contenidoCheck.rows[0].curso_id;
          if (contenidoCursoId !== curso_id) {
            logger.warn('Curso_id del contenido no coincide con el proporcionado', {
              userId,
              curso_id_provided: curso_id,
              curso_id_real: contenidoCursoId,
              contenido_id
            });
            // Usar el curso_id real del contenido en lugar del proporcionado
            const cursoIdReal = contenidoCursoId;
            
            // Verificar que el curso real existe
            const cursoRealCheck = await pool.query(
              'SELECT id FROM curso WHERE id = $1',
              [cursoIdReal]
            );
            
            if (cursoRealCheck.rows.length === 0) {
              throw new Error(`El contenido pertenece a un curso (ID ${cursoIdReal}) que no existe`);
            }
            
            // Guardar con el curso_id correcto
            const resultado = await Progreso.saveOrUpdate(
              userId,
              cursoIdReal,
              contenido_id,
              avance,
              completado
            );
            
            ws.send(JSON.stringify({
              type: 'SAVE_PROGRESS_SUCCESS',
              progreso: resultado
            }));
            
            logger.debug('Progreso guardado (curso_id corregido)', { 
              userId, 
              curso_id_original: curso_id, 
              curso_id_usado: cursoIdReal, 
              contenido_id, 
              avance 
            });
          } else {
            // Guardar normalmente
            const resultado = await Progreso.saveOrUpdate(
              userId,
              curso_id,
              contenido_id,
              avance,
              completado
            );
            
            ws.send(JSON.stringify({
              type: 'SAVE_PROGRESS_SUCCESS',
              progreso: resultado
            }));
            
            logger.debug('Progreso guardado', { userId, curso_id, contenido_id, avance });
          }
        } catch (error) {
          logger.error('Error en SAVE_PROGRESS', error, { 
            userId, 
            curso_id: data.curso_id, 
            contenido_id: data.contenido_id,
            errorMessage: error.message,
            errorCode: error.code
          });
          ws.send(JSON.stringify({
            type: 'SAVE_PROGRESS_ERROR',
            error: error.message || 'Error al guardar progreso'
          }));
        }
        return;
      }

      // Manejar mensajes de chat
      if (data.type === 'CHAT_MESSAGE') {
        try {
          const { texto: textoRaw, room: roomParam, estudiante_id } = data;
          
          if (!textoRaw || typeof textoRaw !== 'string') {
            throw new Error('Texto es requerido');
          }

          const texto = validator.sanitizeChatText(textoRaw, 500);
          
          if (texto.length === 0) {
            throw new Error('El mensaje no puede estar vacío');
          }
          
          const room = roomParam || ws.room || getChatRoom(userId, user.rol);
          
          // Validar que el usuario pertenece al room
          const userRoom = getChatRoom(userId, user.rol);
          if (room !== userRoom && room !== 'tutor-room' && user.rol !== 'tutor') {
            throw new Error('No tienes permiso para enviar mensajes a este room');
          }

          // Guardar mensaje en base de datos
          const mensaje = await Chat.saveMessage(room, userId, texto);
          
          const mensajeConUsuario = {
            ...mensaje,
            nombre: user.nombre,
            rol: user.rol,
            matricula: user.matricula
          };
          
          // Enviar mensaje a todos los clientes en la sala
          // Como los tutores están suscritos a las salas de estudiantes, recibirán los mensajes automáticamente
          const roomClients = rooms.get(room) || new Set();
          roomClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'CHAT_MESSAGE',
                mensaje: mensajeConUsuario
              }));
            }
          });
          
          // Si es tutor enviando a un estudiante específico, también enviar a la sala del estudiante
          if (user.rol === 'tutor' && estudiante_id && validator.isValidId(estudiante_id)) {
            const estudianteRoom = `estudiante-${estudiante_id}`;
            const estudianteClients = rooms.get(estudianteRoom) || new Set();
            // Evitar duplicados: solo enviar a clientes que no estén ya en roomClients
            estudianteClients.forEach(client => {
              if (client.readyState === WebSocket.OPEN && !roomClients.has(client)) {
                client.send(JSON.stringify({
                  type: 'CHAT_MESSAGE',
                  mensaje: mensajeConUsuario
                }));
              }
            });
          }
          
          // Si es estudiante, también notificar a los tutores en tutor-room
          // (los tutores están suscritos a las salas de estudiantes, pero esto asegura que todos los tutores lo vean)
          if (user.rol === 'estudiante') {
            const tutorRoom = 'tutor-room';
            const tutorClients = rooms.get(tutorRoom) || new Set();
            tutorClients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'CHAT_MESSAGE',
                  mensaje: {
                    ...mensajeConUsuario,
                    estudiante_id: userId,
                    estudiante_nombre: user.nombre
                  }
                }));
              }
            });
          }
          
          logger.info('Mensaje de chat enviado', { 
            userId, 
            nombre: user.nombre, 
            room,
            longitud: texto.length 
          });
        } catch (error) {
          logger.error('Error en CHAT_MESSAGE', error, { userId });
          ws.send(JSON.stringify({
            type: 'CHAT_ERROR',
            error: error.message || 'Error al enviar mensaje'
          }));
        }
        return;
      }

      // Obtener historial de chat
      if (data.type === 'GET_CHAT_HISTORY') {
        try {
          const { estudiante_id } = data;
          let messages = [];
          
          if (user.rol === 'tutor') {
            // Tutor puede ver mensajes de todos los estudiantes o de uno específico
            if (estudiante_id && validator.isValidId(estudiante_id)) {
              // Historial de un estudiante específico
              const room = `estudiante-${estudiante_id}`;
              messages = await Chat.getMessages(room, 50);
            } else {
              // Historial combinado: mensajes de la sala del tutor + mensajes de todos los estudiantes
              const tutorRoom = 'tutor-room';
              const tutorMessages = await Chat.getMessages(tutorRoom, 50);
              messages = tutorMessages;
              
              // También obtener mensajes recientes de todos los estudiantes
              const estudiantes = await pool.query(
                'SELECT id FROM usuario WHERE rol = $1',
                ['estudiante']
              );
              
              for (const estudiante of estudiantes.rows) {
                const estudianteRoom = `estudiante-${estudiante.id}`;
                const estudianteMessages = await Chat.getMessages(estudianteRoom, 20);
                messages = messages.concat(estudianteMessages);
              }
              
              // Ordenar por timestamp y tomar los últimos 50
              messages.sort((a, b) => new Date(a.ts) - new Date(b.ts));
              messages = messages.slice(-50);
            }
          } else {
            // Estudiante solicita su propio historial
            const room = getChatRoom(userId, user.rol);
            messages = await Chat.getMessages(room, 50);
          }
          
          ws.send(JSON.stringify({
            type: 'CHAT_HISTORY',
            messages: messages
          }));
          
          logger.debug('Historial de chat solicitado', { userId, rol: user.rol, count: messages.length });
        } catch (error) {
          logger.error('Error en GET_CHAT_HISTORY', error, { userId });
          ws.send(JSON.stringify({
            type: 'ERROR',
            error: error.message || 'Error al obtener historial'
          }));
        }
        return;
      }

      // Obtener progreso del usuario
      if (data.type === 'GET_PROGRESS') {
        try {
          const { curso_id } = data;
          
          if (curso_id && !validator.isValidId(curso_id)) {
            throw new Error('ID de curso inválido');
          }

          const progresos = await Progreso.getByUsuario(userId, curso_id);
          
          ws.send(JSON.stringify({
            type: 'PROGRESS_DATA',
            progresos: progresos
          }));
          
          logger.debug('Progreso solicitado', { userId, curso_id });
        } catch (error) {
          logger.error('Error en GET_PROGRESS', error, { userId });
          ws.send(JSON.stringify({
            type: 'ERROR',
            error: error.message || 'Error al obtener progreso'
          }));
        }
        return;
      }

      // Ping/Pong para mantener conexión activa
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
        return;
      }

      // Tipo de mensaje no reconocido
      logger.warn('Tipo de mensaje WebSocket no reconocido', { 
        type: data.type, 
        userId 
      });
      ws.send(JSON.stringify({
        type: 'ERROR',
        error: `Tipo de mensaje no reconocido: ${data.type}`
      }));

    } catch (error) {
      logger.error('Error al procesar mensaje WebSocket', error, { userId });
      try {
        ws.send(JSON.stringify({
          type: 'ERROR',
          error: 'Error al procesar mensaje'
        }));
      } catch (sendError) {
        logger.error('Error al enviar mensaje de error', sendError);
      }
    }
  });

  ws.on('close', () => {
    if (userId) {
      connections.delete(userId);
      
      // Remover de todas las salas
      if (ws.userRol === 'tutor') {
        // Si es tutor, remover de todas las salas (tutor-room + todas las salas de estudiantes)
        rooms.forEach((clients, roomName) => {
          if (clients.has(ws)) {
            clients.delete(ws);
            if (clients.size === 0 && roomName !== 'tutor-room' && !roomName.startsWith('estudiante-')) {
              // No eliminar salas de estudiantes ni tutor-room, solo limpiar referencias
            }
          }
        });
      } else {
        // Para otros roles, solo remover de su sala
        if (ws.room) {
          const roomClients = rooms.get(ws.room);
          if (roomClients) {
            roomClients.delete(ws);
            if (roomClients.size === 0) {
              rooms.delete(ws.room);
            }
          }
        }
      }
      
      logger.info('Usuario desconectado', { userId, rol: ws.userRol });
    }
  });

  ws.on('error', (error) => {
    logger.error('Error en WebSocket', error, { userId, ip: clientIp });
  });

  // Enviar mensaje de bienvenida
  ws.send(JSON.stringify({
    type: 'CONNECTED',
    message: 'Conexión establecida. Por favor, autentícate con AUTH.'
  }));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: connections.size,
    rooms: rooms.size,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    }
  });
});

// Limpieza periódica de tokens expirados (cada hora)
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hora
setInterval(async () => {
  try {
    const deletedCount = await cleanupExpiredTokens();
    if (deletedCount > 0) {
      logger.info('Tokens expirados limpiados', { count: deletedCount });
    }
  } catch (error) {
    logger.error('Error en limpieza periódica de tokens', error);
  }
}, CLEANUP_INTERVAL);

// Ejecutar limpieza al iniciar el servidor
cleanupExpiredTokens().then(deletedCount => {
  if (deletedCount > 0) {
    logger.info('Limpieza inicial de tokens expirados completada', { count: deletedCount });
  }
}).catch(error => {
  logger.error('Error en limpieza inicial de tokens', error);
});

// Función auxiliar para obtener la IP local
function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Ignorar direcciones no IPv4 o internas
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Iniciar servidor
// Usar 0.0.0.0 para escuchar en todas las interfaces de red (permite acceso desde otros dispositivos)
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  const localUrl = `http://localhost:${PORT}`;
  const networkIP = getLocalIP();
  const networkUrl = `http://${networkIP}:${PORT}`;
  
  logger.info('Servidor iniciado', {
    port: PORT,
    host: HOST,
    local: localUrl,
    network: networkUrl,
    websocket: `ws://${networkIP}:${PORT}/ws`,
    api: `${networkUrl}/api`,
    health: `${networkUrl}/health`,
    environment: process.env.NODE_ENV || 'development',
    note: HOST === '0.0.0.0' ? 'Accesible desde otros dispositivos en la red local' : 'Solo accesible localmente'
  });
  
  console.log('\n✅ Servidor iniciado exitosamente!');
  console.log(`📱 Acceso local: ${localUrl}`);
  console.log(`🌐 Acceso en red: ${networkUrl}`);
  console.log(`💡 Para usar desde otros dispositivos, accede a: ${networkUrl}`);
  console.log(`💡 Asegúrate de actualizar frontend/js/config.js con la IP: ${networkIP}\n`);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Error no capturado', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promise rechazada no manejada', new Error(reason));
});

