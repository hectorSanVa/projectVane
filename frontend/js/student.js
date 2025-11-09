// Funciones del panel de estudiante

// Mostrar vista del panel de estudiante
async function mostrarVistaEstudiante(vista) {
    // Ocultar todas las secciones
    document.querySelectorAll('.student-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Actualizar botones
    document.querySelectorAll('#student-panel .panel-header button').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
    });
    
    // Mostrar la vista seleccionada
    if (vista === 'dashboard') {
        document.getElementById('student-dashboard').classList.remove('hidden');
        document.getElementById('student-dashboard-btn').classList.remove('btn-secondary');
        document.getElementById('student-dashboard-btn').classList.add('btn-primary');
        if (typeof cargarDashboard === 'function') {
            await cargarDashboard();
        }
    } else if (vista === 'cursos') {
        const studentCursosEl = document.getElementById('student-cursos');
        const studentCursosBtn = document.getElementById('student-cursos-btn');
        
        if (studentCursosEl) {
            studentCursosEl.classList.remove('hidden');
        }
        if (studentCursosBtn) {
            studentCursosBtn.classList.remove('btn-secondary');
            studentCursosBtn.classList.add('btn-primary');
        }
        
        const cursoDetalleEl = document.getElementById('curso-detalle');
        const cursosViewEl = document.getElementById('cursos-view');
        const tutoresViewEl = document.getElementById('tutores-view');
        const tutorCursosViewEl = document.getElementById('student-tutor-cursos-view');
        
        if (cursoDetalleEl) cursoDetalleEl.classList.add('hidden');
        if (tutoresViewEl) tutoresViewEl.classList.add('hidden');
        if (tutorCursosViewEl) tutorCursosViewEl.classList.add('hidden');
        if (cursosViewEl) cursosViewEl.classList.remove('hidden');
        
        if (cursos.length === 0) {
            await cargarCursos();
        } else {
            await mostrarCursos();
        }
    } else if (vista === 'chat') {
        document.getElementById('student-chat').classList.remove('hidden');
        document.getElementById('student-chat-btn').classList.remove('btn-secondary');
        document.getElementById('student-chat-btn').classList.add('btn-primary');
    }
}

// Cargar cursos asignados
async function cargarCursos() {
    try {
        const token = getCurrentToken();
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const response = await fetchApi('/api/estudiante/cursos');
        
        if (response.ok) {
            cursos = await response.json();
            await offlineStorage.saveCursosCache(cursos);
            
            // Limpiar progresos con curso_id inválidos después de cargar cursos
            if (cursos.length > 0 && typeof offlineStorage !== 'undefined' && typeof offlineStorage.limpiarProgresosInvalidos === 'function') {
                try {
                    const cursoIds = cursos.map(c => c.id);
                    const eliminados = await offlineStorage.limpiarProgresosInvalidos(cursoIds);
                    if (eliminados > 0) {
                        console.log(`✅ Se eliminaron ${eliminados} progresos con curso_id inválidos del IndexedDB`);
                    }
                } catch (error) {
                    console.warn('Error al limpiar progresos inválidos:', error);
                }
            }
            
            await mostrarCursos();
        } else {
            console.error('Error al cargar cursos asignados, intentando cache...');
            const cachedCursos = await offlineStorage.getCursosCache();
            if (cachedCursos && cachedCursos.length > 0) {
                cursos = cachedCursos;
                await mostrarCursos();
            } else {
                mostrarMensajeSinCursos();
            }
        }
    } catch (error) {
        console.error('Error al cargar cursos:', error);
        try {
            const cachedCursos = await offlineStorage.getCursosCache();
            if (cachedCursos && cachedCursos.length > 0) {
                cursos = cachedCursos;
                await mostrarCursos();
            } else {
                mostrarMensajeError();
            }
        } catch (cacheError) {
            mostrarMensajeError();
        }
    }
}

// Mostrar cursos asignados
async function mostrarCursos() {
    console.log('mostrarCursos llamado');
    const cursosViewEl = document.getElementById('cursos-view');
    const cursoDetalleEl = document.getElementById('curso-detalle');
    const cursosListEl = document.getElementById('cursos-list');
    const tutoresViewEl = document.getElementById('tutores-view');
    const tutorCursosViewEl = document.getElementById('student-tutor-cursos-view');
    
    if (!cursosListEl) {
        console.error('No se encontró el elemento cursos-list');
        return;
    }
    
    if (cursoDetalleEl) cursoDetalleEl.classList.add('hidden');
    if (tutoresViewEl) tutoresViewEl.classList.add('hidden');
    if (tutorCursosViewEl) tutorCursosViewEl.classList.add('hidden');
    if (cursosViewEl) cursosViewEl.classList.remove('hidden');
    
    cursosListEl.innerHTML = '';
    
    if (cursos.length === 0) {
        mostrarMensajeSinCursos();
        return;
    }
    
    await cargarProgresoCursos();
    await actualizarProgresoCursos();
    
    cursos.forEach(curso => {
        const cursoCard = document.createElement('div');
        cursoCard.className = 'curso-card';
        cursoCard.dataset.cursoId = curso.id;
        
        const progreso = curso.progreso || 0;
        const progresoPorcentaje = Math.round(progreso);
        
        cursoCard.innerHTML = `
            <div class="curso-card-header">
                <h3>${curso.nombre || 'Sin nombre'}</h3>
                <span class="curso-badge">${curso.tutor_nombre || 'Sin tutor'}</span>
            </div>
            <p class="curso-description">${curso.descripcion || 'Sin descripción'}</p>
            <div class="curso-progress-section">
                <div class="progress-info">
                    <span>Progreso</span>
                    <span class="progress-percentage">${progresoPorcentaje}%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progresoPorcentaje}%"></div>
                    </div>
                </div>
            </div>
            <button class="btn-ver-curso" onclick="mostrarCursoDetalle(${curso.id})">
                Ver Curso
            </button>
        `;
        cursosListEl.appendChild(cursoCard);
    });
}

// Mostrar mensaje cuando no hay cursos
function mostrarMensajeSinCursos() {
    const cursosListEl = document.getElementById('cursos-list');
    if (cursosListEl) {
        cursosListEl.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <h3>No hay cursos disponibles</h3>
                <p>Por favor, verifica que el servidor esté corriendo.</p>
                <button class="btn btn-primary" onclick="location.reload()">Recargar</button>
            </div>
        `;
    }
}

// Mostrar mensaje de error
function mostrarMensajeError() {
    const cursosListEl = document.getElementById('cursos-list');
    if (cursosListEl) {
        cursosListEl.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #ffebee; border-radius: 8px;">
                <h3>Error de conexión</h3>
                <p>No se pudo conectar con el servidor.</p>
                <p><strong>Por favor:</strong></p>
                <ol style="text-align: left; display: inline-block;">
                    <li>Verifica que el servidor esté corriendo</li>
                    <li>Ejecuta: <code>cd backend && npm start</code></li>
                    <li>Recarga esta página</li>
                </ol>
                <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 20px;">Recargar Página</button>
            </div>
        `;
    }
}

