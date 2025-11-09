/**
 * Rutas para tutores: gestionar cursos, contenidos y asignaciones
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const validator = require('../utils/validator');
const logger = require('../utils/logger');
const Curso = require('../models/curso');
const Asignacion = require('../models/asignacion');
const Quiz = require('../models/quiz');
const Progreso = require('../models/progreso');
const pool = require('../config/database');

// Configurar multer para subir archivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../contenidos');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB máximo
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.mp4', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo PDF, MP4 y TXT'));
    }
  }
});

// Middleware para verificar que el usuario es tutor
const requireTutor = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const user = await verifyToken(token);
  if (user.rol !== 'tutor') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de tutor' });
  }

  req.user = user;
  next();
});

// ==================== CURSOS ====================

// Obtener cursos del tutor
router.get('/cursos', requireTutor, asyncHandler(async (req, res) => {
  const cursos = await Curso.getByTutor(req.user.id);
  res.json(cursos);
}));

// Crear curso
router.post('/cursos', requireTutor, asyncHandler(async (req, res) => {
  const { nombre, descripcion } = req.body;

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
    return res.status(400).json({ error: 'El nombre del curso es requerido' });
  }

  // Sanitizar entrada
  const nombreSanitizado = validator.sanitizeText(nombre, 200);
  const descripcionSanitizada = descripcion ? validator.sanitizeText(descripcion, 1000) : null;

  if (nombreSanitizado.length === 0) {
    return res.status(400).json({ error: 'El nombre del curso no puede estar vacío después de sanitización' });
  }

  const result = await pool.query(
    'INSERT INTO curso (nombre, descripcion, tutor_id) VALUES ($1, $2, $3) RETURNING *',
    [nombreSanitizado, descripcionSanitizada, req.user.id]
  );

  logger.info('Curso creado por tutor', { cursoId: result.rows[0].id, nombre, tutorId: req.user.id });
  res.status(201).json(result.rows[0]);
}));

// Editar curso (solo si es del tutor)
router.put('/cursos/:id', requireTutor, asyncHandler(async (req, res) => {
  const cursoId = req.params.id;
  const { nombre, descripcion } = req.body;

  if (!validator.isValidId(cursoId)) {
    return res.status(400).json({ error: 'ID de curso inválido' });
  }

  // Verificar que el curso pertenece al tutor
  const curso = await Curso.getById(cursoId);
  if (!curso) {
    return res.status(404).json({ error: 'Curso no encontrado' });
  }
  if (curso.tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para editar este curso' });
  }

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
    return res.status(400).json({ error: 'El nombre del curso es requerido' });
  }

  // Sanitizar entrada
  const nombreSanitizado = validator.sanitizeText(nombre, 200);
  const descripcionSanitizada = descripcion ? validator.sanitizeText(descripcion, 1000) : null;

  if (nombreSanitizado.length === 0) {
    return res.status(400).json({ error: 'El nombre del curso no puede estar vacío después de sanitización' });
  }

  const result = await pool.query(
    'UPDATE curso SET nombre = $1, descripcion = $2 WHERE id = $3 RETURNING *',
    [nombreSanitizado, descripcionSanitizada, cursoId]
  );

  logger.info('Curso actualizado por tutor', { cursoId, nombre, tutorId: req.user.id });
  res.json(result.rows[0]);
}));

// Eliminar curso (solo si es del tutor)
router.delete('/cursos/:id', requireTutor, asyncHandler(async (req, res) => {
  const cursoId = req.params.id;

  if (!validator.isValidId(cursoId)) {
    return res.status(400).json({ error: 'ID de curso inválido' });
  }

  // Verificar que el curso pertenece al tutor
  const curso = await Curso.getById(cursoId);
  if (!curso) {
    return res.status(404).json({ error: 'Curso no encontrado' });
  }
  if (curso.tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para eliminar este curso' });
  }

  await pool.query('DELETE FROM curso WHERE id = $1', [cursoId]);

  logger.info('Curso eliminado por tutor', { cursoId, tutorId: req.user.id });
  res.json({ mensaje: 'Curso eliminado exitosamente' });
}));

// ==================== ESTUDIANTES ====================

// Obtener estudiantes del tutor (a través de sus cursos)
router.get('/estudiantes', requireTutor, asyncHandler(async (req, res) => {
  const estudiantes = await Asignacion.getEstudiantesDeTutor(req.user.id);
  res.json(estudiantes);
}));

// Obtener todos los estudiantes del sistema (para asignar a cursos)
router.get('/estudiantes/todos', requireTutor, asyncHandler(async (req, res) => {
  const estudiantes = await Asignacion.getTodosLosEstudiantes();
  res.json(estudiantes);
}));

// Obtener estudiantes de un curso específico
router.get('/cursos/:cursoId/estudiantes', requireTutor, asyncHandler(async (req, res) => {
  const cursoId = req.params.cursoId;

  if (!validator.isValidId(cursoId)) {
    return res.status(400).json({ error: 'ID de curso inválido' });
  }

  // Verificar que el curso pertenece al tutor
  const curso = await Curso.getById(cursoId);
  if (!curso || curso.tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para ver este curso' });
  }

  const estudiantes = await Asignacion.getEstudiantesDeCurso(cursoId);
  res.json(estudiantes);
}));

// Asignar estudiante a curso
router.post('/cursos/:cursoId/estudiantes/:estudianteId', requireTutor, asyncHandler(async (req, res) => {
  const cursoId = req.params.cursoId;
  const estudianteId = req.params.estudianteId;

  if (!validator.isValidId(cursoId) || !validator.isValidId(estudianteId)) {
    return res.status(400).json({ error: 'IDs inválidos' });
  }

  // Verificar que el curso pertenece al tutor
  const curso = await Curso.getById(cursoId);
  if (!curso || curso.tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para asignar estudiantes a este curso' });
  }

  // Verificar que el usuario es estudiante
  const estudiante = await pool.query('SELECT id, rol FROM usuario WHERE id = $1', [estudianteId]);
  if (estudiante.rows.length === 0 || estudiante.rows[0].rol !== 'estudiante') {
    return res.status(404).json({ error: 'Estudiante no encontrado' });
  }

  const asignacion = await Asignacion.asignarEstudianteACurso(cursoId, estudianteId);
  logger.info('Estudiante asignado a curso por tutor', { cursoId, estudianteId, tutorId: req.user.id });
  res.status(201).json(asignacion);
}));

// Desasignar estudiante de curso
router.delete('/cursos/:cursoId/estudiantes/:estudianteId', requireTutor, asyncHandler(async (req, res) => {
  const cursoId = req.params.cursoId;
  const estudianteId = req.params.estudianteId;

  if (!validator.isValidId(cursoId) || !validator.isValidId(estudianteId)) {
    return res.status(400).json({ error: 'IDs inválidos' });
  }

  // Verificar que el curso pertenece al tutor
  const curso = await Curso.getById(cursoId);
  if (!curso || curso.tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para desasignar estudiantes de este curso' });
  }

  const desasignado = await Asignacion.desasignarEstudianteDeCurso(cursoId, estudianteId);
  if (!desasignado) {
    return res.status(404).json({ error: 'Asignación no encontrada' });
  }

  logger.info('Estudiante desasignado de curso por tutor', { cursoId, estudianteId, tutorId: req.user.id });
  res.json({ mensaje: 'Estudiante desasignado exitosamente' });
}));

// ==================== PROGRESO Y CALIFICACIONES ====================

// Obtener progreso de todos los estudiantes del tutor
router.get('/estudiantes/progreso', requireTutor, asyncHandler(async (req, res) => {
  try {
    logger.info('Obteniendo progreso de estudiantes del tutor', { tutorId: req.user.id });
    const progresos = await Progreso.getProgresoEstudiantesDeTutor(req.user.id);
    logger.info('Progresos obtenidos exitosamente', { tutorId: req.user.id, count: progresos.length });
    res.json(progresos);
  } catch (error) {
    logger.error('Error en endpoint /estudiantes/progreso', error, { tutorId: req.user.id });
    res.status(500).json({ error: 'Error al obtener progreso', message: error.message });
  }
}));

// Obtener progreso de estudiantes de un curso específico
router.get('/cursos/:cursoId/progreso', requireTutor, asyncHandler(async (req, res) => {
  const cursoId = req.params.cursoId;

  if (!validator.isValidId(cursoId)) {
    return res.status(400).json({ error: 'ID de curso inválido' });
  }

  // Verificar que el curso pertenece al tutor
  const curso = await Curso.getById(cursoId);
  if (!curso || curso.tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para ver este curso' });
  }

  const progresos = await Progreso.getProgresoEstudiantesDeCurso(cursoId);
  res.json(progresos);
}));

// Obtener progreso general de un estudiante en un curso
router.get('/cursos/:cursoId/estudiantes/:estudianteId/progreso', requireTutor, asyncHandler(async (req, res) => {
  const cursoId = req.params.cursoId;
  const estudianteId = req.params.estudianteId;

  if (!validator.isValidId(cursoId) || !validator.isValidId(estudianteId)) {
    return res.status(400).json({ error: 'IDs inválidos' });
  }

  // Verificar que el curso pertenece al tutor
  const curso = await Curso.getById(cursoId);
  if (!curso || curso.tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para ver este curso' });
  }

  // Verificar que el estudiante está asignado al curso
  const estaAsignado = await Asignacion.estaAsignado(cursoId, estudianteId);
  if (!estaAsignado) {
    return res.status(404).json({ error: 'El estudiante no está asignado a este curso' });
  }

  const progresoGeneral = await Progreso.getProgresoGeneralEstudianteCurso(estudianteId, cursoId);
  const progresoDetallado = await Progreso.getByUsuario(estudianteId, cursoId);
  
  res.json({
    general: progresoGeneral,
    detallado: progresoDetallado
  });
}));

// Obtener calificaciones de exámenes de estudiantes del tutor
router.get('/estudiantes/calificaciones', requireTutor, asyncHandler(async (req, res) => {
  try {
    logger.info('Obteniendo calificaciones de estudiantes del tutor', { tutorId: req.user.id });
    const calificaciones = await Quiz.getCalificacionesEstudiantesDeTutor(req.user.id);
    logger.info('Calificaciones obtenidas exitosamente', { tutorId: req.user.id, count: calificaciones.length });
    res.json(calificaciones);
  } catch (error) {
    logger.error('Error en endpoint /estudiantes/calificaciones', error, { tutorId: req.user.id });
    res.status(500).json({ error: 'Error al obtener calificaciones', message: error.message });
  }
}));

// Obtener calificaciones de exámenes de un curso específico
router.get('/cursos/:cursoId/calificaciones', requireTutor, asyncHandler(async (req, res) => {
  const cursoId = req.params.cursoId;

  if (!validator.isValidId(cursoId)) {
    return res.status(400).json({ error: 'ID de curso inválido' });
  }

  // Verificar que el curso pertenece al tutor
  const curso = await Curso.getById(cursoId);
  if (!curso || curso.tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para ver este curso' });
  }

  const calificaciones = await Quiz.getCalificacionesEstudiantesDeCurso(cursoId);
  res.json(calificaciones);
}));

// ==================== CONTENIDOS ====================

// Obtener contenidos de un curso (solo si es del tutor)
router.get('/cursos/:cursoId/contenidos', requireTutor, asyncHandler(async (req, res) => {
  const cursoId = req.params.cursoId;

  if (!validator.isValidId(cursoId)) {
    return res.status(400).json({ error: 'ID de curso inválido' });
  }

  // Verificar que el curso pertenece al tutor
  const curso = await Curso.getById(cursoId);
  if (!curso || curso.tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para ver este curso' });
  }

  const contenidos = await Curso.getContenidos(cursoId);
  res.json(contenidos);
}));

// Crear contenido (solo si el curso es del tutor)
router.post('/cursos/:cursoId/contenidos', requireTutor, upload.single('archivo'), asyncHandler(async (req, res) => {
  const cursoId = req.params.cursoId;
  const { tipo, nombre, orden } = req.body;

  if (!validator.isValidId(cursoId)) {
    return res.status(400).json({ error: 'ID de curso inválido' });
  }

  // Verificar que el curso pertenece al tutor
  const curso = await Curso.getById(cursoId);
  if (!curso || curso.tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para agregar contenidos a este curso' });
  }

  if (!validator.isValidTipoContenido(tipo)) {
    return res.status(400).json({ error: 'Tipo de contenido inválido' });
  }

  if (!nombre || nombre.trim().length === 0) {
    return res.status(400).json({ error: 'El nombre del contenido es requerido' });
  }

  // Para tipos de archivo (pdf, video), se requiere el archivo
  // Para texto, el archivo puede venir del frontend (texto directo convertido a Blob)
  if (['pdf', 'video'].includes(tipo) && !req.file) {
    return res.status(400).json({ error: 'Se requiere subir un archivo para este tipo de contenido' });
  }
  
  // Para texto, se requiere archivo (puede ser texto directo convertido a Blob en el frontend)
  if (tipo === 'texto' && !req.file) {
    return res.status(400).json({ error: 'Se requiere el contenido del texto (escrito directamente o como archivo)' });
  }

  let url_local = null;
  let peso_mb = null;

  if (req.file) {
    url_local = `/contenidos/${req.file.filename}`;
    peso_mb = (req.file.size / (1024 * 1024)).toFixed(2);
  } else if (tipo === 'quiz') {
    url_local = '/contenidos/quiz.html';
    peso_mb = 0;
  }

  const ordenNum = orden ? parseInt(orden) : 0;

  const result = await pool.query(
    `INSERT INTO contenido (curso_id, tipo, url_local, nombre, peso_mb, orden)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [cursoId, tipo, url_local, nombreSanitizado, peso_mb, ordenNum]
  );

  logger.info('Contenido creado por tutor', { 
    contenidoId: result.rows[0].id, 
    cursoId, 
    tipo, 
    nombre,
    tutorId: req.user.id 
  });

  res.status(201).json(result.rows[0]);
}));

// Editar contenido (solo si el curso es del tutor)
router.put('/contenidos/:id', requireTutor, asyncHandler(async (req, res) => {
  const contenidoId = req.params.id;
  const { nombre, orden } = req.body;

  if (!validator.isValidId(contenidoId)) {
    return res.status(400).json({ error: 'ID de contenido inválido' });
  }

  // Sanitizar nombre si se proporciona
  const nombreSanitizado = nombre ? validator.sanitizeText(nombre, 200) : null;

  // Verificar que el contenido pertenece a un curso del tutor
  const contenido = await pool.query(
    `SELECT c.*, cu.tutor_id 
     FROM contenido c 
     JOIN curso cu ON c.curso_id = cu.id 
     WHERE c.id = $1`,
    [contenidoId]
  );

  if (contenido.rows.length === 0) {
    return res.status(404).json({ error: 'Contenido no encontrado' });
  }

  if (contenido.rows[0].tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para editar este contenido' });
  }

  if (nombre && nombreSanitizado && nombreSanitizado.length === 0) {
    return res.status(400).json({ error: 'El nombre del contenido no puede estar vacío después de sanitización' });
  }

  const ordenNum = orden ? parseInt(orden) : 0;

  // Si se proporciona nombre, usar el sanitizado; si no, mantener el actual
  let updateQuery;
  let updateParams;
  
  if (nombreSanitizado) {
    updateQuery = 'UPDATE contenido SET nombre = $1, orden = $2 WHERE id = $3 RETURNING *';
    updateParams = [nombreSanitizado, ordenNum, contenidoId];
  } else {
    updateQuery = 'UPDATE contenido SET orden = $1 WHERE id = $2 RETURNING *';
    updateParams = [ordenNum, contenidoId];
  }

  const result = await pool.query(updateQuery, updateParams);

  logger.info('Contenido actualizado por tutor', { contenidoId, tutorId: req.user.id });
  res.json(result.rows[0]);
}));

// Eliminar contenido (solo si el curso es del tutor)
router.delete('/contenidos/:id', requireTutor, asyncHandler(async (req, res) => {
  const contenidoId = req.params.id;

  if (!validator.isValidId(contenidoId)) {
    return res.status(400).json({ error: 'ID de contenido inválido' });
  }

  // Verificar que el contenido pertenece a un curso del tutor
  const contenido = await pool.query(
    `SELECT c.*, cu.tutor_id 
     FROM contenido c 
     JOIN curso cu ON c.curso_id = cu.id 
     WHERE c.id = $1`,
    [contenidoId]
  );

  if (contenido.rows.length === 0) {
    return res.status(404).json({ error: 'Contenido no encontrado' });
  }

  if (contenido.rows[0].tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para eliminar este contenido' });
  }

  await pool.query('DELETE FROM contenido WHERE id = $1', [contenidoId]);

  logger.info('Contenido eliminado por tutor', { contenidoId, tutorId: req.user.id });
  res.json({ mensaje: 'Contenido eliminado exitosamente' });
}));

// ==================== CUESTIONARIOS ====================

// Obtener preguntas de un contenido (solo si el contenido pertenece a un curso del tutor)
router.get('/contenidos/:contenidoId/preguntas-completas', requireTutor, asyncHandler(async (req, res) => {
  const contenidoId = req.params.contenidoId;

  if (!validator.isValidId(contenidoId)) {
    return res.status(400).json({ error: 'ID de contenido inválido' });
  }

  // Verificar que el contenido pertenece a un curso del tutor
  const contenido = await pool.query(
    `SELECT c.*, cu.tutor_id 
     FROM contenido c 
     JOIN curso cu ON c.curso_id = cu.id 
     WHERE c.id = $1`,
    [contenidoId]
  );

  if (contenido.rows.length === 0) {
    return res.status(404).json({ error: 'Contenido no encontrado' });
  }

  if (contenido.rows[0].tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para ver este contenido' });
  }

  if (contenido.rows[0].tipo !== 'quiz') {
    return res.status(400).json({ error: 'Este contenido no es un cuestionario' });
  }

  const preguntas = await Quiz.getPreguntas(contenidoId);
  res.json(preguntas);
}));

// Crear pregunta
router.post('/contenidos/:contenidoId/preguntas', requireTutor, asyncHandler(async (req, res) => {
  const contenidoId = req.params.contenidoId;
  const { texto, tipo, orden, puntaje } = req.body;

  if (!validator.isValidId(contenidoId)) {
    return res.status(400).json({ error: 'ID de contenido inválido' });
  }

  // Verificar que el contenido pertenece a un curso del tutor
  const contenido = await pool.query(
    `SELECT c.*, cu.tutor_id 
     FROM contenido c 
     JOIN curso cu ON c.curso_id = cu.id 
     WHERE c.id = $1`,
    [contenidoId]
  );

  if (contenido.rows.length === 0) {
    return res.status(404).json({ error: 'Contenido no encontrado' });
  }

  if (contenido.rows[0].tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para agregar preguntas a este contenido' });
  }

  if (contenido.rows[0].tipo !== 'quiz') {
    return res.status(400).json({ error: 'Este contenido no es un cuestionario' });
  }

  if (!texto || texto.trim().length === 0) {
    return res.status(400).json({ error: 'El texto de la pregunta es requerido' });
  }

  const tiposValidos = ['opcion_multiple', 'verdadero_falso', 'texto'];
  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de pregunta inválido' });
  }

  const ordenNum = orden ? parseInt(orden) : 0;
  const puntajeNum = puntaje ? parseInt(puntaje) : 1;

  const result = await pool.query(
    `INSERT INTO pregunta (contenido_id, texto, tipo, orden, puntaje)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [contenidoId, validator.sanitizeText(texto, 500), tipo, ordenNum, puntajeNum]
  );

  logger.info('Pregunta creada por tutor', { 
    preguntaId: result.rows[0].id, 
    contenidoId, 
    tipo,
    tutorId: req.user.id 
  });

  res.status(201).json(result.rows[0]);
}));

// Editar pregunta
router.put('/preguntas/:id', requireTutor, asyncHandler(async (req, res) => {
  const preguntaId = req.params.id;
  const { texto, orden, puntaje } = req.body;

  if (!validator.isValidId(preguntaId)) {
    return res.status(400).json({ error: 'ID de pregunta inválido' });
  }

  // Verificar que la pregunta pertenece a un contenido de un curso del tutor
  const pregunta = await pool.query(
    `SELECT p.*, c.tipo, cu.tutor_id
     FROM pregunta p
     JOIN contenido c ON p.contenido_id = c.id
     JOIN curso cu ON c.curso_id = cu.id
     WHERE p.id = $1`,
    [preguntaId]
  );

  if (pregunta.rows.length === 0) {
    return res.status(404).json({ error: 'Pregunta no encontrada' });
  }

  if (pregunta.rows[0].tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para editar esta pregunta' });
  }

  if (texto && texto.trim().length === 0) {
    return res.status(400).json({ error: 'El texto de la pregunta no puede estar vacío' });
  }

  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (texto) {
    updates.push(`texto = $${paramIndex++}`);
    values.push(validator.sanitizeText(texto, 500));
  }
  if (orden !== undefined) {
    updates.push(`orden = $${paramIndex++}`);
    values.push(parseInt(orden));
  }
  if (puntaje !== undefined) {
    updates.push(`puntaje = $${paramIndex++}`);
    values.push(parseInt(puntaje));
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar' });
  }

  values.push(preguntaId);
  const query = `UPDATE pregunta SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Pregunta no encontrada' });
  }

  logger.info('Pregunta actualizada por tutor', { preguntaId, tutorId: req.user.id });
  res.json(result.rows[0]);
}));

// Eliminar pregunta
router.delete('/preguntas/:id', requireTutor, asyncHandler(async (req, res) => {
  const preguntaId = req.params.id;

  if (!validator.isValidId(preguntaId)) {
    return res.status(400).json({ error: 'ID de pregunta inválido' });
  }

  // Verificar que la pregunta pertenece a un contenido de un curso del tutor
  const pregunta = await pool.query(
    `SELECT p.*, cu.tutor_id
     FROM pregunta p
     JOIN contenido c ON p.contenido_id = c.id
     JOIN curso cu ON c.curso_id = cu.id
     WHERE p.id = $1`,
    [preguntaId]
  );

  if (pregunta.rows.length === 0) {
    return res.status(404).json({ error: 'Pregunta no encontrada' });
  }

  if (pregunta.rows[0].tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para eliminar esta pregunta' });
  }

  await pool.query('DELETE FROM pregunta WHERE id = $1', [preguntaId]);

  logger.info('Pregunta eliminada por tutor', { preguntaId, tutorId: req.user.id });
  res.json({ mensaje: 'Pregunta eliminada exitosamente' });
}));

// ==================== OPCIONES DE PREGUNTA ====================

// Crear opción
router.post('/preguntas/:preguntaId/opciones', requireTutor, asyncHandler(async (req, res) => {
  const preguntaId = req.params.preguntaId;
  const { texto, es_correcta, orden } = req.body;

  if (!validator.isValidId(preguntaId)) {
    return res.status(400).json({ error: 'ID de pregunta inválido' });
  }

  // Verificar que la pregunta pertenece a un contenido de un curso del tutor
  const pregunta = await pool.query(
    `SELECT p.*, cu.tutor_id
     FROM pregunta p
     JOIN contenido c ON p.contenido_id = c.id
     JOIN curso cu ON c.curso_id = cu.id
     WHERE p.id = $1`,
    [preguntaId]
  );

  if (pregunta.rows.length === 0) {
    return res.status(404).json({ error: 'Pregunta no encontrada' });
  }

  if (pregunta.rows[0].tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para agregar opciones a esta pregunta' });
  }

  if (!texto || texto.trim().length === 0) {
    return res.status(400).json({ error: 'El texto de la opción es requerido' });
  }

  const ordenNum = orden ? parseInt(orden) : 0;
  const esCorrecta = es_correcta === true || es_correcta === 'true';

  const result = await pool.query(
    `INSERT INTO opcion (pregunta_id, texto, es_correcta, orden)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [preguntaId, validator.sanitizeText(texto, 200), esCorrecta, ordenNum]
  );

  logger.info('Opción creada por tutor', { 
    opcionId: result.rows[0].id, 
    preguntaId, 
    esCorrecta,
    tutorId: req.user.id 
  });

  res.status(201).json(result.rows[0]);
}));

// Editar opción
router.put('/opciones/:id', requireTutor, asyncHandler(async (req, res) => {
  const opcionId = req.params.id;
  const { texto, es_correcta, orden } = req.body;

  if (!validator.isValidId(opcionId)) {
    return res.status(400).json({ error: 'ID de opción inválido' });
  }

  // Verificar que la opción pertenece a una pregunta de un contenido de un curso del tutor
  const opcion = await pool.query(
    `SELECT o.*, cu.tutor_id
     FROM opcion o
     JOIN pregunta p ON o.pregunta_id = p.id
     JOIN contenido c ON p.contenido_id = c.id
     JOIN curso cu ON c.curso_id = cu.id
     WHERE o.id = $1`,
    [opcionId]
  );

  if (opcion.rows.length === 0) {
    return res.status(404).json({ error: 'Opción no encontrada' });
  }

  if (opcion.rows[0].tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para editar esta opción' });
  }

  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (texto) {
    updates.push(`texto = $${paramIndex++}`);
    values.push(validator.sanitizeText(texto, 200));
  }
  if (es_correcta !== undefined) {
    updates.push(`es_correcta = $${paramIndex++}`);
    values.push(es_correcta === true || es_correcta === 'true');
  }
  if (orden !== undefined) {
    updates.push(`orden = $${paramIndex++}`);
    values.push(parseInt(orden));
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No hay campos para actualizar' });
  }

  values.push(opcionId);
  const query = `UPDATE opcion SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Opción no encontrada' });
  }

  logger.info('Opción actualizada por tutor', { opcionId, tutorId: req.user.id });
  res.json(result.rows[0]);
}));

// Eliminar opción
router.delete('/opciones/:id', requireTutor, asyncHandler(async (req, res) => {
  const opcionId = req.params.id;

  if (!validator.isValidId(opcionId)) {
    return res.status(400).json({ error: 'ID de opción inválido' });
  }

  // Verificar que la opción pertenece a una pregunta de un contenido de un curso del tutor
  const opcion = await pool.query(
    `SELECT o.*, cu.tutor_id
     FROM opcion o
     JOIN pregunta p ON o.pregunta_id = p.id
     JOIN contenido c ON p.contenido_id = c.id
     JOIN curso cu ON c.curso_id = cu.id
     WHERE o.id = $1`,
    [opcionId]
  );

  if (opcion.rows.length === 0) {
    return res.status(404).json({ error: 'Opción no encontrada' });
  }

  if (opcion.rows[0].tutor_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para eliminar esta opción' });
  }

  await pool.query('DELETE FROM opcion WHERE id = $1', [opcionId]);

  logger.info('Opción eliminada por tutor', { opcionId, tutorId: req.user.id });
  res.json({ mensaje: 'Opción eliminada exitosamente' });
}));

module.exports = router;
