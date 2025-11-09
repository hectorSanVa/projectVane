// Funciones del dashboard del estudiante

// Cargar dashboard
async function cargarDashboard() {
    const statsEl = document.getElementById('dashboard-stats');
    const cursosProgressEl = document.getElementById('dashboard-cursos-progress');
    const calificacionesEl = document.getElementById('calificaciones-list');
    
    if (!statsEl || !cursosProgressEl) return;
    
    try {
        const user = getCurrentUser();
        if (!user || user.rol !== 'estudiante') return;
        
        console.log('🔄 Cargando dashboard...');
        
        // Asegurar que el progreso esté actualizado ANTES de cargar el dashboard
        // Solo si no se está actualizando actualmente y no viene de una actualización automática
        if (typeof actualizarProgresoCursos === 'function' && !window.actualizandoProgreso && !window.dashboardDesdeActualizacion) {
            window.actualizandoProgreso = true;
            try {
                // Marcar que el dashboard está siendo cargado desde actualización
                window.dashboardDesdeActualizacion = true;
                await actualizarProgresoCursos();
            } finally {
                window.actualizandoProgreso = false;
                window.dashboardDesdeActualizacion = false;
            }
        }
        
        // Cargar estadísticas (usa los datos ya actualizados)
        await cargarEstadisticas(statsEl);
        
        // Cargar progreso de cursos (usa los datos ya actualizados)
        await cargarProgresoCursosDashboard(cursosProgressEl);
        
        // Cargar calificaciones
        await cargarCalificaciones(calificacionesEl);
        
        console.log('✅ Dashboard cargado correctamente');
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
    }
}

// Cargar estadísticas generales
async function cargarEstadisticas(containerEl) {
    if (!containerEl) return;
    
    try {
        // NO llamar a actualizarProgresoCursos aquí para evitar recursión
        // El progreso ya debe estar actualizado cuando se llama esta función
        
        const token = getCurrentToken();
        if (!token) return;
        
        // Obtener todos los contenidos de todos los cursos
        let totalContenidos = 0;
        let sumaAvances = 0;
        let totalCursos = cursos.length;
        
        for (const curso of cursos) {
            try {
                // Obtener total de contenidos si no está disponible
                if (!curso.totalContenidos || curso.totalContenidos === 0) {
                    const response = await fetchApi(`/api/cursos/${curso.id}/contenidos`);
                    if (response.ok) {
                        const contenidos = await response.json();
                        curso.totalContenidos = contenidos.length;
                    }
                }
                
                const cursoTotalContenidos = curso.totalContenidos || 0;
                totalContenidos += cursoTotalContenidos;
                
                // Sumar el progreso del curso (ya calculado en actualizarProgresoCursos)
                // El progreso del curso es un porcentaje promedio de todos los contenidos
                // Multiplicamos por el total de contenidos para obtener el equivalente en contenidos completados
                const progresoCurso = curso.progreso || 0;
                sumaAvances += (progresoCurso / 100) * cursoTotalContenidos;
            } catch (error) {
                console.error(`Error al cargar contenidos del curso ${curso.id}:`, error);
            }
        }
        
        // Calcular contenidos completados basado en el progreso promedio
        const contenidosCompletados = Math.round(sumaAvances);
        const progresoGeneral = totalContenidos > 0 
            ? Math.round((sumaAvances / totalContenidos) * 100) 
            : 0;
        
        containerEl.innerHTML = `
            <div class="stat-card">
                <h3>${totalCursos}</h3>
                <p>Cursos Inscritos</p>
            </div>
            <div class="stat-card">
                <h3>${totalContenidos}</h3>
                <p>Contenidos Totales</p>
            </div>
            <div class="stat-card">
                <h3>${contenidosCompletados}</h3>
                <p>Contenidos Completados</p>
            </div>
            <div class="stat-card">
                <h3>${progresoGeneral}%</h3>
                <p>Progreso General</p>
            </div>
        `;
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        containerEl.innerHTML = '<p>Error al cargar estadísticas</p>';
    }
}

