/**
 * Funcionalidades del panel de tutor
 */

let tutorCursos = [];
let tutorEstudiantes = [];
let cursoSeleccionado = null;

// Inicializar panel de tutor
function inicializarTutor() {
    console.log('Inicializando panel de tutor');
    
    // Asegurar que el panel de tutor esté visible y el de estudiante oculto
    const tutorPanel = document.getElementById('tutor-panel');
    const studentPanel = document.getElementById('student-panel');
    if (tutorPanel) tutorPanel.classList.remove('hidden');
    if (studentPanel) studentPanel.classList.add('hidden');
    
    // Event listeners para botones de navegación
    const cursosBtn = document.getElementById('tutor-cursos-btn');
    const estudiantesBtn = document.getElementById('tutor-estudiantes-btn');
    const chatBtn = document.getElementById('tutor-chat-btn');
    const crearCursoBtn = document.getElementById('tutor-crear-curso-btn');
    
    console.log('Botones encontrados:', { cursosBtn: !!cursosBtn, estudiantesBtn: !!estudiantesBtn, chatBtn: !!chatBtn, crearCursoBtn: !!crearCursoBtn });
    
    if (cursosBtn) {
        cursosBtn.addEventListener('click', () => {
            console.log('Click en botón de cursos');
            mostrarVistaTutor('cursos');
        });
    }
    if (estudiantesBtn) {
        estudiantesBtn.addEventListener('click', () => {
            console.log('Click en botón de estudiantes');
            mostrarVistaTutor('estudiantes');
        });
    }
    if (chatBtn) {
        chatBtn.addEventListener('click', () => {
            console.log('Click en botón de chat');
            mostrarVistaTutor('chat');
        });
    }
    if (crearCursoBtn) {
        crearCursoBtn.addEventListener('click', () => {
            console.log('Click en botón de crear curso');
            mostrarFormularioCurso();
        });
    }
    
    // Mostrar vista de cursos por defecto y cargar contenido
    // Esperar un momento para asegurar que el DOM esté completamente cargado
    setTimeout(() => {
        console.log('Ejecutando mostrarVistaTutor después del timeout');
        mostrarVistaTutor('cursos');
    }, 200);
}

// Mostrar vista del tutor
function mostrarVistaTutor(vista) {
    console.log('=== mostrarVistaTutor ===', vista);
    
    // Buscar el panel de tutor primero
    const tutorPanel = document.getElementById('tutor-panel');
    if (!tutorPanel) {
        console.error('ERROR: tutor-panel no encontrado');
        return;
    }
    
    // Asegurar que el panel de tutor sea visible
    tutorPanel.classList.remove('hidden');
    tutorPanel.style.display = '';
    
    // Ocultar todas las secciones dentro del panel de tutor
    const tutorCursosView = tutorPanel.querySelector('#tutor-cursos-view');
    const tutorEstudiantesView = tutorPanel.querySelector('#tutor-estudiantes-view');
    const tutorChatView = tutorPanel.querySelector('#tutor-chat-view');
    
    if (tutorCursosView) {
        tutorCursosView.classList.add('hidden');
        tutorCursosView.style.display = '';
    }
    if (tutorEstudiantesView) {
        tutorEstudiantesView.classList.add('hidden');
        tutorEstudiantesView.style.display = '';
    }
    if (tutorChatView) {
        tutorChatView.classList.add('hidden');
        tutorChatView.style.display = '';
    }
    
    // Actualizar botones
    const cursosBtn = tutorPanel.querySelector('#tutor-cursos-btn') || document.getElementById('tutor-cursos-btn');
    const estudiantesBtn = tutorPanel.querySelector('#tutor-estudiantes-btn') || document.getElementById('tutor-estudiantes-btn');
    const chatBtn = tutorPanel.querySelector('#tutor-chat-btn') || document.getElementById('tutor-chat-btn');
    
    if (cursosBtn) {
        cursosBtn.classList.remove('btn-primary');
        cursosBtn.classList.add('btn-secondary');
    }
    if (estudiantesBtn) {
        estudiantesBtn.classList.remove('btn-primary');
        estudiantesBtn.classList.add('btn-secondary');
    }
    if (chatBtn) {
        chatBtn.classList.remove('btn-primary');
        chatBtn.classList.add('btn-secondary');
    }
    
    // Mostrar sección seleccionada
    if (vista === 'cursos') {
        if (tutorCursosView) {
            // Forzar que la vista sea visible
            tutorCursosView.classList.remove('hidden');
            tutorCursosView.style.display = '';
            tutorCursosView.style.visibility = 'visible';
            tutorCursosView.style.opacity = '1';
            console.log('✅ Vista de cursos mostrada');
            console.log('  - Clase hidden removida');
            console.log('  - Display:', window.getComputedStyle(tutorCursosView).display);
        }
        if (cursosBtn) {
            cursosBtn.classList.remove('btn-secondary');
            cursosBtn.classList.add('btn-primary');
        }
        // Cargar cursos después de un pequeño delay para asegurar que el DOM se actualice
        setTimeout(() => {
            console.log('Llamando a cargarCursosTutor desde mostrarVistaTutor');
            cargarCursosTutor();
        }, 50);
    } else if (vista === 'estudiantes') {
        if (tutorEstudiantesView) {
            tutorEstudiantesView.classList.remove('hidden');
            tutorEstudiantesView.style.display = '';
            console.log('✅ Vista de estudiantes mostrada');
        }
        if (estudiantesBtn) {
            estudiantesBtn.classList.remove('btn-secondary');
            estudiantesBtn.classList.add('btn-primary');
        }
        cargarEstudiantesTutor();
    } else if (vista === 'chat') {
        if (tutorChatView) {
            tutorChatView.classList.remove('hidden');
            tutorChatView.style.display = '';
            console.log('✅ Vista de chat mostrada');
        }
        if (chatBtn) {
            chatBtn.classList.remove('btn-secondary');
            chatBtn.classList.add('btn-primary');
        }
        // Cargar lista de estudiantes para el chat
        cargarEstudiantesParaChat();
    }
}

// Cargar estudiantes para el chat
async function cargarEstudiantesParaChat() {
    try {
        console.log('Cargando estudiantes para el chat...');
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            console.error('No hay token disponible');
            return;
        }
        
        const response = await fetchApi('/api/tutor/estudiantes');
        
        if (response.ok) {
            const estudiantes = await response.json();
            console.log('Estudiantes cargados para chat:', estudiantes);
            mostrarEstudiantesParaChat(estudiantes);
        } else {
            console.error('Error al cargar estudiantes para chat');
            const estudiantesListEl = document.getElementById('estudiantes-list');
            if (estudiantesListEl) {
                estudiantesListEl.innerHTML = '<p style="padding: 10px; color: var(--medium-gray);">No se pudieron cargar estudiantes.</p>';
            }
        }
    } catch (error) {
        console.error('Error al cargar estudiantes para chat:', error);
        const estudiantesListEl = document.getElementById('estudiantes-list');
        if (estudiantesListEl) {
            estudiantesListEl.innerHTML = '<p style="padding: 10px; color: var(--medium-gray);">Error al cargar estudiantes.</p>';
        }
    }
}

// Mostrar estudiantes para el chat
function mostrarEstudiantesParaChat(estudiantes) {
    const estudiantesListEl = document.getElementById('estudiantes-list');
    if (!estudiantesListEl) {
        console.error('No se encontró el elemento estudiantes-list');
        return;
    }
    
    estudiantesListEl.innerHTML = '';
    
    if (!Array.isArray(estudiantes) || estudiantes.length === 0) {
        estudiantesListEl.innerHTML = '<p style="padding: 10px; color: var(--medium-gray); text-align: center;">No tienes estudiantes asignados aún.</p>';
        return;
    }
    
    // Eliminar duplicados por ID
    const estudiantesUnicos = estudiantes.filter((est, index, self) =>
        index === self.findIndex(e => e.id === est.id)
    );
    
    estudiantesUnicos.forEach(estudiante => {
        const estudianteBadge = document.createElement('div');
        estudianteBadge.className = 'estudiante-item';
        estudianteBadge.dataset.estudianteId = estudiante.id;
        estudianteBadge.innerHTML = `
            <span>${estudiante.nombre || estudiante.matricula || 'Sin nombre'}</span>
        `;
        estudianteBadge.addEventListener('click', () => {
            seleccionarEstudiante(estudiante.id);
        });
        estudiantesListEl.appendChild(estudianteBadge);
    });
}