// Cargar progreso de cursos
async function cargarProgresoCursos() {
    const token = getCurrentToken();
    if (!token) return;
    
    try {
        if (navigator.onLine && wsClient.isConnected) {
            wsClient.send({ type: 'GET_PROGRESS' });
        } else {
            // Cargar desde IndexedDB
            const progresos = await offlineStorage.getProgresosPendientes();
            await actualizarProgresoCursos(progresos);
        }
    } catch (error) {
        console.error('Error al cargar progreso:', error);
    }
}

// Actualizar progreso de cursos
async function actualizarProgresoCursos(progresosData = null) {
    const token = getCurrentToken();
    if (!token) return;
    
    // Prevenir múltiples actualizaciones simultáneas
    if (window.actualizandoProgreso) {
        console.log('⚠️ Actualización de progreso ya en curso, esperando...');
        return;
    }
    
    window.actualizandoProgreso = true;
    
    try {
        // Obtener total de contenidos para cada curso Y los progresos del backend en paralelo
        const promises = [];
        
        // Obtener contenidos de cada curso
        for (const curso of cursos) {
            promises.push(
                fetchApi(`/api/cursos/${curso.id}/contenidos`)
                .then(response => {
                    if (response.ok) {
                        return response.json().then(contenidos => {
                            curso.totalContenidos = contenidos.length;
                            console.log(`✅ Curso ${curso.id} (${curso.nombre}): ${contenidos.length} contenidos totales`);
                            return { cursoId: curso.id, contenidos };
                        });
                    }
                    return { cursoId: curso.id, contenidos: [] };
                })
                .catch(error => {
                    console.error(`Error al obtener contenidos del curso ${curso.id}:`, error);
                    return { cursoId: curso.id, contenidos: [] };
                })
            );
        }
        
        // Obtener progresos del backend para todos los cursos
        if (navigator.onLine && token) {
            for (const curso of cursos) {
                promises.push(
                    fetchApi(`/api/estudiante/cursos/${curso.id}/progreso`)
                    .then(response => {
                        if (response.ok) {
                            return response.json().then(progresos => {
                                console.log(`✅ Progresos del backend obtenidos para curso ${curso.id}: ${progresos.length} registros`);
                                return { cursoId: curso.id, progresos, source: 'backend' };
                            });
                        } else if (response.status === 404) {
                            console.warn(`⚠️ Endpoint de progreso no encontrado para curso ${curso.id} (404)`);
                            return { cursoId: curso.id, progresos: [], source: 'backend' };
                        }
                        return { cursoId: curso.id, progresos: [], source: 'backend' };
                    })
                    .catch(error => {
                        console.warn(`⚠️ Error al obtener progresos del backend para curso ${curso.id}:`, error);
                        return { cursoId: curso.id, progresos: [], source: 'backend' };
                    })
                );
            }
        }
        
        // Esperar a que todas las peticiones terminen
        const results = await Promise.all(promises);
        
        // Organizar progresos del backend por curso
        const progresosPorCurso = {};
        results.forEach(result => {
            if (result.source === 'backend' && result.progresos) {
                if (!progresosPorCurso[result.cursoId]) {
                    progresosPorCurso[result.cursoId] = [];
                }
                progresosPorCurso[result.cursoId].push(...result.progresos);
            }
        });
        
        // Si no hay progresosData, obtenerlos desde IndexedDB
        if (!progresosData) {
            progresosData = await offlineStorage.getProgresosPendientes();
        }
        
        // Combinar progresos de IndexedDB con los del backend
        // Los del backend tienen prioridad (son más actualizados)
        const progresosCombinados = [];
        
        // Primero agregar todos los progresos del backend (tienen prioridad)
        Object.keys(progresosPorCurso).forEach(cursoId => {
            const progresosBackend = progresosPorCurso[cursoId];
            progresosBackend.forEach(progBackend => {
                // Validar que el progreso tenga datos válidos
                const contenidoId = parseInt(progBackend.contenido_id);
                const cursoIdNum = parseInt(cursoId);
                if (!isNaN(contenidoId) && contenidoId > 0 && !isNaN(cursoIdNum) && cursoIdNum > 0) {
                    // Verificar si ya existe en la lista combinada
                    const existe = progresosCombinados.some(p => 
                        parseInt(p.curso_id) === cursoIdNum &&
                        parseInt(p.contenido_id) === contenidoId
                    );
                    if (!existe) {
                        progresosCombinados.push({
                            ...progBackend,
                            curso_id: cursoIdNum,
                            contenido_id: contenidoId
                        });
                    } else {
                        // Si existe, reemplazar con el del backend (más actualizado)
                        const index = progresosCombinados.findIndex(p => 
                            parseInt(p.curso_id) === cursoIdNum &&
                            parseInt(p.contenido_id) === contenidoId
                        );
                        if (index >= 0) {
                            progresosCombinados[index] = {
                                ...progBackend,
                                curso_id: cursoIdNum,
                                contenido_id: contenidoId
                            };
                        }
                    }
                }
            });
        });
        
        // Luego agregar progresos de IndexedDB que no estén en el backend
        if (progresosData && progresosData.length > 0) {
            progresosData.forEach(progIndexedDB => {
                const contenidoId = parseInt(progIndexedDB.contenido_id);
                const cursoId = parseInt(progIndexedDB.curso_id);
                if (!isNaN(contenidoId) && contenidoId > 0 && !isNaN(cursoId) && cursoId > 0) {
                    // Verificar si ya existe en la lista combinada (del backend)
                    const existe = progresosCombinados.some(p => 
                        parseInt(p.curso_id) === cursoId &&
                        parseInt(p.contenido_id) === contenidoId
                    );
                    if (!existe) {
                        progresosCombinados.push({
                            ...progIndexedDB,
                            curso_id: cursoId,
                            contenido_id: contenidoId
                        });
                    }
                }
            });
        }
        
        // Usar los progresos combinados
        progresosData = progresosCombinados;
        console.log(`✅ Progresos combinados: ${progresosData.length} registros (backend + IndexedDB)`);
        
        // DEBUG: Log para verificar datos
        console.log('Progresos obtenidos (antes de filtrar):', progresosData.length, 'registros');
        
        // Filtrar progresos con curso_id que no existe en los cursos del estudiante
        const cursoIdsValidos = new Set(cursos.map(c => c.id));
        const progresosFiltrados = progresosData.filter(prog => {
            if (!prog.curso_id || !prog.contenido_id) return false;
            const cursoId = parseInt(prog.curso_id);
            if (!cursoIdsValidos.has(cursoId)) {
                console.warn(`⚠️ Progreso con curso_id inválido filtrado: curso_id=${cursoId}, contenido_id=${prog.contenido_id}`);
                return false;
            }
            return true;
        });
        
        console.log('Progresos después de filtrar:', progresosFiltrados.length, 'registros');
        
        // Calcular progreso por curso usando el promedio de avances
        const progresoPorCurso = {};
        
        // Inicializar con 0 para todos los cursos
        for (const curso of cursos) {
            // Asegurarse de que totalContenidos sea un número válido
            const totalContenidos = parseInt(curso.totalContenidos) || 0;
            progresoPorCurso[curso.id] = {
                total: totalContenidos > 0 ? totalContenidos : 0, // Usar el total real del curso
                sumaAvances: 0,
                contenidosConProgreso: new Set() // Usar Set para evitar duplicados
            };
            console.log(`📊 Curso ${curso.id} (${curso.nombre}): totalContenidos = ${totalContenidos}`);
        }
        
        // Agrupar progresos por contenido_id (tomar el máximo avance por contenido)
        // Esto evita sumar múltiples veces el mismo contenido
        const progresoPorContenido = {}; // { curso_id: { contenido_id: maxAvance } }
        
        // Contar duplicados para debugging
        let duplicadosEncontrados = 0;
        const contenidoKeys = new Set();
        
        // Primero, agrupar todos los progresos por contenido único
        progresosFiltrados.forEach(prog => {
            if (!prog.curso_id || !prog.contenido_id) return;
            
            const cursoId = parseInt(prog.curso_id);
            const contenidoId = parseInt(prog.contenido_id);
            
            // Validar que los IDs sean números válidos
            if (isNaN(cursoId) || cursoId <= 0 || isNaN(contenidoId) || contenidoId <= 0) {
                console.warn('⚠️ Progreso ignorado: IDs inválidos', { curso_id: prog.curso_id, contenido_id: prog.contenido_id });
                return; // Saltar este progreso
            }
            
            const avance = Math.min(100, Math.max(0, parseFloat(prog.avance) || 0)); // Asegurar que esté entre 0-100
            
            const key = `${cursoId}-${contenidoId}`;
            if (contenidoKeys.has(key)) {
                duplicadosEncontrados++;
            } else {
                contenidoKeys.add(key);
            }
            
            if (!progresoPorContenido[cursoId]) {
                progresoPorContenido[cursoId] = {};
            }
            
            // Tomar el máximo avance para este contenido (por si hay múltiples registros)
            if (!progresoPorContenido[cursoId][contenidoId] || 
                avance > progresoPorContenido[cursoId][contenidoId]) {
                progresoPorContenido[cursoId][contenidoId] = avance;
            }
        });
        
        if (duplicadosEncontrados > 0) {
            console.warn(`Se encontraron ${duplicadosEncontrados} registros duplicados. Se usará el máximo avance por contenido.`);
        }
        
        // Sumar avances únicos por contenido para cada curso
        Object.keys(progresoPorContenido).forEach(cursoIdStr => {
            const cursoId = parseInt(cursoIdStr);
            if (isNaN(cursoId) || cursoId <= 0) {
                console.warn(`⚠️ Curso ignorado: ID inválido: ${cursoIdStr}`);
                return; // Saltar este curso
            }
            
            if (progresoPorCurso[cursoId]) {
                const avancesPorContenido = progresoPorContenido[cursoId];
                
                // Filtrar solo contenidos con IDs válidos
                const contenidosValidos = Object.entries(avancesPorContenido).filter(([contenidoId, avance]) => {
                    const id = parseInt(contenidoId);
                    const avanceNum = parseFloat(avance);
                    // Solo incluir si el ID es válido y el avance es un número válido
                    if (isNaN(id) || id <= 0 || isNaN(avanceNum) || avanceNum < 0) {
                        console.warn(`⚠️ Avance ignorado para cálculo: contenido_id=${contenidoId}, avance=${avance}`);
                        return false;
                    }
                    return true;
                });
                
                const numContenidos = contenidosValidos.length;
                
                // Sumar solo los avances válidos
                contenidosValidos.forEach(([contenidoId, avance]) => {
                    progresoPorCurso[cursoId].sumaAvances += parseFloat(avance);
                });
                
                // El total de contenidos debe ser el número real de contenidos del curso (ya establecido)
                // NO cambiar el total basado en el número de contenidos con progreso
                // Si el total es 0, significa que no se pudo obtener del backend, pero no debemos usar numContenidos
                // porque eso excluiría contenidos sin progreso del cálculo
                
                console.log(`Curso ${cursoId}: ${numContenidos} contenidos con progreso válido, suma de avances: ${progresoPorCurso[cursoId].sumaAvances}, total contenidos del curso: ${progresoPorCurso[cursoId].total}`);
            }
        });
        
        // Calcular progreso promedio para cada curso
        // El progreso del curso = (suma de avances únicos de todos los contenidos) / (total de contenidos)
        cursos.forEach(curso => {
            const prog = progresoPorCurso[curso.id];
            
            // Si no se pudo obtener el total de contenidos, intentar obtenerlo nuevamente
            if (!prog || prog.total === 0) {
                console.warn(`⚠️ Curso "${curso.nombre}": No se pudo obtener el total de contenidos o no hay datos de progreso`);
                
                // Intentar obtener el total de contenidos directamente
                if (!curso.totalContenidos || curso.totalContenidos === 0) {
                    curso.progreso = 0;
                    console.warn(`⚠️ Curso "${curso.nombre}": totalContenidos no disponible, progreso = 0%`);
                } else {
                    // Si tenemos el total pero no hay progresos, el progreso es 0%
                    curso.progreso = 0;
                    console.log(`✅ Curso "${curso.nombre}": ${curso.totalContenidos} contenidos, pero sin progresos, progreso = 0%`);
                }
                return;
            }
            
            // Verificar que el total sea correcto
            if (prog.total <= 0) {
                console.warn(`⚠️ Curso "${curso.nombre}": total de contenidos inválido (${prog.total}), usando totalContenidos del curso`);
                if (curso.totalContenidos && curso.totalContenidos > 0) {
                    prog.total = curso.totalContenidos;
                } else {
                    curso.progreso = 0;
                    return;
                }
            }
            
            // Calcular promedio: suma de avances / total de contenidos
            // IMPORTANTE: Si un contenido no tiene progreso, cuenta como 0%
            // La suma de avances solo incluye contenidos con progreso, pero el total incluye TODOS los contenidos
            const promedio = prog.total > 0 ? (prog.sumaAvances / prog.total) : 0;
            
            // Asegurar que no exceda 100% (por seguridad)
            curso.progreso = Math.min(100, Math.max(0, Math.round(promedio)));
            
            // Log detallado para debugging
            console.log(`✅ Curso "${curso.nombre}": Progreso calculado = ${curso.progreso}%`);
            console.log(`   - Suma de avances: ${prog.sumaAvances}%`);
            console.log(`   - Total de contenidos: ${prog.total}`);
            console.log(`   - Promedio: ${promedio.toFixed(2)}%`);
            console.log(`   - Contenidos con progreso: ${Object.keys(progresoPorContenido[curso.id] || {}).length} de ${prog.total}`);
            
            // Si hay una discrepancia, advertir
            if (Object.keys(progresoPorContenido[curso.id] || {}).length < prog.total) {
                const contenidosSinProgreso = prog.total - Object.keys(progresoPorContenido[curso.id] || {}).length;
                console.warn(`   ⚠️ ${contenidosSinProgreso} contenido(s) sin progreso (cuentan como 0%)`);
            }
        });
        
        // Actualizar UI solo si no estamos en medio de cerrar un modal
        // Prevenir que se recargue la vista mientras se cierra el modal
        if (window.modalCerrandose) {
            console.log('⚠️ Actualización de UI pospuesta porque el modal se está cerrando');
            // Reintentar después de un breve delay
            setTimeout(() => {
                if (!window.modalCerrandose && typeof mostrarCursos === 'function') {
                    mostrarCursos();
                }
                // También actualizar dashboard después del delay
                setTimeout(() => {
                    const dashboardEl = document.getElementById('student-dashboard');
                    if (dashboardEl && !dashboardEl.classList.contains('hidden')) {
                        if (typeof cargarDashboard === 'function') {
                            cargarDashboard();
                        }
                    }
                }, 500);
            }, 1000);
            return;
        }
        
        cursos.forEach(curso => {
            const cursoCard = document.querySelector(`[data-curso-id="${curso.id}"]`);
            if (cursoCard) {
                const progressFill = cursoCard.querySelector('.progress-fill');
                const progressPercentage = cursoCard.querySelector('.progress-percentage');
                if (progressFill) {
                    progressFill.style.width = `${curso.progreso || 0}%`;
                }
                if (progressPercentage) {
                    progressPercentage.textContent = `${curso.progreso || 0}%`;
                }
            }
        });
        
        // Actualizar también el progreso en la vista de detalle del curso
        const cursoDetalleEl = document.getElementById('curso-detalle');
        if (cursoDetalleEl && !cursoDetalleEl.classList.contains('hidden')) {
            // Recargar el detalle del curso para mostrar progreso actualizado
            const cursoActual = cursos.find(c => {
                const cursoNombreEl = document.getElementById('curso-nombre');
                return cursoNombreEl && cursoNombreEl.textContent === c.nombre;
            });
            if (cursoActual) {
                await mostrarCursoDetalle(cursoActual.id);
            }
        }
        
        // Actualizar el dashboard si está visible
        const dashboardEl = document.getElementById('student-dashboard');
        if (dashboardEl && !dashboardEl.classList.contains('hidden')) {
            console.log('🔄 Actualizando dashboard después de actualizar progreso...');
            if (typeof cargarDashboard === 'function') {
                // Marcar que el dashboard viene de una actualización automática
                // para evitar que vuelva a llamar a actualizarProgresoCursos
                window.dashboardDesdeActualizacion = true;
                // Usar setTimeout para no bloquear la actualización de cursos
                setTimeout(async () => {
                    try {
                        await cargarDashboard();
                    } finally {
                        // Limpiar el flag después de un momento
                        setTimeout(() => {
                            window.dashboardDesdeActualizacion = false;
                        }, 500);
                    }
                }, 100);
            }
        }
    } catch (error) {
        console.error('Error al actualizar progreso de cursos:', error);
    } finally {
        // Liberar el flag de actualización
        window.actualizandoProgreso = false;
    }
}