// Cargar progreso de cursos en el dashboard
async function cargarProgresoCursosDashboard(containerEl) {
    if (!containerEl) return;
    
    try {
        // NO llamar a actualizarProgresoCursos aquí para evitar recursión
        // El progreso ya debe estar actualizado cuando se llama esta función
        // Si no, se actualizará automáticamente cuando se guarde progreso
        
        const token = getCurrentToken();
        if (!token) return;
        
        // Usar los datos de progreso actualizados de los cursos (ya calculados)
        let html = '';
        
        for (const curso of cursos) {
            // Usar el progreso ya calculado en el objeto curso
            const progreso = curso.progreso || 0;
            const progresoPorcentaje = Math.max(0, Math.min(100, Math.round(progreso)));
            
            // Obtener información adicional para mostrar (solo si no está disponible)
            if (!curso.totalContenidos || curso.totalContenidos === 0) {
                try {
                    const response = await fetchApi(`/api/cursos/${curso.id}/contenidos`);
                    if (response.ok) {
                        const contenidos = await response.json();
                        curso.totalContenidos = contenidos.length;
                    }
                } catch (error) {
                    console.error(`Error al cargar contenidos del curso ${curso.id}:`, error);
                }
            }
            
            const cursoTotalContenidos = curso.totalContenidos || 0;
            // Calcular contenidos completados basado en el progreso
            // El progreso es un porcentaje promedio, así que multiplicamos por el total
            const contenidosCompletados = Math.round((progresoPorcentaje / 100) * cursoTotalContenidos);
            
            html += `
                <div class="curso-progress-item">
                    <div class="curso-progress-header">
                        <span>${curso.nombre}</span>
                        <span>${progresoPorcentaje}%</span>
                    </div>
                    <div class="progress-bar" style="height: 8px; background: var(--lighter-gray); border-radius: 4px; overflow: hidden;">
                        <div class="progress-fill" style="width: ${progresoPorcentaje}%; height: 100%; background: var(--primary-gradient); border-radius: 4px; transition: width 0.3s ease;"></div>
                    </div>
                    <p>${contenidosCompletados} de ${cursoTotalContenidos} contenidos completados</p>
                </div>
            `;
        }
        
        containerEl.innerHTML = html || '<p>No hay cursos inscritos.</p>';
    } catch (error) {
        console.error('Error al cargar progreso de cursos:', error);
        containerEl.innerHTML = '<p>Error al cargar progreso</p>';
    }
}

// Cargar calificaciones de quizzes
async function cargarCalificaciones(containerEl) {
    if (!containerEl) return;
    
    try {
        const token = getCurrentToken();
        if (!token) return;
        
        const quizContenidos = [];
        for (const curso of cursos) {
            try {
                const response = await fetch(`http://localhost:8080/api/cursos/${curso.id}/contenidos`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const contenidos = await response.json();
                    contenidos.filter(c => c.tipo === 'quiz').forEach(c => {
                        quizContenidos.push({ ...c, curso_nombre: curso.nombre });
                    });
                }
            } catch (error) {
                console.error(`Error al cargar contenidos del curso ${curso.id}:`, error);
            }
        }
        
        if (quizContenidos.length === 0) {
            containerEl.innerHTML = '<p>No hay calificaciones disponibles aún.</p>';
            return;
        }
        
        let html = '';
        for (const contenido of quizContenidos) {
            try {
                const response = await fetchApi(`/api/contenidos/${contenido.id}/calificacion`);
                
                if (response.ok) {
                    const calificacion = await response.json();
                    if (calificacion.total_preguntas > 0) {
                        html += `
                            <div class="calificacion-item">
                                <div class="calificacion-header">
                                    <span><strong>${contenido.nombre}</strong></span>
                                    <span class="calificacion-porcentaje">${calificacion.porcentaje}%</span>
                                </div>
                                <p>Curso: ${contenido.curso_nombre}</p>
                                <p>Puntaje: ${calificacion.puntaje_obtenido} / ${calificacion.puntaje_total}</p>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${calificacion.porcentaje}%"></div>
                                </div>
                            </div>
                        `;
                    }
                }
            } catch (error) {
                console.error(`Error al cargar calificación de ${contenido.id}:`, error);
            }
        }
        
        if (html === '') {
            containerEl.innerHTML = '<p>No has completado ningún cuestionario aún.</p>';
        } else {
            containerEl.innerHTML = html;
        }
    } catch (error) {
        console.error('Error al cargar calificaciones:', error);
        containerEl.innerHTML = '<p>Error al cargar las calificaciones.</p>';
    }
}

// Exportar funciones
window.cargarDashboard = cargarDashboard;