// Cargar cursos del tutor
async function cargarCursosTutor() {
    try {
        console.log('=== cargarCursosTutor INICIADO ===');
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            console.error('ERROR: No hay token disponible');
            console.error('getCurrentToken existe?:', typeof getCurrentToken);
            const auth = await offlineStorage.getAuth();
            console.error('Auth de offlineStorage:', auth);
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        console.log('Token obtenido, longitud:', token.length);
        console.log('Haciendo petición a /api/tutor/cursos');
        
        const response = await fetchApi('/api/tutor/cursos');
        
        console.log('Respuesta recibida:', response.status, response.statusText);
        console.log('Response OK?:', response.ok);
        
        if (response.ok) {
            const cursosData = await response.json();
            console.log('Cursos recibidos del servidor:', cursosData);
            console.log('Tipo de datos:', typeof cursosData);
            console.log('Es array?:', Array.isArray(cursosData));
            console.log('Número de cursos:', cursosData?.length);
            
            tutorCursos = cursosData;
            console.log('tutorCursos asignado:', tutorCursos);
            mostrarCursosTutor();
        } else {
            const errorText = await response.text();
            console.error('Error en respuesta:', response.status, errorText);
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { error: errorText || 'Error desconocido' };
            }
            console.error('Error al cargar cursos:', errorData);
            mostrarNotificacion('Error al cargar cursos: ' + (errorData.error || 'Error desconocido'), 'error');
            
            // Mostrar mensaje de error en la lista también
            const cursosListEl = document.getElementById('tutor-cursos-list');
            if (cursosListEl) {
                cursosListEl.innerHTML = `
                    <div style="text-align: center; padding: 40px; background: #ffebee; border-radius: 8px; color: #c62828;">
                        <h3>Error al cargar cursos</h3>
                        <p>${errorData.error || 'Error desconocido'}</p>
                        <button class="btn btn-primary" onclick="cargarCursosTutor()" style="margin-top: 15px;">Reintentar</button>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('EXCEPCIÓN en cargarCursosTutor:', error);
        console.error('Stack:', error.stack);
        mostrarNotificacion('Error al cargar cursos: ' + error.message, 'error');
        
        // Mostrar mensaje de error en la lista también
        const cursosListEl = document.getElementById('tutor-cursos-list');
        if (cursosListEl) {
            cursosListEl.innerHTML = `
                <div style="text-align: center; padding: 40px; background: #ffebee; border-radius: 8px; color: #c62828;">
                    <h3>Error de conexión</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="cargarCursosTutor()" style="margin-top: 15px;">Reintentar</button>
                </div>
            `;
        }
    }
}

// Mostrar cursos del tutor
function mostrarCursosTutor() {
    console.log('=== mostrarCursosTutor INICIADO ===');
    
    // Asegurar que estamos buscando dentro del panel de tutor, no del de estudiante
    const tutorPanel = document.getElementById('tutor-panel');
    if (!tutorPanel) {
        console.error('❌ ERROR: tutor-panel no encontrado');
        return;
    }
    
    // Buscar los elementos dentro del panel de tutor
    const tutorCursosView = tutorPanel.querySelector('#tutor-cursos-view');
    if (!tutorCursosView) {
        console.error('❌ ERROR: tutor-cursos-view no encontrado dentro de tutor-panel');
        // Intentar buscar todos los elementos con ese ID para debug
        const allViews = document.querySelectorAll('#tutor-cursos-view');
        console.error('  Elementos encontrados con ese ID:', allViews.length);
        allViews.forEach((el, i) => {
            console.error(`    ${i + 1}.`, el, 'Padre:', el.parentElement?.id);
        });
        return;
    }
    
    // Forzar que la vista sea visible
    tutorCursosView.classList.remove('hidden');
    tutorCursosView.style.display = '';
    tutorCursosView.style.visibility = 'visible';
    tutorCursosView.style.opacity = '1';
    console.log('✅ Vista tutor-cursos-view encontrada y forzada a visible');
    console.log('  - Clase hidden removida');
    console.log('  - Display computed:', window.getComputedStyle(tutorCursosView).display);
    console.log('  - Está dentro de tutor-panel?:', tutorPanel.contains(tutorCursosView));
    
    // Buscar la lista dentro de la vista
    const cursosListEl = tutorCursosView.querySelector('#tutor-cursos-list') || tutorPanel.querySelector('#tutor-cursos-list');
    if (!cursosListEl) {
        console.error('❌ ERROR: tutor-cursos-list no encontrado');
        return;
    }
    
    // Asegurar que el contenedor sea visible
    cursosListEl.style.display = '';
    cursosListEl.style.visibility = 'visible';
    cursosListEl.style.opacity = '1';
    console.log('✅ Lista de cursos encontrada');
    
    console.log('tutorCursos:', tutorCursos);
    console.log('es array?:', Array.isArray(tutorCursos));
    console.log('longitud:', tutorCursos?.length);
    
    cursosListEl.innerHTML = '';
    
    if (!tutorCursos || !Array.isArray(tutorCursos) || tutorCursos.length === 0) {
        console.log('No hay cursos para mostrar. Mostrando mensaje vacío.');
        cursosListEl.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--medium-gray);">
                <div style="font-size: 48px; margin-bottom: 20px;">📚</div>
                <h3 style="margin-bottom: 10px; color: var(--dark-color);">No tienes cursos creados</h3>
                <p style="margin-bottom: 30px;">Crea tu primer curso haciendo clic en el botón "+ Crear Curso" arriba.</p>
                <button class="btn btn-primary" onclick="mostrarFormularioCurso()">+ Crear Mi Primer Curso</button>
            </div>
        `;
        return;
    }
    
    console.log(`✅ Mostrando ${tutorCursos.length} curso(s)`);
    
    // Crear HTML de todos los cursos
    let htmlContent = '';
    tutorCursos.forEach((curso, index) => {
        console.log(`  Creando card ${index + 1}: ${curso.nombre}`);
        const nombreEscapado = (curso.nombre || 'Sin nombre').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const descripcionEscapada = (curso.descripcion || 'Sin descripción').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        htmlContent += `
            <div class="curso-card">
                <div class="curso-card-header">
                    <h3>${nombreEscapado}</h3>
                    <span class="curso-badge">${curso.num_estudiantes || 0} estudiantes</span>
                </div>
                <p class="curso-description">${descripcionEscapada}</p>
                <div style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
                    <button class="btn btn-primary btn-sm" onclick="gestionarCursoTutor(${curso.id})">Gestionar</button>
                    <button class="btn btn-secondary btn-sm" onclick="verEstudiantesCurso(${curso.id})">Ver Estudiantes</button>
                    <button class="btn btn-secondary btn-sm" onclick="editarCursoTutor(${curso.id})">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarCursoTutor(${curso.id})">Eliminar</button>
                </div>
            </div>
        `;
    });
    
    // Insertar todo el HTML de una vez
    cursosListEl.innerHTML = htmlContent;
    
    console.log('✅ Cursos insertados en el DOM');
    console.log('  - Número de cards creados:', cursosListEl.children.length);
    console.log('  - Primer card existe?:', cursosListEl.firstElementChild !== null);
    
    // Forzar reflow y verificar que los elementos sean visibles
    const firstCard = cursosListEl.firstElementChild;
    if (firstCard) {
        const cardDisplay = window.getComputedStyle(firstCard).display;
        const cardVisibility = window.getComputedStyle(firstCard).visibility;
        const cardHeight = firstCard.offsetHeight;
        console.log('  - Primer card display:', cardDisplay);
        console.log('  - Primer card visibility:', cardVisibility);
        console.log('  - Primer card height:', cardHeight);
        
        if (cardDisplay === 'none' || cardHeight === 0) {
            console.error('⚠️ ADVERTENCIA: El card no es visible');
            firstCard.style.display = 'block';
        }
    }
    
    // Verificar que la vista padre y el panel sean visibles
    const viewDisplay = window.getComputedStyle(tutorCursosView).display;
    const panelDisplay = window.getComputedStyle(tutorPanel).display;
    console.log('  - Vista padre display:', viewDisplay);
    console.log('  - Panel tutor display:', panelDisplay);
    
    if (viewDisplay === 'none') {
        console.error('⚠️ ADVERTENCIA: La vista padre tiene display: none - FORZANDO A BLOCK');
        tutorCursosView.style.display = 'block';
    }
    
    if (panelDisplay === 'none') {
        console.error('⚠️ ADVERTENCIA: El panel tutor tiene display: none - FORZANDO A BLOCK');
        tutorPanel.style.display = 'block';
    }
}

// Cargar estudiantes del tutor
async function cargarEstudiantesTutor() {
    try {
        console.log('Cargando estudiantes del tutor...');
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            console.error('No hay token disponible');
            return;
        }
        
        const response = await fetchApi('/api/tutor/estudiantes');
        
        if (response.ok) {
            tutorEstudiantes = await response.json();
            console.log('Estudiantes cargados:', tutorEstudiantes);
            mostrarEstudiantesTutor();
        } else {
            console.log('No se pudieron cargar estudiantes (puede ser normal si no hay estudiantes asignados)');
            tutorEstudiantes = [];
            mostrarEstudiantesTutor();
        }
    } catch (error) {
        console.error('Error al cargar estudiantes del tutor:', error);
        tutorEstudiantes = [];
        mostrarEstudiantesTutor();
    }
}

// Mostrar estudiantes del tutor con su progreso
async function mostrarEstudiantesTutor() {
    const estudiantesListEl = document.getElementById('tutor-estudiantes-list');
    if (!estudiantesListEl) return;
    
    estudiantesListEl.innerHTML = '';
    
    if (tutorEstudiantes.length === 0) {
        estudiantesListEl.innerHTML = '<p style="text-align: center; color: var(--medium-gray); padding: 40px;">No tienes estudiantes asignados aún.</p>';
        return;
    }
    
    // Cargar progreso y calificaciones de todos los estudiantes
    let progresos = [];
    let calificaciones = [];
    
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (token) {
            // Cargar progreso
            try {
                const progresoResponse = await fetchApi('/api/tutor/estudiantes/progreso');
                if (progresoResponse.ok) {
                    progresos = await progresoResponse.json();
                    console.log('✅ Progresos cargados:', progresos.length);
                } else if (progresoResponse.status === 500) {
                    console.warn('⚠️ Error 500 al cargar progresos. Puede ser que no haya progreso registrado aún.');
                    progresos = [];
                } else {
                    console.warn('⚠️ Error al cargar progresos:', progresoResponse.status, progresoResponse.statusText);
                    progresos = [];
                }
            } catch (error) {
                console.error('Error al cargar progreso:', error);
                progresos = [];
            }
            
            // Cargar calificaciones
            try {
                const califResponse = await fetchApi('/api/tutor/estudiantes/calificaciones');
                if (califResponse.ok) {
                    calificaciones = await califResponse.json();
                    console.log('✅ Calificaciones cargadas:', calificaciones.length);
                } else if (califResponse.status === 500) {
                    console.warn('⚠️ Error 500 al cargar calificaciones. Puede ser que no haya calificaciones registradas aún.');
                    calificaciones = [];
                } else {
                    console.warn('⚠️ Error al cargar calificaciones:', califResponse.status, califResponse.statusText);
                    calificaciones = [];
                }
            } catch (error) {
                console.error('Error al cargar calificaciones:', error);
                calificaciones = [];
            }
        }
    } catch (error) {
        console.error('Error al cargar progreso/calificaciones:', error);
        progresos = [];
        calificaciones = [];
    }
    
    // Agrupar progreso por estudiante y curso
    const progresoPorEstudiante = {};
    const progresoPorContenido = {}; // Para evitar contar duplicados
    
    progresos.forEach(p => {
        const estudianteId = p.estudiante_id;
        const cursoId = p.curso_id;
        const contenidoId = p.contenido_id;
        
        // Inicializar estructura si no existe
        if (!progresoPorEstudiante[estudianteId]) {
            progresoPorEstudiante[estudianteId] = {
                cursos: {},
                totalContenidos: 0,
                totalAvance: 0,
                contenidosCompletados: 0
            };
        }
        if (!progresoPorEstudiante[estudianteId].cursos[cursoId]) {
            progresoPorEstudiante[estudianteId].cursos[cursoId] = {
                nombre: p.curso_nombre || `Curso #${cursoId}`,
                contenidos: new Set(),
                totalAvance: 0,
                completados: 0
            };
        }
        
        // Usar una clave única para cada contenido (evitar duplicados)
        const contenidoKey = `${estudianteId}-${cursoId}-${contenidoId}`;
        if (!progresoPorContenido[contenidoKey]) {
            progresoPorContenido[contenidoKey] = true;
            
            const avance = parseFloat(p.avance) || 0;
            const completado = p.completado || avance >= 100;
            
            progresoPorEstudiante[estudianteId].cursos[cursoId].contenidos.add(contenidoId);
            progresoPorEstudiante[estudianteId].cursos[cursoId].totalAvance += avance;
            progresoPorEstudiante[estudianteId].totalAvance += avance;
            
            if (completado) {
                progresoPorEstudiante[estudianteId].cursos[cursoId].completados++;
                progresoPorEstudiante[estudianteId].contenidosCompletados++;
            }
        }
    });
    
    // Obtener total de contenidos por curso (para calcular porcentajes correctos)
    // Esto se hará mejor en el backend, pero por ahora calculamos aquí
    const totalContenidosPorCurso = {};
    for (const estudiante of tutorEstudiantes) {
        for (const cursoId in progresoPorEstudiante[estudiante.id]?.cursos || {}) {
            if (!totalContenidosPorCurso[cursoId]) {
                // Necesitamos obtener el total de contenidos del curso
                // Por ahora, usamos el número de contenidos únicos que tienen progreso
                totalContenidosPorCurso[cursoId] = progresoPorEstudiante[estudiante.id].cursos[cursoId].contenidos.size;
            }
        }
    }
    
    // Agrupar calificaciones por estudiante
    const califPorEstudiante = {};
    calificaciones.forEach(c => {
        if (!califPorEstudiante[c.usuario_id]) {
            califPorEstudiante[c.usuario_id] = [];
        }
        califPorEstudiante[c.usuario_id].push(c);
    });
    
    tutorEstudiantes.forEach(estudiante => {
        const estudianteId = estudiante.id;
        const progresoEst = progresoPorEstudiante[estudianteId] || { cursos: {}, totalContenidos: 0, totalAvance: 0, contenidosCompletados: 0 };
        const califEst = califPorEstudiante[estudianteId] || [];
        
        // Calcular porcentaje de progreso basado en el promedio de avances
        // Esto es más preciso que solo contar completados
        const numCursos = Object.keys(progresoEst.cursos || {}).length;
        let porcentajeProgreso = 0;
        
        if (numCursos > 0) {
            // Calcular promedio de progreso por curso
            let sumaPorcentajes = 0;
            for (const cursoId in progresoEst.cursos) {
                const curso = progresoEst.cursos[cursoId];
                const numContenidos = curso.contenidos.size;
                if (numContenidos > 0) {
                    const promedioCurso = curso.totalAvance / numContenidos;
                    sumaPorcentajes += promedioCurso;
                }
            }
            porcentajeProgreso = Math.round(sumaPorcentajes / numCursos);
        }
        
        // Calcular promedio de exámenes
        const promedioExamenes = califEst.length > 0
            ? Math.round((califEst.reduce((sum, c) => sum + c.porcentaje, 0) / califEst.length) * 100) / 100
            : 0;
        
        const estudianteCard = document.createElement('div');
        estudianteCard.className = 'curso-card';
        estudianteCard.innerHTML = `
            <div class="curso-card-header">
                <h3>${estudiante.nombre || estudiante.matricula}</h3>
                <span class="curso-badge">Estudiante</span>
            </div>
            <p class="curso-description">Matrícula: ${estudiante.matricula}</p>
            <p class="curso-description">Email: ${estudiante.email || 'No disponible'}</p>
            
            <div class="curso-progress-section" style="margin-top: 15px;">
                <div class="progress-info">
                    <span>Progreso General</span>
                    <span class="progress-percentage">${porcentajeProgreso}%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${porcentajeProgreso}%"></div>
                    </div>
                </div>
            </div>
            
            ${califEst.length > 0 ? `
                <div style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                    <strong>Promedio de Exámenes:</strong> ${promedioExamenes}%
                    <br><small>Total de exámenes: ${califEst.length}</small>
                </div>
            ` : ''}
            
            <div style="margin-top: 15px; display: flex; gap: 10px;">
                <button class="btn btn-primary" onclick="verProgresoEstudiante(${estudianteId})" style="flex: 1;">
                    Ver Progreso Detallado
                </button>
                <button class="btn btn-secondary" onclick="verCalificacionesEstudiante(${estudianteId})" style="flex: 1;">
                    Ver Exámenes
                </button>
            </div>
        `;
        estudiantesListEl.appendChild(estudianteCard);
    });
}