// Volver a cursos
function volverACursos() {
    const cursoDetalleEl = document.getElementById('curso-detalle');
    const cursosViewEl = document.getElementById('cursos-view');
    
    if (cursoDetalleEl) cursoDetalleEl.classList.add('hidden');
    if (cursosViewEl) cursosViewEl.classList.remove('hidden');
}

// Filtrar cursos por búsqueda
function filtrarCursos() {
    const searchInput = document.getElementById('search-cursos');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const cursoCards = document.querySelectorAll('.curso-card');
    
    cursoCards.forEach(card => {
        const nombre = card.querySelector('h3')?.textContent.toLowerCase() || '';
        const descripcion = card.querySelector('.curso-description')?.textContent.toLowerCase() || '';
        
        if (nombre.includes(searchTerm) || descripcion.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Mostrar detalle de un curso
async function mostrarCursoDetalle(cursoIdOrObject) {
    const cursoId = typeof cursoIdOrObject === 'object' ? cursoIdOrObject.id : cursoIdOrObject;
    const curso = cursos.find(c => c.id === parseInt(cursoId));
    
    if (!curso) {
        mostrarNotificacion('Curso no encontrado', 'error');
        return;
    }
    
    const cursoDetalleEl = document.getElementById('curso-detalle');
    const cursosViewEl = document.getElementById('cursos-view');
    const contenidosListEl = document.getElementById('contenidos-list');
    const cursoNombreEl = document.getElementById('curso-nombre');
    
    if (cursoDetalleEl) cursoDetalleEl.classList.remove('hidden');
    if (cursosViewEl) cursosViewEl.classList.add('hidden');
    if (cursoNombreEl) cursoNombreEl.textContent = curso.nombre;
    
    if (!contenidosListEl) return;
    
    contenidosListEl.innerHTML = '<p>Cargando contenidos...</p>';
    
    try {
        const token = getCurrentToken();
        const response = await fetchApi(`/api/cursos/${cursoId}/contenidos`);
        
        if (response.ok) {
            contenidosActuales = await response.json();
            // Asegurar que cada contenido tenga el curso_id correcto
            contenidosActuales = contenidosActuales.map(contenido => ({
                ...contenido,
                curso_id: contenido.curso_id || cursoId // Asegurar curso_id
            }));
            contenidosActuales.sort((a, b) => (a.orden || 0) - (b.orden || 0));
            
            console.log(`Contenidos cargados para curso ${cursoId}:`, contenidosActuales.length, contenidosActuales.map(c => ({ id: c.id, nombre: c.nombre, curso_id: c.curso_id })));
            
            contenidosListEl.innerHTML = '';
            
            if (contenidosActuales.length === 0) {
                contenidosListEl.innerHTML = '<p>Este curso no tiene contenidos aún.</p>';
                return;
            }
            
            // Obtener progresos del estudiante para este curso
            const token = getCurrentToken();
            const user = getCurrentUser();
            let progresosContenido = {};
            
            try {
                // Primero obtener desde IndexedDB (offline)
                const progresos = await offlineStorage.getProgresosPendientes();
                const progresosCurso = progresos.filter(p => 
                    parseInt(p.curso_id) === parseInt(cursoId) && 
                    parseInt(p.usuario_id) === parseInt(user.id)
                );
                
                progresosCurso.forEach(prog => {
                    // Validar que contenido_id sea un número válido
                    const contenidoId = parseInt(prog.contenido_id);
                    if (isNaN(contenidoId) || contenidoId <= 0) {
                        console.warn('⚠️ Progreso ignorado: contenido_id inválido:', prog.contenido_id);
                        return; // Saltar este progreso
                    }
                    progresosContenido[contenidoId] = {
                        contenido_id: contenidoId,
                        avance: parseFloat(prog.avance) || 0,
                        completado: prog.completado || false
                    };
                });
                
                        // También obtener desde el backend (online) y combinar
                        if (navigator.onLine && token) {
                            try {
                                const progresosResponse = await fetchApi(`/api/estudiante/cursos/${cursoId}/progreso`);
                                if (progresosResponse.ok) {
                                    const progresosBackend = await progresosResponse.json();
                                    console.log('✅ Progresos del backend recibidos:', progresosBackend.length, 'registros');
                                    
                                    // Obtener IDs de contenidos válidos del curso actual
                                    const contenidosIdsValidos = new Set(contenidosActuales.map(c => parseInt(c.id)).filter(id => !isNaN(id) && id > 0));
                                    
                                    progresosBackend.forEach(prog => {
                                        // Validar que contenido_id sea un número válido
                                        const contenidoId = parseInt(prog.contenido_id);
                                        if (isNaN(contenidoId) || contenidoId <= 0) {
                                            console.warn('⚠️ Progreso del backend ignorado: contenido_id inválido:', prog.contenido_id);
                                            return; // Saltar este progreso
                                        }
                                        
                                        // Validar que el contenido pertenezca al curso actual
                                        if (!contenidosIdsValidos.has(contenidoId)) {
                                            console.warn(`⚠️ Progreso del backend ignorado: contenido ${contenidoId} no pertenece al curso ${cursoId}`);
                                            return; // Saltar este progreso
                                        }
                                        
                                        const avanceBackend = parseFloat(prog.avance) || 0;
                                        const completadoBackend = prog.completado || false;
                                        // Combinar con los de IndexedDB, tomando el mayor avance
                                        if (!progresosContenido[contenidoId] || 
                                            avanceBackend > (parseFloat(progresosContenido[contenidoId].avance) || 0)) {
                                            progresosContenido[contenidoId] = {
                                                contenido_id: contenidoId,
                                                avance: avanceBackend,
                                                completado: completadoBackend
                                            };
                                            console.log(`✅ Progreso del backend para contenido ${contenidoId}: ${avanceBackend}%, completado: ${completadoBackend}`);
                                        }
                                    });
                                    
                                    // Filtrar solo los contenidos válidos
                                    const progresosValidos = Object.keys(progresosContenido)
                                        .filter(key => {
                                            const id = parseInt(key);
                                            return !isNaN(id) && id > 0 && contenidosIdsValidos.has(id);
                                        })
                                        .length;
                                    console.log('✅ Progresos del backend cargados para curso:', cursoId, progresosValidos, 'contenidos válidos');
                                } else if (progresosResponse.status === 404) {
                                    console.warn('⚠️ Endpoint de progreso no encontrado (404). El servidor puede necesitar reiniciarse.');
                                } else {
                                    console.warn('⚠️ Error al obtener progresos del backend:', progresosResponse.status, progresosResponse.statusText);
                                }
                            } catch (error) {
                                console.warn('⚠️ Error al obtener progresos del backend:', error);
                            }
                        }
            } catch (error) {
                console.error('❌ Error al cargar progresos:', error);
            }
            
            for (const contenido of contenidosActuales) {
                // Validar que el contenido tenga un ID válido
                const contenidoId = parseInt(contenido.id);
                if (isNaN(contenidoId) || contenidoId <= 0) {
                    console.warn('⚠️ Contenido ignorado: ID inválido:', contenido.id);
                    continue; // Saltar este contenido
                }
                
                const yaDescargado = await offlineStorage.isContenidoDescargado(contenidoId);
                const progreso = progresosContenido[contenidoId];
                const avance = progreso ? Math.round(parseFloat(progreso.avance) || 0) : 0;
                const completado = progreso ? (progreso.completado || false) : false;
                
                console.log(`📊 Progreso para contenido ${contenido.id} (${contenido.nombre}):`, {
                    avance,
                    completado,
                    tipo: contenido.tipo
                });
                
                const contenidoItem = document.createElement('div');
                contenidoItem.className = 'contenido-item';
                contenidoItem.dataset.contenidoId = contenido.id;
                contenidoItem.innerHTML = `
                    <div class="contenido-header">
                        <h4>${contenido.nombre || 'Sin nombre'}</h4>
                        <span class="badge">${contenido.tipo.toUpperCase()}</span>
                    </div>
                    <div class="contenido-progress" style="margin: 12px 0;">
                        <div class="progress-info" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 13px; color: var(--medium-gray);">Progreso ${completado ? '✓ Completado' : 'automático'}</span>
                            <span class="progress-percentage" style="font-weight: 600; color: ${completado ? 'var(--success-color)' : 'var(--primary-color)'};">
                                ${Math.round(avance)}%
                                ${completado ? ' ✓' : ''}
                            </span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="height: 8px; background: var(--lighter-gray); border-radius: 4px; overflow: hidden;">
                                <div class="progress-fill" style="width: ${Math.round(avance)}%; height: 100%; background: ${completado ? 'var(--success-color)' : 'var(--primary-gradient)'}; border-radius: 4px; transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                        ${completado ? '' : `
                        <p style="font-size: 11px; color: var(--medium-gray); margin-top: 8px; font-style: italic;">
                            💡 El progreso se actualiza automáticamente al visualizar el contenido
                        </p>
                        `}
                    </div>
                    <div class="contenido-actions">
                        <button class="btn btn-primary" onclick="verContenido(${contenido.id}, '${contenido.tipo}', ${cursoId})">
                            Ver
                        </button>
                        ${yaDescargado ? 
                            `<button class="btn btn-secondary" onclick="eliminarDescarga(${contenido.id})">Eliminar Descarga</button>` :
                            contenido.url_local ? 
                                `<button class="btn btn-secondary" onclick="descargarContenido(${contenido.id}, ${cursoId})">Descargar</button>` :
                                ''
                        }
                    </div>
                `;
                contenidosListEl.appendChild(contenidoItem);
            }
        } else {
            contenidosListEl.innerHTML = '<p>Error al cargar contenidos del curso.</p>';
        }
    } catch (error) {
        console.error('Error al cargar contenidos:', error);
        contenidosListEl.innerHTML = '<p>Error al cargar contenidos del curso.</p>';
    }
}

// Mostrar explorar tutores
async function mostrarExplorarTutores() {
    const cursosView = document.getElementById('cursos-view');
    const tutorCursosView = document.getElementById('student-tutor-cursos-view');
    const cursoDetalle = document.getElementById('curso-detalle');
    const tutoresView = document.getElementById('tutores-view');
    
    if (cursosView) cursosView.classList.add('hidden');
    if (tutorCursosView) tutorCursosView.classList.add('hidden');
    if (cursoDetalle) cursoDetalle.classList.add('hidden');
    if (tutoresView) tutoresView.classList.remove('hidden');
    
    await cargarTutores();
}

// Cargar tutores disponibles
async function cargarTutores() {
    try {
        const token = getCurrentToken();
        if (!token) {
            console.error('No hay token disponible para cargar tutores');
            mostrarNotificacion('No hay sesión activa. Por favor, inicia sesión nuevamente.', 'error');
            return;
        }
        
        console.log('Cargando tutores...');
        const response = await fetchApi('/api/estudiante/tutores');
        
        console.log('Respuesta de tutores:', response.status, response.statusText);
        
        if (!response.ok) {
            let errorMessage = 'Error al cargar tutores';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
                console.error('Error del servidor:', errorData);
            } catch (e) {
                console.error('Error al parsear respuesta de error:', e);
            }
            
            if (response.status === 401) {
                errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
                await handleLogout();
            } else if (response.status === 403) {
                errorMessage = 'No tienes permiso para ver tutores. Solo los estudiantes pueden ver tutores.';
            } else if (response.status === 500) {
                errorMessage = 'Error del servidor al cargar tutores. Verifica que el servidor esté funcionando correctamente.';
            }
            
            console.error('Error al cargar tutores:', response.status, errorMessage);
            mostrarNotificacion(errorMessage, 'error');
            
            const tutoresListEl = document.getElementById('tutores-list');
            if (tutoresListEl) {
                tutoresListEl.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #ffebee; border-radius: 8px;">
                        <h3>Error al cargar tutores</h3>
                        <p>${errorMessage}</p>
                        <button class="btn btn-primary" onclick="cargarTutores()" style="margin-top: 15px;">Reintentar</button>
                    </div>
                `;
            }
            return;
        }
        
        const tutores = await response.json();
        console.log('Tutores recibidos:', tutores);
        
        if (!Array.isArray(tutores)) {
            console.error('Respuesta inválida: se esperaba un array de tutores');
            mostrarNotificacion('Error: respuesta inválida del servidor', 'error');
            return;
        }
        
        mostrarTutores(tutores);
    } catch (error) {
        console.error('Error al cargar tutores:', error);
        const errorMessage = error.message || 'Error de conexión. Verifica que el servidor esté ejecutándose.';
        mostrarNotificacion(`Error al cargar tutores: ${errorMessage}`, 'error');
        
        const tutoresListEl = document.getElementById('tutores-list');
        if (tutoresListEl) {
            tutoresListEl.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #ffebee; border-radius: 8px;">
                    <h3>Error de conexión</h3>
                    <p>${errorMessage}</p>
                    <p style="margin-top: 15px;"><strong>Por favor:</strong></p>
                    <ol style="text-align: left; display: inline-block; margin-top: 10px;">
                        <li>Verifica que el servidor esté corriendo</li>
                        <li>Verifica tu conexión a Internet</li>
                        <li>Recarga la página</li>
                    </ol>
                    <button class="btn btn-primary" onclick="cargarTutores()" style="margin-top: 15px;">Reintentar</button>
                </div>
            `;
        }
    }
}

// Mostrar lista de tutores
function mostrarTutores(tutores) {
    const tutoresListEl = document.getElementById('tutores-list');
    if (!tutoresListEl) {
        console.error('Elemento tutores-list no encontrado en el DOM');
        mostrarNotificacion('Error: No se encontró el elemento para mostrar tutores', 'error');
        return;
    }
    
    tutoresListEl.innerHTML = '';
    
    if (!Array.isArray(tutores)) {
        console.error('mostrarTutores recibió un valor que no es un array:', tutores);
        tutoresListEl.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #ffebee; border-radius: 8px;">
                <h3>Error</h3>
                <p>Respuesta inválida del servidor</p>
                <button class="btn btn-primary" onclick="cargarTutores()" style="margin-top: 15px;">Reintentar</button>
            </div>
        `;
        return;
    }
    
    if (tutores.length === 0) {
        tutoresListEl.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <h3>No hay tutores disponibles</h3>
                <p>No hay tutores con cursos disponibles en este momento.</p>
                <p style="margin-top: 15px; font-size: 14px; color: #666;">
                    Los tutores aparecerán aquí cuando creen cursos y estén disponibles para estudiantes.
                </p>
            </div>
        `;
        return;
    }
    
    console.log(`Mostrando ${tutores.length} tutores`);
    
    tutores.forEach(tutor => {
        const tutorNombre = (tutor.nombre || tutor.matricula || 'Sin nombre').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;');
        const tutorEmail = tutor.email ? tutor.email.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;') : '';
        const tutorMatricula = tutor.matricula.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;');
        const tutorId = parseInt(tutor.id);
        
        if (isNaN(tutorId)) {
            console.error('ID de tutor inválido:', tutor.id);
            return;
        }
        
        const tutorCard = document.createElement('div');
        tutorCard.className = 'curso-card';
        tutorCard.dataset.tutorId = tutorId;
        tutorCard.innerHTML = `
            <div class="curso-card-header">
                <h3>${tutorNombre}</h3>
                <span class="curso-badge">Tutor</span>
            </div>
            <p class="curso-description">
                ${tutorEmail ? `Email: ${tutorEmail}<br>` : ''}
                Matrícula: ${tutorMatricula}
            </p>
            <div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                <strong>Cursos disponibles:</strong> ${tutor.cursos_disponibles || 0} de ${tutor.total_cursos || 0}
            </div>
            <button class="btn-ver-curso" onclick="verCursosDeTutor(${tutorId}, '${tutorNombre.replace(/'/g, "\\'")}')" style="margin-top: 15px;">
                Ver Cursos de este Tutor
            </button>
        `;
        tutoresListEl.appendChild(tutorCard);
    });
    
    console.log('Tutores mostrados correctamente');
}

// Ver cursos de un tutor específico
async function verCursosDeTutor(tutorId, tutorNombre) {
    try {
        const token = getCurrentToken();
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const tutoresView = document.getElementById('tutores-view');
        const tutorCursosView = document.getElementById('student-tutor-cursos-view');
        const tutorCursosTitulo = document.getElementById('student-tutor-cursos-titulo');
        const tutorCursosList = document.getElementById('student-tutor-cursos-list');
        
        if (tutoresView) tutoresView.classList.add('hidden');
        if (tutorCursosView) tutorCursosView.classList.remove('hidden');
        if (tutorCursosTitulo) tutorCursosTitulo.textContent = `Cursos de ${tutorNombre}`;
        
        if (!tutorCursosList) return;
        tutorCursosList.innerHTML = '<p>Cargando cursos...</p>';
        
        const response = await fetchApi('/api/estudiante/tutores');
        
        if (response.ok) {
            const tutores = await response.json();
            const tutor = tutores.find(t => t.id === tutorId);
            if (tutor && tutor.cursos) {
                mostrarCursosDeTutor(tutor.cursos, tutorNombre);
            } else {
                tutorCursosList.innerHTML = '<p>No se encontraron cursos para este tutor.</p>';
            }
        } else {
            tutorCursosList.innerHTML = '<p>Error al cargar cursos del tutor.</p>';
        }
    } catch (error) {
        console.error('Error al cargar cursos del tutor:', error);
        mostrarNotificacion('Error al cargar cursos del tutor', 'error');
    }
}

// Mostrar cursos de un tutor
function mostrarCursosDeTutor(cursosTutor, tutorNombre) {
    const tutorCursosList = document.getElementById('student-tutor-cursos-list');
    if (!tutorCursosList) return;
    
    tutorCursosList.innerHTML = '';
    
    if (cursosTutor.length === 0) {
        tutorCursosList.innerHTML = '<p>Este tutor no tiene cursos disponibles.</p>';
        return;
    }
    
    cursosTutor.forEach(curso => {
        const cursoCard = document.createElement('div');
        cursoCard.className = 'curso-card';
        cursoCard.innerHTML = `
            <div class="curso-card-header">
                <h3>${curso.nombre || 'Sin nombre'}</h3>
                <span class="curso-badge">${curso.ya_inscrito ? 'Inscrito' : 'Disponible'}</span>
            </div>
            <p class="curso-description">${curso.descripcion || 'Sin descripción'}</p>
            ${!curso.ya_inscrito ? 
                `<button class="btn-ver-curso" onclick="inscribirseACurso(${curso.id})">
                    Inscribirse
                </button>` :
                '<p style="color: #4caf50; margin-top: 10px;">Ya estás inscrito en este curso</p>'
            }
        `;
        tutorCursosList.appendChild(cursoCard);
    });
}

// Volver a tutores
function volverATutores() {
    const tutoresView = document.getElementById('tutores-view');
    const tutorCursosView = document.getElementById('student-tutor-cursos-view');
    
    if (tutoresView) tutoresView.classList.remove('hidden');
    if (tutorCursosView) tutorCursosView.classList.add('hidden');
}

// Volver a mis cursos
function volverAMisCursos() {
    const cursosView = document.getElementById('cursos-view');
    const tutoresView = document.getElementById('tutores-view');
    const tutorCursosView = document.getElementById('student-tutor-cursos-view');
    
    if (cursosView) cursosView.classList.remove('hidden');
    if (tutoresView) tutoresView.classList.add('hidden');
    if (tutorCursosView) tutorCursosView.classList.add('hidden');
}

// Filtrar tutores
function filtrarTutores() {
    const searchInput = document.getElementById('search-tutores');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const tutorCards = document.querySelectorAll('[data-tutor-id]');
    
    tutorCards.forEach(card => {
        const nombre = card.querySelector('h3')?.textContent.toLowerCase() || '';
        const matricula = card.querySelector('.curso-description')?.textContent.toLowerCase() || '';
        
        if (nombre.includes(searchTerm) || matricula.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Mostrar cursos disponibles
async function mostrarCursosDisponibles() {
    try {
        const token = getCurrentToken();
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const response = await fetchApi('/api/estudiante/cursos-disponibles');
        
        if (response.ok) {
            const cursosDisponibles = await response.json();
            mostrarCursosDisponiblesList(cursosDisponibles);
        } else {
            mostrarNotificacion('Error al cargar cursos disponibles', 'error');
        }
    } catch (error) {
        console.error('Error al cargar cursos disponibles:', error);
        mostrarNotificacion('Error al cargar cursos disponibles', 'error');
    }
}

// Mostrar lista de cursos disponibles
function mostrarCursosDisponiblesList(cursosDisponibles) {
    const cursosView = document.getElementById('cursos-view');
    const tutoresView = document.getElementById('tutores-view');
    const tutorCursosView = document.getElementById('student-tutor-cursos-view');
    const cursosList = document.getElementById('cursos-list');
    
    if (cursosView) cursosView.classList.remove('hidden');
    if (tutoresView) tutoresView.classList.add('hidden');
    if (tutorCursosView) tutorCursosView.classList.add('hidden');
    
    if (!cursosList) return;
    
    cursosList.innerHTML = '';
    
    if (cursosDisponibles.length === 0) {
        cursosList.innerHTML = '<p>No hay cursos disponibles para inscribirse.</p>';
        return;
    }
    
    cursosDisponibles.forEach(curso => {
        const cursoCard = document.createElement('div');
        cursoCard.className = 'curso-card';
        cursoCard.innerHTML = `
            <div class="curso-card-header">
                <h3>${curso.nombre || 'Sin nombre'}</h3>
                <span class="curso-badge">${curso.tutor_nombre || 'Sin tutor'}</span>
            </div>
            <p class="curso-description">${curso.descripcion || 'Sin descripción'}</p>
            <button class="btn-ver-curso" onclick="inscribirseACurso(${curso.id})">
                Inscribirse
            </button>
        `;
        cursosList.appendChild(cursoCard);
    });
}

// Inscribirse a un curso
async function inscribirseACurso(cursoId) {
    try {
        const token = getCurrentToken();
        if (!token) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        const response = await fetchApi(`/api/estudiante/cursos/${cursoId}/inscribirse`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const data = await response.json();
            mostrarNotificacion('Inscripción exitosa', 'success');
            await cargarCursos();
            
            // Volver a la vista de cursos si estamos en tutores
            const tutoresView = document.getElementById('tutores-view');
            const tutorCursosView = document.getElementById('student-tutor-cursos-view');
            if (tutoresView && !tutoresView.classList.contains('hidden')) {
                volverAMisCursos();
            } else if (tutorCursosView && !tutorCursosView.classList.contains('hidden')) {
                volverAMisCursos();
            }
        } else {
            const error = await response.json();
            mostrarNotificacion(error.error || 'Error al inscribirse', 'error');
        }
    } catch (error) {
        console.error('Error al inscribirse:', error);
        mostrarNotificacion('Error al inscribirse al curso', 'error');
    }
}

// Actualizar progreso desde el slider
function actualizarProgresoSlider(slider, contenidoId, cursoId) {
    const value = parseInt(slider.value);
    const progressNumber = slider.parentElement.querySelector('.progress-number');
    const progressFill = slider.closest('.contenido-item').querySelector('.progress-fill');
    const progressPercentage = slider.closest('.contenido-item').querySelector('.progress-percentage');
    
    if (progressNumber) {
        progressNumber.value = value;
    }
    if (progressFill) {
        progressFill.style.width = `${value}%`;
    }
    if (progressPercentage) {
        progressPercentage.textContent = `${value}%`;
    }
}

// Actualizar progreso desde el input numérico
function actualizarProgresoInput(input, contenidoId, cursoId) {
    let value = parseInt(input.value);
    
    // Validar rango
    if (value < 0) value = 0;
    if (value > 100) value = 100;
    
    input.value = value;
    
    const slider = input.parentElement.querySelector('.progress-slider');
    const progressFill = input.closest('.contenido-item').querySelector('.progress-fill');
    const progressPercentage = input.closest('.contenido-item').querySelector('.progress-percentage');
    
    if (slider) {
        slider.value = value;
    }
    if (progressFill) {
        progressFill.style.width = `${value}%`;
    }
    if (progressPercentage) {
        progressPercentage.textContent = `${value}%`;
    }
}

// Guardar progreso manualmente
async function guardarProgresoManual(contenidoId, cursoId) {
    try {
        const contenidoItem = document.querySelector(`[data-contenido-id="${contenidoId}"]`);
        if (!contenidoItem) {
            mostrarNotificacion('Error: No se encontró el contenido', 'error');
            return;
        }
        
        const slider = contenidoItem.querySelector('.progress-slider');
        const progressNumber = contenidoItem.querySelector('.progress-number');
        const avance = parseInt(slider?.value || progressNumber?.value || 0);
        const completado = avance >= 100;
        
        const user = getCurrentUser();
        if (!user) {
            mostrarNotificacion('No hay sesión activa', 'error');
            return;
        }
        
        // Guardar en IndexedDB
        await offlineStorage.saveProgresoPendiente({
            usuario_id: user.id,
            curso_id: cursoId,
            contenido_id: contenidoId,
            avance: avance,
            completado: completado
        });
        
        // Enviar por WebSocket si está conectado
        if (navigator.onLine && wsClient.isConnected) {
            wsClient.send({
                type: 'SAVE_PROGRESS',
                curso_id: cursoId,
                contenido_id: contenidoId,
                avance: avance,
                completado: completado
            });
        }
        
        mostrarNotificacion(`Progreso guardado: ${avance}%`, 'success');
        
        // Actualizar progreso del curso
        if (typeof actualizarProgresoCursos === 'function') {
            setTimeout(async () => {
                await actualizarProgresoCursos();
            }, 500);
        }
    } catch (error) {
        console.error('Error al guardar progreso:', error);
        mostrarNotificacion('Error al guardar progreso', 'error');
    }
}

// Marcar como completado/incompleto
async function marcarCompletado(contenidoId, cursoId) {
    try {
        const contenidoItem = document.querySelector(`[data-contenido-id="${contenidoId}"]`);
        if (!contenidoItem) {
            mostrarNotificacion('Error: No se encontró el contenido', 'error');
            return;
        }
        
        const slider = contenidoItem.querySelector('.progress-slider');
        const progressNumber = contenidoItem.querySelector('.progress-number');
        const btnCompletado = contenidoItem.querySelector('[onclick*="marcarCompletado"]');
        
        // Obtener el estado actual
        const avanceActual = parseInt(slider?.value || progressNumber?.value || 0);
        const nuevoAvance = avanceActual >= 100 ? 0 : 100;
        const completado = nuevoAvance >= 100;
        
        // Actualizar UI
        if (slider) slider.value = nuevoAvance;
        if (progressNumber) progressNumber.value = nuevoAvance;
        
        const progressFill = contenidoItem.querySelector('.progress-fill');
        const progressPercentage = contenidoItem.querySelector('.progress-percentage');
        if (progressFill) progressFill.style.width = `${nuevoAvance}%`;
        if (progressPercentage) progressPercentage.textContent = `${nuevoAvance}%`;
        if (btnCompletado) {
            btnCompletado.textContent = completado ? 'Marcar Incompleto' : 'Marcar Completado';
        }
        
        // Guardar progreso
        await guardarProgresoManual(contenidoId, cursoId);
    } catch (error) {
        console.error('Error al marcar como completado:', error);
        mostrarNotificacion('Error al actualizar estado', 'error');
    }
}

// Exportar funciones
window.mostrarVistaEstudiante = mostrarVistaEstudiante;
window.cargarCursos = cargarCursos;
window.mostrarCursos = mostrarCursos;
window.mostrarCursoDetalle = mostrarCursoDetalle;
window.volverACursos = volverACursos;
window.filtrarCursos = filtrarCursos;
window.cargarProgresoCursos = cargarProgresoCursos;
window.actualizarProgresoCursos = actualizarProgresoCursos;
window.mostrarExplorarTutores = mostrarExplorarTutores;
window.cargarTutores = cargarTutores;
window.mostrarTutores = mostrarTutores;
window.verCursosDeTutor = verCursosDeTutor;
window.mostrarCursosDeTutor = mostrarCursosDeTutor;
window.volverATutores = volverATutores;
window.volverAMisCursos = volverAMisCursos;
window.filtrarTutores = filtrarTutores;
window.mostrarCursosDisponibles = mostrarCursosDisponibles;
window.inscribirseACurso = inscribirseACurso;
window.actualizarProgresoSlider = actualizarProgresoSlider;
window.actualizarProgresoInput = actualizarProgresoInput;
window.guardarProgresoManual = guardarProgresoManual;
window.marcarCompletado = marcarCompletado;