// Ver progreso detallado de un estudiante
async function verProgresoEstudiante(estudianteId) {
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) return;
        
        // Obtener todos los cursos del tutor
        const cursosResponse = await fetch('http://localhost:8080/api/tutor/cursos', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!cursosResponse.ok) {
            alert('Error al cargar cursos');
            return;
        }
        
        const cursos = await cursosResponse.json();
        
        let html = '<h3>Progreso Detallado del Estudiante</h3><div style="margin-top: 20px;">';
        
        for (const curso of cursos) {
            try {
                const progresoResponse = await fetchApi(`/api/tutor/cursos/${curso.id}/estudiantes/${estudianteId}/progreso`);
                
                if (progresoResponse.ok) {
                    const progresoData = await progresoResponse.json();
                    const general = progresoData.general || {};
                    const detallado = progresoData.detallado || [];
                    
                    const porcentaje = general.progresoPorcentaje || 0;
                    const completados = general.completados || 0;
                    const total = general.totalContenidos || 0;
                    
                    html += `
                        <div style="margin-bottom: 30px; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <h4>${curso.nombre}</h4>
                            <div style="margin-top: 15px;">
                                <div class="progress-info">
                                    <span>Progreso del Curso</span>
                                    <span class="progress-percentage">${porcentaje}%</span>
                                </div>
                                <div class="progress-bar-container">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${porcentaje}%"></div>
                                    </div>
                                </div>
                                <p style="margin-top: 10px; color: #666;">
                                    Contenidos completados: ${completados} de ${total}
                                    <br>Progreso promedio: ${general.progresoPromedio || 0}%
                                </p>
                            </div>
                            
                            ${detallado.length > 0 ? `
                                <div style="margin-top: 20px;">
                                    <strong>Contenidos:</strong>
                                    <ul style="margin-top: 10px; padding-left: 20px;">
                                        ${detallado.map(p => {
                                            const contenidoNombre = p.contenido_id ? `Contenido #${p.contenido_id}` : 'Contenido';
                                            const avance = parseFloat(p.avance) || 0;
                                            const completado = p.completado || avance >= 100;
                                            return `
                                                <li>
                                                    ${contenidoNombre} - 
                                                    ${avance}% ${completado ? '✓ Completado' : ''}
                                                </li>
                                            `;
                                        }).join('')}
                                    </ul>
                                </div>
                            ` : '<p style="color: #999; margin-top: 10px;">Aún no hay progreso registrado en este curso.</p>'}
                        </div>
                    `;
                } else if (progresoResponse.status === 500) {
                    console.warn(`⚠️ Error 500 al cargar progreso del curso ${curso.id}. Mostrando curso sin progreso.`);
                    html += `
                        <div style="margin-bottom: 30px; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <h4>${curso.nombre}</h4>
                            <p style="color: #999; margin-top: 10px;">Aún no hay progreso registrado en este curso.</p>
                        </div>
                    `;
                } else {
                    console.warn(`⚠️ Error ${progresoResponse.status} al cargar progreso del curso ${curso.id}`);
                    html += `
                        <div style="margin-bottom: 30px; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <h4>${curso.nombre}</h4>
                            <p style="color: #999; margin-top: 10px;">No se pudo cargar el progreso de este curso.</p>
                        </div>
                    `;
                }
            } catch (error) {
                console.error(`Error al cargar progreso del curso ${curso.id}:`, error);
                html += `
                    <div style="margin-bottom: 30px; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h4>${curso.nombre}</h4>
                        <p style="color: #999; margin-top: 10px;">Error al cargar el progreso de este curso.</p>
                    </div>
                `;
            }
        }
        
        html += '</div>';
        
        crearModal('Progreso del Estudiante', html);
    } catch (error) {
        console.error('Error al cargar progreso del estudiante:', error);
        alert('Error al cargar el progreso');
    }
}

// Ver estudiantes de un curso específico con su progreso individual
async function verEstudiantesCurso(cursoId) {
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) return;
        
        // Obtener estudiantes del curso
        const estudiantesResponse = await fetchApi(`/api/tutor/cursos/${cursoId}/estudiantes`);
        
        if (!estudiantesResponse.ok) {
            alert('Error al cargar estudiantes del curso');
            return;
        }
        
        const estudiantes = await estudiantesResponse.json();
        
        // Obtener progreso de estudiantes del curso
        const progresoResponse = await fetchApi(`/api/tutor/cursos/${cursoId}/progreso`);
        
        let progresos = [];
        if (progresoResponse.ok) {
            progresos = await progresoResponse.json();
        }
        
        // Obtener información del curso
        const cursoResponse = await fetchApi('/api/tutor/cursos');
        
        let cursoNombre = 'Curso';
        if (cursoResponse.ok) {
            const cursos = await cursoResponse.json();
            const curso = cursos.find(c => c.id === parseInt(cursoId));
            if (curso) {
                cursoNombre = curso.nombre;
            }
        }
        
        // Agrupar progreso por estudiante
        const progresoPorEstudiante = {};
        progresos.forEach(p => {
            if (!progresoPorEstudiante[p.estudiante_id]) {
                progresoPorEstudiante[p.estudiante_id] = {
                    contenidos: [],
                    totalAvance: 0,
                    completados: 0
                };
            }
            progresoPorEstudiante[p.estudiante_id].contenidos.push(p);
            progresoPorEstudiante[p.estudiante_id].totalAvance += parseFloat(p.avance) || 0;
            if (p.completado || (parseFloat(p.avance) || 0) >= 100) {
                progresoPorEstudiante[p.estudiante_id].completados++;
            }
        });
        
        // Obtener total de contenidos del curso
        const contenidosResponse = await fetchApi(`/api/cursos/${cursoId}/contenidos`);
        
        let totalContenidos = 0;
        if (contenidosResponse.ok) {
            const contenidos = await contenidosResponse.json();
            totalContenidos = contenidos.length;
        }
        
        let html = `
            <h3>Estudiantes del Curso: ${cursoNombre}</h3>
            <p style="margin-bottom: 20px; color: #666;">Total de estudiantes: ${estudiantes.length}</p>
            <div style="margin-top: 20px;">
        `;
        
        if (estudiantes.length === 0) {
            html += '<p style="text-align: center; color: #999; padding: 40px;">No hay estudiantes asignados a este curso.</p>';
        } else {
            estudiantes.forEach(estudiante => {
                const prog = progresoPorEstudiante[estudiante.id] || { contenidos: [], totalAvance: 0, completados: 0 };
                const numContenidos = prog.contenidos.length;
                const promedioAvance = totalContenidos > 0 ? (prog.totalAvance / totalContenidos) : 0;
                const porcentaje = Math.round(promedioAvance);
                
                html += `
                    <div style="margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px; border: 1px solid #e0e0e0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div>
                                <h4 style="margin: 0;">${estudiante.nombre || estudiante.matricula}</h4>
                                <p style="margin: 5px 0 0 0; color: #666; font-size: 0.9em;">Matrícula: ${estudiante.matricula}</p>
                            </div>
                            <span style="font-size: 1.2em; font-weight: bold; color: var(--primary-color);">${porcentaje}%</span>
                        </div>
                        <div style="margin-top: 10px;">
                            <div class="progress-bar" style="height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                                <div class="progress-fill" style="width: ${porcentaje}%; height: 100%; background: var(--primary-gradient); border-radius: 4px;"></div>
                            </div>
                            <p style="margin-top: 8px; color: #666; font-size: 0.9em;">
                                ${prog.completados} de ${totalContenidos} contenidos completados
                            </p>
                        </div>
                        <div style="margin-top: 10px;">
                            <button class="btn btn-primary btn-sm" onclick="verProgresoEstudianteEnCurso(${estudiante.id}, ${cursoId}, '${(estudiante.nombre || estudiante.matricula).replace(/'/g, "\\'")}')">
                                Ver Progreso Detallado
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        html += '</div>';
        
        crearModal(`Estudiantes de ${cursoNombre}`, html);
    } catch (error) {
        console.error('Error al cargar estudiantes del curso:', error);
        alert('Error al cargar estudiantes del curso');
    }
}

// Ver progreso detallado de un estudiante en un curso específico
async function verProgresoEstudianteEnCurso(estudianteId, cursoId, estudianteNombre) {
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) return;
        
        const progresoResponse = await fetchApi(`/api/tutor/cursos/${cursoId}/estudiantes/${estudianteId}/progreso`);
        
        if (!progresoResponse.ok) {
            alert('Error al cargar progreso del estudiante');
            return;
        }
        
        const progresoData = await progresoResponse.json();
        const general = progresoData.general || {};
        const detallado = progresoData.detallado || [];
        
        // Obtener información de los contenidos
        const contenidosResponse = await fetchApi(`/api/cursos/${cursoId}/contenidos`);
        
        let contenidos = [];
        if (contenidosResponse.ok) {
            contenidos = await contenidosResponse.json();
        }
        
        // Crear mapa de contenidos por ID
        const contenidosMap = {};
        contenidos.forEach(c => {
            contenidosMap[c.id] = c;
        });
        
        const porcentaje = general.progresoPorcentaje || 0;
        const completados = general.completados || 0;
        const total = general.totalContenidos || 0;
        
        let html = `
            <h3>Progreso Detallado: ${estudianteNombre}</h3>
            <div style="margin-top: 20px; padding: 20px; background: #f9f9f9; border-radius: 8px; margin-bottom: 20px;">
                <div class="progress-info">
                    <span>Progreso General del Curso</span>
                    <span class="progress-percentage">${porcentaje}%</span>
                </div>
                <div class="progress-bar-container" style="margin-top: 10px;">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${porcentaje}%"></div>
                    </div>
                </div>
                <p style="margin-top: 10px; color: #666;">
                    Contenidos completados: ${completados} de ${total}
                    <br>Progreso promedio: ${general.progresoPromedio || 0}%
                </p>
            </div>
            <div style="margin-top: 20px;">
                <h4>Contenidos:</h4>
        `;
        
        if (detallado.length === 0) {
            html += '<p style="color: #999; margin-top: 10px;">Aún no hay progreso registrado en este curso.</p>';
        } else {
            // Agrupar progreso por contenido
            const progresoPorContenido = {};
            detallado.forEach(p => {
                if (!progresoPorContenido[p.contenido_id]) {
                    progresoPorContenido[p.contenido_id] = {
                        avance: parseFloat(p.avance) || 0,
                        completado: p.completado || false,
                        contenido: contenidosMap[p.contenido_id] || { nombre: `Contenido #${p.contenido_id}`, tipo: 'desconocido' }
                    };
                } else {
                    // Si hay múltiples registros, tomar el mayor avance
                    const avanceActual = parseFloat(p.avance) || 0;
                    if (avanceActual > progresoPorContenido[p.contenido_id].avance) {
                        progresoPorContenido[p.contenido_id].avance = avanceActual;
                        progresoPorContenido[p.contenido_id].completado = p.completado || false;
                    }
                }
            });
            
            // Mostrar todos los contenidos del curso
            contenidos.forEach(contenido => {
                const prog = progresoPorContenido[contenido.id] || { avance: 0, completado: false };
                const avance = Math.round(prog.avance);
                const completado = prog.completado || avance >= 100;
                
                html += `
                    <div style="margin-bottom: 15px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e0e0e0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div>
                                <strong>${contenido.nombre}</strong>
                                <span style="margin-left: 10px; padding: 2px 8px; background: #e0e0e0; border-radius: 4px; font-size: 0.8em;">
                                    ${contenido.tipo}
                                </span>
                            </div>
                            <span style="font-weight: bold; color: ${completado ? '#4caf50' : '#666'};">
                                ${avance}% ${completado ? '✓' : ''}
                            </span>
                        </div>
                        <div class="progress-bar" style="height: 6px; background: #e0e0e0; border-radius: 3px; overflow: hidden;">
                            <div class="progress-fill" style="width: ${avance}%; height: 100%; background: ${completado ? '#4caf50' : 'var(--primary-color)'}; border-radius: 3px;"></div>
                        </div>
                    </div>
                `;
            });
        }
        
        html += '</div>';
        
        crearModal(`Progreso de ${estudianteNombre}`, html);
    } catch (error) {
        console.error('Error al cargar progreso detallado:', error);
        alert('Error al cargar el progreso detallado');
    }
}

// Ver calificaciones de exámenes de un estudiante
async function verCalificacionesEstudiante(estudianteId) {
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) return;
        
        const response = await fetchApi('/api/tutor/estudiantes/calificaciones');
        
        if (!response.ok) {
            alert('Error al cargar calificaciones');
            return;
        }
        
        const todasCalif = await response.json();
        const califEstudiante = todasCalif.filter(c => c.usuario_id === estudianteId);
        
        if (califEstudiante.length === 0) {
            crearModal('Exámenes del Estudiante', '<p>El estudiante aún no ha realizado exámenes.</p>');
            return;
        }
        
        let html = `
            <h3>Calificaciones de Exámenes</h3>
            <div style="margin-top: 20px;">
        `;
        
        califEstudiante.forEach(calif => {
            const color = calif.porcentaje >= 70 ? '#4caf50' : calif.porcentaje >= 50 ? '#ff9800' : '#f44336';
            html += `
                <div style="margin-bottom: 20px; padding: 15px; background: white; border-left: 4px solid ${color}; border-radius: 5px;">
                    <h4>${calif.contenido_nombre}</h4>
                    <p><strong>Curso:</strong> ${calif.curso_nombre}</p>
                    <p><strong>Calificación:</strong> <span style="color: ${color}; font-weight: bold; font-size: 18px;">${calif.porcentaje}%</span></p>
                    <p><strong>Puntaje:</strong> ${calif.puntaje_obtenido} / ${calif.puntaje_total}</p>
                    <p><strong>Preguntas:</strong> ${calif.total_preguntas}</p>
                    <p><small style="color: #666;">Fecha: ${new Date(calif.fecha_examen).toLocaleString()}</small></p>
                </div>
            `;
        });
        
        const promedio = Math.round((califEstudiante.reduce((sum, c) => sum + c.porcentaje, 0) / califEstudiante.length) * 100) / 100;
        html += `
                <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; text-align: center;">
                    <strong>Promedio General: ${promedio}%</strong>
                </div>
            </div>
        `;
        
        crearModal('Exámenes del Estudiante', html);
    } catch (error) {
        console.error('Error al cargar calificaciones:', error);
        alert('Error al cargar las calificaciones');
    }
}

// Mostrar formulario para crear curso
function mostrarFormularioCurso() {
    crearModal('Crear Nuevo Curso', `
        <form id="form-curso-tutor">
            <div class="form-group">
                <label>Nombre del Curso:</label>
                <input type="text" id="curso-nombre-tutor" class="form-control" required placeholder="Ej: Matemáticas Avanzadas">
            </div>
            <div class="form-group">
                <label>Descripción:</label>
                <textarea id="curso-descripcion-tutor" class="form-control" rows="3" placeholder="Descripción del curso"></textarea>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="submit" class="btn btn-primary" id="crear-curso-tutor-btn">Crear Curso</button>
                <button type="button" class="btn btn-secondary" onclick="cerrarModalTutor()">Cancelar</button>
            </div>
        </form>
    `);
    
    const form = document.getElementById('form-curso-tutor');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await crearCursoTutor();
        });
    }
}

// Crear curso
async function crearCursoTutor() {
    const nombre = document.getElementById('curso-nombre-tutor')?.value.trim();
    const descripcion = document.getElementById('curso-descripcion-tutor')?.value.trim();
    
    if (!nombre) {
        mostrarNotificacion('El nombre del curso es requerido', 'error');
        return;
    }
    
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const btn = document.getElementById('crear-curso-tutor-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Creando...';
        }
        
        console.log('Creando curso:', { nombre, descripcion });
        const response = await fetchApi('/api/tutor/cursos', {
            method: 'POST',
            body: JSON.stringify({ nombre, descripcion })
        });
        
        console.log('Respuesta de creación de curso:', response.status, response.statusText);
        
        if (response.ok) {
            const curso = await response.json();
            console.log('Curso creado:', curso);
            mostrarNotificacion('Curso creado exitosamente', 'success');
            cerrarModalTutor();
            await cargarCursosTutor();
        } else {
            const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
            console.error('Error al crear curso:', errorData);
            mostrarNotificacion('Error al crear curso: ' + (errorData.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al crear curso:', error);
        mostrarNotificacion('Error al crear curso: ' + error.message, 'error');
    } finally {
        const btn = document.getElementById('crear-curso-tutor-btn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Crear Curso';
        }
    }
}

// Editar curso
async function editarCursoTutor(cursoId) {
    const curso = tutorCursos.find(c => c.id === cursoId);
    if (!curso) return;
    
    crearModal('Editar Curso', `
        <form id="form-editar-curso-tutor">
            <div class="form-group">
                <label>Nombre del Curso:</label>
                <input type="text" id="edit-curso-nombre-tutor" class="form-control" value="${curso.nombre}" required>
            </div>
            <div class="form-group">
                <label>Descripción:</label>
                <textarea id="edit-curso-descripcion-tutor" class="form-control" rows="3">${curso.descripcion || ''}</textarea>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="submit" class="btn btn-primary" id="actualizar-curso-tutor-btn">Actualizar</button>
                <button type="button" class="btn btn-secondary" onclick="cerrarModalTutor()">Cancelar</button>
            </div>
        </form>
    `);
    
    const form = document.getElementById('form-editar-curso-tutor');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await actualizarCursoTutor(cursoId);
        });
    }
}

// Actualizar curso
async function actualizarCursoTutor(cursoId) {
    const nombre = document.getElementById('edit-curso-nombre-tutor')?.value.trim();
    const descripcion = document.getElementById('edit-curso-descripcion-tutor')?.value.trim();
    
    if (!nombre) {
        mostrarNotificacion('El nombre del curso es requerido', 'error');
        return;
    }
    
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const btn = document.getElementById('actualizar-curso-tutor-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Actualizando...';
        }
        
        const response = await fetchApi(`/api/tutor/cursos/${cursoId}`, {
            method: 'PUT',
            body: JSON.stringify({ nombre, descripcion })
        });
        
        if (response.ok) {
            mostrarNotificacion('Curso actualizado exitosamente', 'success');
            cerrarModalTutor();
            await cargarCursosTutor();
        } else {
            const error = await response.json();
            mostrarNotificacion('Error al actualizar curso: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al actualizar curso:', error);
        mostrarNotificacion('Error al actualizar curso', 'error');
    } finally {
        const btn = document.getElementById('actualizar-curso-tutor-btn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Actualizar';
        }
    }
}

// Eliminar curso
async function eliminarCursoTutor(cursoId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este curso? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const response = await fetchApi(`/api/tutor/cursos/${cursoId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            mostrarNotificacion('Curso eliminado exitosamente', 'success');
            await cargarCursosTutor();
        } else {
            const error = await response.json();
            mostrarNotificacion('Error al eliminar curso: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al eliminar curso:', error);
        mostrarNotificacion('Error al eliminar curso', 'error');
    }
}

// Gestionar curso (ver contenidos, asignar estudiantes)
async function gestionarCursoTutor(cursoId) {
    cursoSeleccionado = tutorCursos.find(c => c.id === cursoId);
    if (!cursoSeleccionado) return;
    
    // Por ahora, mostrar un modal con opciones
    crearModal(`Gestionar: ${cursoSeleccionado.nombre}`, `
        <div style="display: flex; flex-direction: column; gap: 15px;">
            <button class="btn btn-primary" onclick="gestionarContenidosTutor(${cursoId})">Gestionar Contenidos</button>
            <button class="btn btn-primary" onclick="gestionarEstudiantesCursoTutor(${cursoId})">Asignar Estudiantes</button>
            <button class="btn btn-secondary" onclick="cerrarModalTutor()">Cerrar</button>
        </div>
    `);
}

// Gestionar contenidos del curso
async function gestionarContenidosTutor(cursoId) {
    cursoSeleccionado = tutorCursos.find(c => c.id === cursoId);
    if (!cursoSeleccionado) return;
    
    cerrarModalTutor();
    
    // Crear modal para gestionar contenidos
    crearModal(`Gestionar Contenidos: ${cursoSeleccionado.nombre}`, `
        <div style="margin-bottom: 20px;">
            <button class="btn btn-primary" onclick="mostrarFormularioContenidoTutor(${cursoId})">+ Nuevo Contenido</button>
        </div>
        <div id="tutor-contenidos-list" class="admin-list"></div>
    `);
    
    await cargarContenidosTutor(cursoId);
}

// Cargar contenidos del curso
async function cargarContenidosTutor(cursoId) {
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const response = await fetchApi(`/api/tutor/cursos/${cursoId}/contenidos`);
        
        if (response.ok) {
            const contenidos = await response.json();
            mostrarContenidosTutor(contenidos);
        } else {
            const error = await response.json();
            mostrarNotificacion('Error al cargar contenidos: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al cargar contenidos:', error);
        mostrarNotificacion('Error al cargar contenidos', 'error');
    }
}

// Mostrar contenidos
function mostrarContenidosTutor(contenidos) {
    const listEl = document.getElementById('tutor-contenidos-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    if (contenidos.length === 0) {
        listEl.innerHTML = '<p style="text-align: center; color: var(--medium-gray); padding: 20px;">No hay contenidos. Crea el primero.</p>';
        return;
    }
    
    contenidos.forEach(contenido => {
        const contenidoDiv = document.createElement('div');
        contenidoDiv.className = 'admin-item';
        contenidoDiv.style.marginBottom = '15px';
        contenidoDiv.innerHTML = `
            <div class="admin-item-content">
                <h4>${contenido.nombre}</h4>
                <p>
                    <span class="badge" style="background: var(--primary-color); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${contenido.tipo.toUpperCase()}</span>
                    ${contenido.peso_mb ? `<span style="margin-left: 10px;">${contenido.peso_mb} MB</span>` : ''}
                    <span style="margin-left: 10px;">Orden: ${contenido.orden}</span>
                </p>
            </div>
            <div class="admin-item-actions" style="display: flex; gap: 10px;">
                <button class="btn btn-secondary btn-sm" onclick="editarContenidoTutor(${contenido.id})">Editar</button>
                ${contenido.tipo === 'quiz' ? `<button class="btn btn-primary btn-sm" onclick="gestionarPreguntasTutor(${contenido.id})">Gestionar Preguntas</button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="eliminarContenidoTutor(${contenido.id}, ${cursoSeleccionado.id})">Eliminar</button>
            </div>
        `;
        listEl.appendChild(contenidoDiv);
    });
}

// Mostrar formulario de contenido
async function mostrarFormularioContenidoTutor(cursoId) {
    crearModal('Nuevo Contenido', `
        <form id="form-contenido-tutor" enctype="multipart/form-data">
            <div class="form-group">
                <label>Tipo de Contenido:</label>
                <select id="contenido-tipo-tutor" class="form-control" required>
                    <option value="">-- Selecciona --</option>
                    <option value="pdf">PDF</option>
                    <option value="video">Video</option>
                    <option value="texto">Texto</option>
                    <option value="quiz">Cuestionario</option>
                </select>
            </div>
            <div class="form-group">
                <label>Nombre:</label>
                <input type="text" id="contenido-nombre-tutor" class="form-control" required>
            </div>
            
            <!-- Campo para texto directo (solo para tipo texto) -->
            <div class="form-group" id="texto-directo-group-tutor" style="display: none;">
                <label>Contenido del Texto:</label>
                <textarea id="contenido-texto-directo-tutor" class="form-control" rows="10" placeholder="Escribe el contenido del texto aquí..."></textarea>
                <p style="font-size: 12px; color: var(--medium-gray); margin-top: 5px;">
                    💡 También puedes subir un archivo .txt si prefieres
                </p>
            </div>
            
            <!-- Campo para archivo (pdf, video, texto opcional) -->
            <div class="form-group" id="archivo-group-tutor">
                <label>Archivo:</label>
                <input type="file" id="contenido-archivo-tutor" class="form-control">
                <p id="archivo-hint-tutor" style="font-size: 12px; color: var(--medium-gray); margin-top: 5px;"></p>
            </div>
            
            <div class="form-group">
                <label>Orden:</label>
                <input type="number" id="contenido-orden-tutor" class="form-control" value="0" min="0">
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="submit" class="btn btn-primary" id="crear-contenido-tutor-btn">Crear</button>
                <button type="button" class="btn btn-secondary" onclick="cerrarModalTutor()">Cancelar</button>
            </div>
        </form>
    `);
    
    // Mostrar/ocultar campos según el tipo
    const tipoInput = document.getElementById('contenido-tipo-tutor');
    const archivoGroup = document.getElementById('archivo-group-tutor');
    const textoDirectoGroup = document.getElementById('texto-directo-group-tutor');
    const archivoInput = document.getElementById('contenido-archivo-tutor');
    const archivoHint = document.getElementById('archivo-hint-tutor');
    
    const toggleCampos = () => {
        const tipo = tipoInput.value;
        
        if (tipo === 'quiz') {
            // Quiz: no necesita archivo ni texto
            archivoGroup.style.display = 'none';
            textoDirectoGroup.style.display = 'none';
            archivoInput.required = false;
        } else if (tipo === 'texto') {
            // Texto: mostrar textarea y archivo opcional
            textoDirectoGroup.style.display = 'block';
            archivoGroup.style.display = 'block';
            archivoInput.accept = '.txt';
            archivoInput.required = false;
            archivoHint.textContent = 'Opcional: puedes subir un archivo .txt. Si escribes texto Y subes archivo, se usará el texto escrito.';
        } else if (tipo === 'pdf') {
            // PDF: solo archivo requerido
            textoDirectoGroup.style.display = 'none';
            archivoGroup.style.display = 'block';
            archivoInput.accept = '.pdf';
            archivoInput.required = true;
            archivoHint.textContent = 'Se requiere subir un archivo PDF';
        } else if (tipo === 'video') {
            // Video: solo archivo requerido
            textoDirectoGroup.style.display = 'none';
            archivoGroup.style.display = 'block';
            archivoInput.accept = '.mp4,.webm,.ogg';
            archivoInput.required = true;
            archivoHint.textContent = 'Se requiere subir un archivo de video (MP4, WebM, OGG)';
        } else {
            // Tipo no seleccionado
            archivoGroup.style.display = 'none';
            textoDirectoGroup.style.display = 'none';
            archivoInput.required = false;
        }
    };
    
    tipoInput.addEventListener('change', toggleCampos);
    
    // Ejecutar al cargar para configurar campos iniciales
    toggleCampos();
    
    const form = document.getElementById('form-contenido-tutor');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await crearContenidoTutor(cursoId);
        });
    }
}

// Crear contenido
async function crearContenidoTutor(cursoId) {
    const tipo = document.getElementById('contenido-tipo-tutor')?.value;
    const nombre = document.getElementById('contenido-nombre-tutor')?.value.trim();
    const orden = document.getElementById('contenido-orden-tutor')?.value || 0;
    const archivo = document.getElementById('contenido-archivo-tutor')?.files[0];
    const textoDirecto = document.getElementById('contenido-texto-directo-tutor')?.value.trim();
    
    if (!tipo || !nombre) {
        mostrarNotificacion('El tipo y nombre son requeridos', 'error');
        return;
    }
    
    // Validaciones específicas por tipo
    if (tipo === 'texto') {
        // Para texto: se requiere texto directo O archivo
        if (!textoDirecto && !archivo) {
            mostrarNotificacion('Debes escribir el texto o subir un archivo .txt', 'error');
            return;
        }
    } else if (['pdf', 'video'].includes(tipo)) {
        // Para PDF y video: se requiere archivo
        if (!archivo) {
            mostrarNotificacion('Debes subir un archivo para este tipo de contenido', 'error');
            return;
        }
    }
    
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const btn = document.getElementById('crear-contenido-tutor-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Creando...';
        }
        
        const formData = new FormData();
        formData.append('tipo', tipo);
        formData.append('nombre', nombre);
        formData.append('orden', orden);
        
        // Si es texto y se escribió texto directo, crear un archivo Blob
        // Si hay texto escrito Y archivo subido, priorizar el texto escrito
        if (tipo === 'texto' && textoDirecto) {
            const blob = new Blob([textoDirecto], { type: 'text/plain' });
            const fileName = nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.txt';
            formData.append('archivo', blob, fileName);
        } else if (archivo) {
            // Si hay archivo (ya sea subido o para otros tipos), agregarlo
            formData.append('archivo', archivo);
        }
        
        // Para FormData, no usar fetchApi (necesita headers personalizados sin Content-Type)
        const apiUrl = (window.Config && window.Config.API_URL) || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/tutor/cursos/${cursoId}/contenidos`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (response.ok) {
            const contenido = await response.json();
            mostrarNotificacion('Contenido creado exitosamente', 'success');
            cerrarModalTutor();
            
            // Si es un cuestionario, abrir automáticamente el formulario de preguntas
            if (tipo === 'quiz') {
                setTimeout(async () => {
                    await gestionarPreguntasTutor(contenido.id);
                }, 500);
            } else {
                await cargarContenidosTutor(cursoId);
            }
        } else {
            const error = await response.json();
            mostrarNotificacion('Error al crear contenido: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al crear contenido:', error);
        mostrarNotificacion('Error al crear contenido', 'error');
    } finally {
        const btn = document.getElementById('crear-contenido-tutor-btn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Crear';
        }
    }
}

// Editar contenido
async function editarContenidoTutor(contenidoId) {
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) return;
        
        // Obtener el contenido
        const cursoId = cursoSeleccionado.id;
        const response = await fetchApi(`/api/tutor/cursos/${cursoId}/contenidos`);
        
        if (!response.ok) return;
        
        const contenidos = await response.json();
        const contenido = contenidos.find(c => c.id === contenidoId);
        if (!contenido) return;
        
        crearModal('Editar Contenido', `
            <form id="form-editar-contenido-tutor">
                <div class="form-group">
                    <label>Nombre:</label>
                    <input type="text" id="edit-contenido-nombre-tutor" class="form-control" value="${contenido.nombre}" required>
                </div>
                <div class="form-group">
                    <label>Orden:</label>
                    <input type="number" id="edit-contenido-orden-tutor" class="form-control" value="${contenido.orden || 0}" min="0">
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary" id="actualizar-contenido-tutor-btn">Actualizar</button>
                    <button type="button" class="btn btn-secondary" onclick="cerrarModalTutor()">Cancelar</button>
                </div>
            </form>
        `);
        
        const form = document.getElementById('form-editar-contenido-tutor');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await actualizarContenidoTutor(contenidoId, cursoId);
            });
        }
    } catch (error) {
        console.error('Error al editar contenido:', error);
        mostrarNotificacion('Error al cargar contenido', 'error');
    }
}

// Actualizar contenido
async function actualizarContenidoTutor(contenidoId, cursoId) {
    const nombre = document.getElementById('edit-contenido-nombre-tutor')?.value.trim();
    const orden = document.getElementById('edit-contenido-orden-tutor')?.value || 0;
    
    if (!nombre) {
        mostrarNotificacion('El nombre es requerido', 'error');
        return;
    }
    
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const btn = document.getElementById('actualizar-contenido-tutor-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Actualizando...';
        }
        
        const response = await fetchApi(`/api/tutor/contenidos/${contenidoId}`, {
            method: 'PUT',
            body: JSON.stringify({ nombre, orden: parseInt(orden) })
        });
        
        if (response.ok) {
            mostrarNotificacion('Contenido actualizado exitosamente', 'success');
            cerrarModalTutor();
            await cargarContenidosTutor(cursoId);
        } else {
            const error = await response.json();
            mostrarNotificacion('Error al actualizar contenido: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al actualizar contenido:', error);
        mostrarNotificacion('Error al actualizar contenido', 'error');
    } finally {
        const btn = document.getElementById('actualizar-contenido-tutor-btn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Actualizar';
        }
    }
}

// Eliminar contenido
async function eliminarContenidoTutor(contenidoId, cursoId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este contenido?')) {
        return;
    }
    
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const response = await fetchApi(`/api/tutor/contenidos/${contenidoId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            mostrarNotificacion('Contenido eliminado exitosamente', 'success');
            await cargarContenidosTutor(cursoId);
        } else {
            const error = await response.json();
            mostrarNotificacion('Error al eliminar contenido: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al eliminar contenido:', error);
        mostrarNotificacion('Error al eliminar contenido', 'error');
    }
}

// Gestionar estudiantes del curso
async function gestionarEstudiantesCursoTutor(cursoId) {
    cursoSeleccionado = tutorCursos.find(c => c.id === cursoId);
    if (!cursoSeleccionado) return;
    
    cerrarModalTutor();
    
    crearModal(`Asignar Estudiantes: ${cursoSeleccionado.nombre}`, `
        <div style="margin-bottom: 20px;">
            <h4>Estudiantes Asignados</h4>
            <div id="estudiantes-asignados-list" style="margin-bottom: 20px;"></div>
        </div>
        <div>
            <h4>Asignar Nuevo Estudiante</h4>
            <div class="form-group">
                <label>Buscar Estudiante:</label>
                <input type="text" id="buscar-estudiante-tutor" class="form-control" placeholder="Buscar por matrícula o nombre..." onkeyup="buscarEstudiantesTutor(event)">
            </div>
            <div id="estudiantes-disponibles-list"></div>
        </div>
    `);
    
    await cargarEstudiantesAsignadosTutor(cursoId);
    await cargarEstudiantesDisponiblesTutor(cursoId);
}

// Cargar estudiantes asignados al curso
async function cargarEstudiantesAsignadosTutor(cursoId) {
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) return;
        
        const response = await fetchApi(`/api/tutor/cursos/${cursoId}/estudiantes`);
        
        if (response.ok) {
            const estudiantes = await response.json();
            mostrarEstudiantesAsignadosTutor(estudiantes, cursoId);
        }
    } catch (error) {
        console.error('Error al cargar estudiantes asignados:', error);
    }
}

// Mostrar estudiantes asignados
function mostrarEstudiantesAsignadosTutor(estudiantes, cursoId) {
    const listEl = document.getElementById('estudiantes-asignados-list');
    if (!listEl) return;
    
    if (estudiantes.length === 0) {
        listEl.innerHTML = '<p style="color: var(--medium-gray);">No hay estudiantes asignados.</p>';
        return;
    }
    
    listEl.innerHTML = '';
    estudiantes.forEach(estudiante => {
        const div = document.createElement('div');
        div.className = 'admin-item';
        div.style.marginBottom = '10px';
        div.innerHTML = `
            <div class="admin-item-content">
                <h4>${estudiante.nombre || estudiante.matricula}</h4>
                <p>Matrícula: ${estudiante.matricula}</p>
            </div>
            <div class="admin-item-actions">
                <button class="btn btn-danger btn-sm" onclick="desasignarEstudianteTutor(${cursoId}, ${estudiante.id})">Desasignar</button>
            </div>
        `;
        listEl.appendChild(div);
    });
}

// Cargar estudiantes disponibles (todos los estudiantes del sistema)
async function cargarEstudiantesDisponiblesTutor(cursoId, filtro = '') {
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) return;
        
        // Obtener estudiantes asignados al curso
        const asignadosResponse = await fetch(`http://localhost:8080/api/tutor/cursos/${cursoId}/estudiantes`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        let estudiantesAsignados = [];
        if (asignadosResponse.ok) {
            estudiantesAsignados = await asignadosResponse.json();
        }
        
        // Obtener todos los estudiantes del sistema
        const todosResponse = await fetchApi('/api/tutor/estudiantes/todos');
        
        if (todosResponse.ok) {
            const todosEstudiantes = await todosResponse.json();
            // Filtrar estudiantes ya asignados y aplicar filtro de búsqueda
            const disponibles = todosEstudiantes.filter(e => {
                const yaAsignado = estudiantesAsignados.some(a => a.id === e.id);
                const coincideFiltro = !filtro || 
                    e.matricula.toLowerCase().includes(filtro.toLowerCase()) ||
                    (e.nombre && e.nombre.toLowerCase().includes(filtro.toLowerCase()));
                return !yaAsignado && coincideFiltro;
            });
            
            mostrarEstudiantesDisponiblesTutor(disponibles, cursoId);
        } else {
            // Si no hay estudiantes todavía, mostrar mensaje
            mostrarEstudiantesDisponiblesTutor([], cursoId);
        }
    } catch (error) {
        console.error('Error al cargar estudiantes disponibles:', error);
        mostrarEstudiantesDisponiblesTutor([], cursoId);
    }
}

// Mostrar estudiantes disponibles
function mostrarEstudiantesDisponiblesTutor(estudiantes, cursoId) {
    const listEl = document.getElementById('estudiantes-disponibles-list');
    if (!listEl) return;
    
    if (estudiantes.length === 0) {
        listEl.innerHTML = '<p style="color: var(--medium-gray);">No hay estudiantes disponibles.</p>';
        return;
    }
    
    listEl.innerHTML = '';
    estudiantes.forEach(estudiante => {
        const div = document.createElement('div');
        div.className = 'admin-item';
        div.style.marginBottom = '10px';
        div.innerHTML = `
            <div class="admin-item-content">
                <h4>${estudiante.nombre || estudiante.matricula}</h4>
                <p>Matrícula: ${estudiante.matricula}</p>
            </div>
            <div class="admin-item-actions">
                <button class="btn btn-primary btn-sm" onclick="asignarEstudianteTutor(${cursoId}, ${estudiante.id})">Asignar</button>
            </div>
        `;
        listEl.appendChild(div);
    });
}

// Buscar estudiantes
function buscarEstudiantesTutor(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
    }
    const filtro = event.target.value;
    cargarEstudiantesDisponiblesTutor(cursoSeleccionado.id, filtro);
}

// Asignar estudiante
async function asignarEstudianteTutor(cursoId, estudianteId) {
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const response = await fetchApi(`/api/tutor/cursos/${cursoId}/estudiantes/${estudianteId}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            mostrarNotificacion('Estudiante asignado exitosamente', 'success');
            await cargarEstudiantesAsignadosTutor(cursoId);
            await cargarEstudiantesDisponiblesTutor(cursoId, document.getElementById('buscar-estudiante-tutor')?.value || '');
        } else {
            const error = await response.json();
            mostrarNotificacion('Error al asignar estudiante: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al asignar estudiante:', error);
        mostrarNotificacion('Error al asignar estudiante', 'error');
    }
}

// Desasignar estudiante
async function desasignarEstudianteTutor(cursoId, estudianteId) {
    if (!confirm('¿Estás seguro de desasignar este estudiante?')) {
        return;
    }
    
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const response = await fetchApi(`/api/tutor/cursos/${cursoId}/estudiantes/${estudianteId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            mostrarNotificacion('Estudiante desasignado exitosamente', 'success');
            await cargarEstudiantesAsignadosTutor(cursoId);
            await cargarEstudiantesDisponiblesTutor(cursoId, document.getElementById('buscar-estudiante-tutor')?.value || '');
        } else {
            const error = await response.json();
            mostrarNotificacion('Error al desasignar estudiante: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al desasignar estudiante:', error);
        mostrarNotificacion('Error al desasignar estudiante', 'error');
    }
}

// ==================== GESTIÓN DE QUIZZES ====================

let contenidoQuizSeleccionado = null;
let preguntasQuiz = [];

// Gestionar preguntas de un quiz
async function gestionarPreguntasTutor(contenidoId) {
    contenidoQuizSeleccionado = contenidoId;
    
    // Cerrar modal anterior si existe
    cerrarModalTutor();
    
    crearModal('Gestionar Preguntas del Quiz', `
        <div style="margin-bottom: 20px;">
            <button class="btn btn-primary" onclick="mostrarFormularioPreguntaTutor()">+ Nueva Pregunta</button>
        </div>
        <div id="tutor-preguntas-list" class="admin-list"></div>
    `);
    
    await cargarPreguntasTutor(contenidoId);
}

// Cargar preguntas del quiz
async function cargarPreguntasTutor(contenidoId) {
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const response = await fetchApi(`/api/tutor/contenidos/${contenidoId}/preguntas-completas`);
        
        if (response.ok) {
            preguntasQuiz = await response.json();
            mostrarPreguntasTutor(preguntasQuiz);
        } else {
            const error = await response.json();
            mostrarNotificacion('Error al cargar preguntas: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al cargar preguntas:', error);
        mostrarNotificacion('Error al cargar preguntas', 'error');
    }
}

// Mostrar preguntas
function mostrarPreguntasTutor(preguntas) {
    const listEl = document.getElementById('tutor-preguntas-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    if (preguntas.length === 0) {
        listEl.innerHTML = '<p style="text-align: center; color: var(--medium-gray); padding: 20px;">No hay preguntas. Crea la primera.</p>';
        return;
    }
    
    preguntas.forEach((pregunta, index) => {
        const preguntaDiv = document.createElement('div');
        preguntaDiv.className = 'admin-item';
        preguntaDiv.style.marginBottom = '20px';
        preguntaDiv.style.padding = '15px';
        preguntaDiv.style.border = '1px solid var(--border-color)';
        preguntaDiv.style.borderRadius = '8px';
        
        let opcionesHtml = '';
        if (pregunta.opciones && pregunta.opciones.length > 0) {
            opcionesHtml = '<div style="margin-top: 10px;"><strong>Opciones:</strong><ul style="margin-top: 5px;">';
            pregunta.opciones.forEach(opcion => {
                opcionesHtml += `<li style="color: ${opcion.es_correcta ? 'green' : 'inherit'};">
                    ${opcion.texto} ${opcion.es_correcta ? '(Correcta)' : ''}
                    <button class="btn btn-sm" style="margin-left: 10px; padding: 2px 8px;" onclick="editarOpcionTutor(${opcion.id})">Editar</button>
                    <button class="btn btn-sm btn-danger" style="margin-left: 5px; padding: 2px 8px;" onclick="eliminarOpcionTutor(${opcion.id})">Eliminar</button>
                </li>`;
            });
            opcionesHtml += '</ul></div>';
        }
        
        preguntaDiv.innerHTML = `
            <div class="admin-item-content">
                <h4>Pregunta ${index + 1}: ${pregunta.texto}</h4>
                <p>
                    <span class="badge" style="background: var(--secondary-color); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${pregunta.tipo}</span>
                    <span style="margin-left: 10px;">Puntaje: ${pregunta.puntaje || 1}</span>
                    <span style="margin-left: 10px;">Orden: ${pregunta.orden || 0}</span>
                </p>
                ${opcionesHtml}
                ${pregunta.tipo === 'opcion_multiple' || pregunta.tipo === 'verdadero_falso' ? 
                    `<button class="btn btn-primary btn-sm" style="margin-top: 10px;" onclick="mostrarFormularioOpcionTutor(${pregunta.id})">+ Agregar Opción</button>` : ''}
            </div>
            <div class="admin-item-actions" style="display: flex; gap: 10px; margin-top: 10px;">
                <button class="btn btn-secondary btn-sm" onclick="editarPreguntaTutor(${pregunta.id})">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="eliminarPreguntaTutor(${pregunta.id})">Eliminar</button>
            </div>
        `;
        listEl.appendChild(preguntaDiv);
    });
}

// Mostrar formulario de pregunta
async function mostrarFormularioPreguntaTutor(pregunta = null) {
    const esEdicion = pregunta !== null;
    const preguntaData = pregunta ? preguntasQuiz.find(p => p.id === pregunta) : null;
    
    crearModal(`${esEdicion ? 'Editar' : 'Nueva'} Pregunta`, `
        <form id="form-pregunta-tutor">
            <div class="form-group">
                <label>Texto de la Pregunta:</label>
                <textarea id="pregunta-texto-tutor" class="form-control" rows="3" required placeholder="Escribe la pregunta aquí...">${preguntaData ? preguntaData.texto : ''}</textarea>
            </div>
            <div class="form-group">
                <label>Tipo:</label>
                <select id="pregunta-tipo-tutor" class="form-control" ${esEdicion ? 'disabled' : 'required'}>
                    <option value="">-- Selecciona --</option>
                    <option value="opcion_multiple" ${preguntaData && preguntaData.tipo === 'opcion_multiple' ? 'selected' : ''}>Opción Múltiple</option>
                    <option value="verdadero_falso" ${preguntaData && preguntaData.tipo === 'verdadero_falso' ? 'selected' : ''}>Verdadero/Falso</option>
                    <option value="texto" ${preguntaData && preguntaData.tipo === 'texto' ? 'selected' : ''}>Texto Libre</option>
                </select>
            </div>
            <div class="form-group">
                <label>Puntaje:</label>
                <input type="number" id="pregunta-puntaje-tutor" class="form-control" value="${preguntaData ? preguntaData.puntaje || 1 : 1}" min="1">
            </div>
            <div class="form-group">
                <label>Orden:</label>
                <input type="number" id="pregunta-orden-tutor" class="form-control" value="${preguntaData ? preguntaData.orden || 0 : 0}" min="0">
            </div>
            
            <!-- Opciones para pregunta de opción múltiple -->
            <div id="opciones-container-tutor" style="display: none; margin-top: 20px; border-top: 2px solid var(--border-color); padding-top: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <label style="font-weight: bold; margin: 0;">Opciones de Respuesta:</label>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="agregarOpcionInputTutor()">+ Agregar Opción</button>
                </div>
                <div id="opciones-list-tutor" style="display: flex; flex-direction: column; gap: 10px;">
                </div>
                <p style="font-size: 12px; color: var(--medium-gray); margin-top: 10px;">
                    💡 Selecciona la opción correcta marcando el botón radial. Mínimo 2 opciones requeridas.
                </p>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="submit" class="btn btn-primary" id="${esEdicion ? 'actualizar' : 'crear'}-pregunta-tutor-btn">${esEdicion ? 'Actualizar' : 'Crear Pregunta'}</button>
                <button type="button" class="btn btn-secondary" onclick="cerrarModalTutor()">Cancelar</button>
            </div>
        </form>
    `);
    
    // Mostrar/ocultar opciones según el tipo
    const tipoSelect = document.getElementById('pregunta-tipo-tutor');
    const opcionesContainer = document.getElementById('opciones-container-tutor');
    
    if (tipoSelect && opcionesContainer) {
        const toggleOpciones = () => {
            const tipo = tipoSelect.value;
            if (tipo === 'opcion_multiple' && !esEdicion) {
                opcionesContainer.style.display = 'block';
                // Si no hay opciones, agregar 2 por defecto
                const opcionesList = document.getElementById('opciones-list-tutor');
                if (opcionesList && opcionesList.children.length === 0) {
                    agregarOpcionInputTutor();
                    agregarOpcionInputTutor();
                }
            } else if (tipo === 'verdadero_falso' && !esEdicion) {
                opcionesContainer.style.display = 'block';
                // Para verdadero/falso, agregar solo 2 opciones fijas
                const opcionesList = document.getElementById('opciones-list-tutor');
                if (opcionesList) {
                    opcionesList.innerHTML = `
                        <div class="opcion-item-tutor" style="display: flex; gap: 10px; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                            <input type="radio" name="opcion-correcta-tutor" value="0" style="cursor: pointer;">
                            <input type="text" class="form-control opcion-texto-tutor" value="Verdadero" readonly style="flex: 1; background: #e9ecef;">
                        </div>
                        <div class="opcion-item-tutor" style="display: flex; gap: 10px; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                            <input type="radio" name="opcion-correcta-tutor" value="1" style="cursor: pointer;">
                            <input type="text" class="form-control opcion-texto-tutor" value="Falso" readonly style="flex: 1; background: #e9ecef;">
                        </div>
                    `;
                }
            } else {
                opcionesContainer.style.display = 'none';
            }
        };
        
        tipoSelect.addEventListener('change', toggleOpciones);
        
        // Ejecutar al cargar si es opción múltiple
        if (preguntaData && preguntaData.tipo === 'opcion_multiple') {
            setTimeout(() => {
                toggleOpciones();
                // Cargar opciones existentes
                if (preguntaData.opciones && preguntaData.opciones.length > 0) {
                    const opcionesList = document.getElementById('opciones-list-tutor');
                    if (opcionesList) {
                        opcionesList.innerHTML = '';
                        preguntaData.opciones.forEach((op, idx) => {
                            const opcionDiv = document.createElement('div');
                            opcionDiv.className = 'opcion-item-tutor';
                            opcionDiv.style.cssText = 'display: flex; gap: 10px; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 5px;';
                            opcionDiv.innerHTML = `
                                <input type="radio" name="opcion-correcta-tutor" value="${idx}" ${op.es_correcta ? 'checked' : ''} style="cursor: pointer;">
                                <input type="text" class="form-control opcion-texto-tutor" value="${op.texto.replace(/"/g, '&quot;')}" placeholder="Texto de la opción" style="flex: 1;">
                                <button type="button" class="btn btn-danger btn-sm" onclick="eliminarOpcionInputTutor(this)" style="padding: 5px 10px;">×</button>
                            `;
                            opcionesList.appendChild(opcionDiv);
                        });
                    }
                }
            }, 100);
        } else if (!esEdicion) {
            toggleOpciones();
        }
    }
    
    const form = document.getElementById('form-pregunta-tutor');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (esEdicion) {
                await actualizarPreguntaTutor(pregunta);
            } else {
                await crearPreguntaTutor();
            }
        });
    }
}

// Agregar campo de opción dinámicamente
function agregarOpcionInputTutor() {
    const opcionesList = document.getElementById('opciones-list-tutor');
    if (!opcionesList) return;
    
    const opcionCount = opcionesList.children.length;
    const opcionDiv = document.createElement('div');
    opcionDiv.className = 'opcion-item-tutor';
    opcionDiv.style.cssText = 'display: flex; gap: 10px; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 5px;';
    opcionDiv.innerHTML = `
        <input type="radio" name="opcion-correcta-tutor" value="${opcionCount}" style="cursor: pointer;">
        <input type="text" class="form-control opcion-texto-tutor" placeholder="Texto de la opción" style="flex: 1;" required>
        <button type="button" class="btn btn-danger btn-sm" onclick="eliminarOpcionInputTutor(this)" style="padding: 5px 10px;">×</button>
    `;
    opcionesList.appendChild(opcionDiv);
}

// Eliminar campo de opción
function eliminarOpcionInputTutor(btn) {
    const opcionesList = document.getElementById('opciones-list-tutor');
    if (!opcionesList) return;
    
    if (opcionesList.children.length <= 2) {
        mostrarNotificacion('Debes tener al menos 2 opciones', 'warning');
        return;
    }
    
    btn.closest('.opcion-item-tutor').remove();
    
    // Renumerar los valores de los radios
    const radios = opcionesList.querySelectorAll('input[type="radio"]');
    radios.forEach((radio, idx) => {
        radio.value = idx;
    });
}

// Crear pregunta
async function crearPreguntaTutor() {
    const texto = document.getElementById('pregunta-texto-tutor')?.value.trim();
    const tipo = document.getElementById('pregunta-tipo-tutor')?.value;
    const puntaje = document.getElementById('pregunta-puntaje-tutor')?.value || 1;
    const orden = document.getElementById('pregunta-orden-tutor')?.value || 0;
    
    if (!texto || !tipo) {
        mostrarNotificacion('El texto y tipo son requeridos', 'error');
        return;
    }
    
    // Validar opciones para opción múltiple y verdadero/falso
    let opciones = [];
    if (tipo === 'opcion_multiple' || tipo === 'verdadero_falso') {
        const opcionesList = document.getElementById('opciones-list-tutor');
        if (!opcionesList) {
            mostrarNotificacion('No se encontró la lista de opciones', 'error');
            return;
        }
        
        const opcionInputs = opcionesList.querySelectorAll('.opcion-texto-tutor');
        const correctaRadio = document.querySelector('input[name="opcion-correcta-tutor"]:checked');
        
        if (opcionInputs.length < 2) {
            mostrarNotificacion('Debes agregar al menos 2 opciones', 'error');
            return;
        }
        
        if (!correctaRadio) {
            mostrarNotificacion('Debes seleccionar la respuesta correcta', 'error');
            return;
        }
        
        opciones = Array.from(opcionInputs).map((input, idx) => ({
            texto: input.value.trim(),
            es_correcta: idx === parseInt(correctaRadio.value),
            orden: idx
        }));
        
        // Validar que todas las opciones tengan texto
        if (opciones.some(op => !op.texto)) {
            mostrarNotificacion('Todas las opciones deben tener texto', 'error');
            return;
        }
    }
    
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const btn = document.getElementById('crear-pregunta-tutor-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Creando...';
        }
        
        // Crear la pregunta
        const response = await fetchApi(`/api/tutor/contenidos/${contenidoQuizSeleccionado}/preguntas`, {
            method: 'POST',
            body: JSON.stringify({ texto, tipo, puntaje: parseInt(puntaje), orden: parseInt(orden) })
        });
        
        if (response.ok) {
            const preguntaCreada = await response.json();
            
            // Crear las opciones si las hay
            if (opciones.length > 0) {
                for (const opcion of opciones) {
                    await fetch(`http://localhost:8080/api/tutor/preguntas/${preguntaCreada.id}/opciones`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            texto: opcion.texto,
                            es_correcta: opcion.es_correcta,
                            orden: opcion.orden
                        })
                    });
                }
            }
            
            mostrarNotificacion('Pregunta creada exitosamente', 'success');
            cerrarModalTutor();
            await cargarPreguntasTutor(contenidoQuizSeleccionado);
        } else {
            const error = await response.json();
            mostrarNotificacion('Error al crear pregunta: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al crear pregunta:', error);
        mostrarNotificacion('Error al crear pregunta', 'error');
    } finally {
        const btn = document.getElementById('crear-pregunta-tutor-btn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Crear Pregunta';
        }
    }
}

// Actualizar pregunta
async function actualizarPreguntaTutor(preguntaId) {
    const texto = document.getElementById('pregunta-texto-tutor')?.value.trim();
    const puntaje = document.getElementById('pregunta-puntaje-tutor')?.value || 1;
    const orden = document.getElementById('pregunta-orden-tutor')?.value || 0;
    
    if (!texto) {
        mostrarNotificacion('El texto es requerido', 'error');
        return;
    }
    
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const btn = document.getElementById('actualizar-pregunta-tutor-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Actualizando...';
        }
        
        const response = await fetchApi(`/api/tutor/preguntas/${preguntaId}`, {
            method: 'PUT',
            body: JSON.stringify({ texto, puntaje: parseInt(puntaje), orden: parseInt(orden) })
        });
        
        if (response.ok) {
            mostrarNotificacion('Pregunta actualizada exitosamente', 'success');
            cerrarModalTutor();
            await cargarPreguntasTutor(contenidoQuizSeleccionado);
        } else {
            const error = await response.json();
            mostrarNotificacion('Error al actualizar pregunta: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al actualizar pregunta:', error);
        mostrarNotificacion('Error al actualizar pregunta', 'error');
    } finally {
        const btn = document.getElementById('actualizar-pregunta-tutor-btn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Actualizar';
        }
    }
}

// Eliminar pregunta
async function eliminarPreguntaTutor(preguntaId) {
    if (!confirm('¿Estás seguro de eliminar esta pregunta? Esto también eliminará sus opciones.')) {
        return;
    }
    
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const response = await fetchApi(`/api/tutor/preguntas/${preguntaId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            mostrarNotificacion('Pregunta eliminada exitosamente', 'success');
            await cargarPreguntasTutor(contenidoQuizSeleccionado);
        } else {
            const error = await response.json();
            mostrarNotificacion('Error al eliminar pregunta: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al eliminar pregunta:', error);
        mostrarNotificacion('Error al eliminar pregunta', 'error');
    }
}

// Mostrar formulario de opción
async function mostrarFormularioOpcionTutor(preguntaId, opcionId = null) {
    const esEdicion = opcionId !== null;
    let opcionData = null;
    
    if (esEdicion) {
        const pregunta = preguntasQuiz.find(p => p.opciones && p.opciones.some(o => o.id === opcionId));
        if (pregunta) {
            opcionData = pregunta.opciones.find(o => o.id === opcionId);
            preguntaId = pregunta.id;
        }
    }
    
    crearModal(`${esEdicion ? 'Editar' : 'Nueva'} Opción`, `
        <form id="form-opcion-tutor">
            <div class="form-group">
                <label>Texto de la Opción:</label>
                <input type="text" id="opcion-texto-tutor" class="form-control" value="${opcionData ? opcionData.texto : ''}" required>
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="opcion-correcta-tutor" ${opcionData && opcionData.es_correcta ? 'checked' : ''}>
                    Es la respuesta correcta
                </label>
            </div>
            <div class="form-group">
                <label>Orden:</label>
                <input type="number" id="opcion-orden-tutor" class="form-control" value="${opcionData ? opcionData.orden || 0 : 0}" min="0">
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="submit" class="btn btn-primary" id="${esEdicion ? 'actualizar' : 'crear'}-opcion-tutor-btn">${esEdicion ? 'Actualizar' : 'Crear'}</button>
                <button type="button" class="btn btn-secondary" onclick="cerrarModalTutor()">Cancelar</button>
            </div>
        </form>
    `);
    
    const form = document.getElementById('form-opcion-tutor');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (esEdicion) {
                await actualizarOpcionTutor(opcionId);
            } else {
                await crearOpcionTutor(preguntaId);
            }
        });
    }
}

// Crear opción
async function crearOpcionTutor(preguntaId) {
    const texto = document.getElementById('opcion-texto-tutor')?.value.trim();
    const esCorrecta = document.getElementById('opcion-correcta-tutor')?.checked || false;
    const orden = document.getElementById('opcion-orden-tutor')?.value || 0;
    
    if (!texto) {
        mostrarNotificacion('El texto es requerido', 'error');
        return;
    }
    
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const btn = document.getElementById('crear-opcion-tutor-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Creando...';
        }
        
        const response = await fetchApi(`/api/tutor/preguntas/${preguntaId}/opciones`, {
            method: 'POST',
            body: JSON.stringify({ texto, es_correcta: esCorrecta, orden: parseInt(orden) })
        });
        
        if (response.ok) {
            mostrarNotificacion('Opción creada exitosamente', 'success');
            cerrarModalTutor();
            await cargarPreguntasTutor(contenidoQuizSeleccionado);
        } else {
            const error = await response.json();
            mostrarNotificacion('Error al crear opción: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al crear opción:', error);
        mostrarNotificacion('Error al crear opción', 'error');
    } finally {
        const btn = document.getElementById('crear-opcion-tutor-btn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Crear';
        }
    }
}

// Actualizar opción
async function actualizarOpcionTutor(opcionId) {
    const texto = document.getElementById('opcion-texto-tutor')?.value.trim();
    const esCorrecta = document.getElementById('opcion-correcta-tutor')?.checked || false;
    const orden = document.getElementById('opcion-orden-tutor')?.value || 0;
    
    if (!texto) {
        mostrarNotificacion('El texto es requerido', 'error');
        return;
    }
    
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const btn = document.getElementById('actualizar-opcion-tutor-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Actualizando...';
        }
        
        const response = await fetchApi(`/api/tutor/opciones/${opcionId}`, {
            method: 'PUT',
            body: JSON.stringify({ texto, es_correcta: esCorrecta, orden: parseInt(orden) })
        });
        
        if (response.ok) {
            mostrarNotificacion('Opción actualizada exitosamente', 'success');
            cerrarModalTutor();
            await cargarPreguntasTutor(contenidoQuizSeleccionado);
        } else {
            const error = await response.json();
            mostrarNotificacion('Error al actualizar opción: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al actualizar opción:', error);
        mostrarNotificacion('Error al actualizar opción', 'error');
    } finally {
        const btn = document.getElementById('actualizar-opcion-tutor-btn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Actualizar';
        }
    }
}

// Eliminar opción
async function eliminarOpcionTutor(opcionId) {
    if (!confirm('¿Estás seguro de eliminar esta opción?')) {
        return;
    }
    
    try {
        const token = getCurrentToken ? getCurrentToken() : (await offlineStorage.getAuth())?.token;
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const response = await fetchApi(`/api/tutor/opciones/${opcionId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            mostrarNotificacion('Opción eliminada exitosamente', 'success');
            await cargarPreguntasTutor(contenidoQuizSeleccionado);
        } else {
            const error = await response.json();
            mostrarNotificacion('Error al eliminar opción: ' + (error.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al eliminar opción:', error);
        mostrarNotificacion('Error al eliminar opción', 'error');
    }
}

// Editar pregunta (helper)
async function editarPreguntaTutor(preguntaId) {
    await mostrarFormularioPreguntaTutor(preguntaId);
}

// Editar opción (helper)
async function editarOpcionTutor(opcionId) {
    // Encontrar la pregunta que contiene esta opción
    for (const pregunta of preguntasQuiz) {
        if (pregunta.opciones && pregunta.opciones.some(o => o.id === opcionId)) {
            await mostrarFormularioOpcionTutor(pregunta.id, opcionId);
            return;
        }
    }
}

// Función auxiliar para crear modales (similar a admin.js)
function crearModal(titulo, contenido) {
    // Eliminar modal existente si hay
    const modalExistente = document.getElementById('tutor-modal');
    if (modalExistente) {
        modalExistente.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'tutor-modal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close" onclick="cerrarModalTutor()">&times;</span>
            <div class="modal-header" style="margin-bottom: 20px; border-bottom: 2px solid var(--border-color); padding-bottom: 15px;">
                <h3 style="margin: 0;">${titulo}</h3>
            </div>
            <div class="modal-body">
                ${contenido}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cerrar al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            cerrarModalTutor();
        }
    });
}

function cerrarModalTutor() {
    const modal = document.getElementById('tutor-modal');
    if (modal) {
        modal.remove();
    }
}

// Hacer funciones globales
window.inicializarTutor = inicializarTutor;
window.mostrarVistaTutor = mostrarVistaTutor;
window.cargarCursosTutor = cargarCursosTutor;
window.mostrarFormularioCurso = mostrarFormularioCurso;
window.crearCursoTutor = crearCursoTutor;
window.cargarEstudiantesParaChat = cargarEstudiantesParaChat;
window.mostrarEstudiantesParaChat = mostrarEstudiantesParaChat;
window.editarCursoTutor = editarCursoTutor;
window.eliminarCursoTutor = eliminarCursoTutor;
window.gestionarCursoTutor = gestionarCursoTutor;
window.gestionarContenidosTutor = gestionarContenidosTutor;
window.gestionarEstudiantesCursoTutor = gestionarEstudiantesCursoTutor;
window.mostrarFormularioContenidoTutor = mostrarFormularioContenidoTutor;
window.crearContenidoTutor = crearContenidoTutor;
window.editarContenidoTutor = editarContenidoTutor;
window.eliminarContenidoTutor = eliminarContenidoTutor;
window.asignarEstudianteTutor = asignarEstudianteTutor;
window.desasignarEstudianteTutor = desasignarEstudianteTutor;
window.buscarEstudiantesTutor = buscarEstudiantesTutor;
window.gestionarPreguntasTutor = gestionarPreguntasTutor;
window.mostrarFormularioPreguntaTutor = mostrarFormularioPreguntaTutor;
window.crearPreguntaTutor = crearPreguntaTutor;
window.editarPreguntaTutor = editarPreguntaTutor;
window.eliminarPreguntaTutor = eliminarPreguntaTutor;
window.mostrarFormularioOpcionTutor = mostrarFormularioOpcionTutor;
window.crearOpcionTutor = crearOpcionTutor;
window.editarOpcionTutor = editarOpcionTutor;
window.eliminarOpcionTutor = eliminarOpcionTutor;
window.agregarOpcionInputTutor = agregarOpcionInputTutor;
window.eliminarOpcionInputTutor = eliminarOpcionInputTutor;
window.crearModal = crearModal;
window.cerrarModalTutor = cerrarModalTutor;
// NO sobrescribir window.cerrarModal - esa función es para cerrar el modal de contenido
// Si necesitamos cerrar el modal de tutor, usar cerrarModalTutor()
window.verProgresoEstudiante = verProgresoEstudiante;
window.verCalificacionesEstudiante = verCalificacionesEstudiante;
window.verEstudiantesCurso = verEstudiantesCurso;
window.verProgresoEstudianteEnCurso = verProgresoEstudianteEnCurso;
