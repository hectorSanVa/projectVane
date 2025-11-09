// Funciones de quiz para estudiantes

// Función helper para obtener quizManager desde cualquier contexto
function getQuizManager() {
    // Intentar desde window primero (más confiable)
    if (typeof window !== 'undefined' && window.quizManager) {
        return window.quizManager;
    }
    // Intentar desde el ámbito global
    if (typeof quizManager !== 'undefined') {
        return quizManager;
    }
    // Si no está disponible, retornar null
    console.warn('⚠️ quizManager no está disponible aún');
    return null;
}

// Verificar que quizManager esté disponible al cargar
(function() {
    const qm = getQuizManager();
    if (qm) {
        console.log('✅ quizManager encontrado al cargar quiz-student.js');
    } else {
        console.warn('⚠️ quizManager no encontrado al cargar quiz-student.js. Se intentará obtener cuando sea necesario.');
    }
})();

// Mostrar quiz
async function mostrarQuiz(contenidoId, nombreQuiz) {
    console.log('=== mostrarQuiz INICIADO ===', { contenidoId, nombreQuiz });
    
    const viewer = document.getElementById('content-viewer');
    
    if (!viewer) {
        console.error('ERROR: Viewer no encontrado');
        return;
    }
    
    // El modal ya está abierto y configurado por verContenido, solo necesitamos el viewer
    viewer.innerHTML = '<p style="text-align: center; padding: 20px;">Cargando cuestionario...</p>';
    
    try {
        // Esperar un momento para que quizManager esté disponible
        let qm = getQuizManager();
        if (!qm) {
            // Intentar varias veces con pequeños delays
            for (let i = 0; i < 10 && !qm; i++) {
                await new Promise(resolve => setTimeout(resolve, 50));
                qm = getQuizManager();
            }
        }
        
        if (!qm) {
            throw new Error('quizManager no está disponible después de varios intentos');
        }
        
        console.log('Obteniendo preguntas del quiz:', contenidoId);
        const preguntas = await qm.getPreguntas(contenidoId);
        console.log('Preguntas obtenidas:', preguntas?.length || 0);
        
        console.log('Obteniendo calificación del quiz:', contenidoId);
        const calificacion = await qm.getCalificacion(contenidoId);
        console.log('Calificación obtenida:', calificacion);
        
        if (!preguntas || preguntas.length === 0) {
            viewer.innerHTML = '<p>Este cuestionario no tiene preguntas aún.</p>';
            return;
        }
        
        const yaRespondio = calificacion && calificacion.total_preguntas > 0;
        const intentosRealizados = calificacion?.intentosRealizados || 0;
        const intentosRestantes = calificacion?.intentosRestantes || 3;
        const puedeReintentar = intentosRestantes > 0 && intentosRealizados < 3;
        const mejorCalificacion = calificacion?.porcentaje || 0;
        const aprobado = mejorCalificacion >= 60;
        
        let html = `
            <div class="quiz-container">
                <h2>${nombreQuiz || 'Cuestionario'}</h2>
        `;
        
        if (yaRespondio) {
            html += `
                <div class="quiz-resultado-header" style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                    <h3>Mejor Resultado: ${mejorCalificacion}%</h3>
                    <p>${aprobado ? '<span style="color: #4caf50;">✓ Aprobado</span>' : '<span style="color: #f44336;">Se requiere 60%</span>'}</p>
                    <p>Intentos realizados: ${intentosRealizados} / 3</p>
                    <p>Intentos restantes: ${intentosRestantes}</p>
                    ${!puedeReintentar ? '<p style="color: #f44336;">Límite de intentos alcanzado</p>' : ''}
                </div>
            `;
            
            if (puedeReintentar) {
                html += `
                    <button class="btn btn-primary" onclick="reiniciarQuiz(${contenidoId})" style="margin-bottom: 20px;">
                        Volver a Intentar
                    </button>
                `;
            }
            
            html += `
                <button class="btn btn-secondary" onclick="verResultadosDetalladosQuiz(${contenidoId})" style="margin-bottom: 20px;">
                    Ver Resultados Detallados
                </button>
            `;
        }
        
        if (!yaRespondio || puedeReintentar) {
            html += `
                <form id="quiz-form" onsubmit="enviarQuiz(event, ${contenidoId})">
            `;
            
            preguntas.forEach((pregunta, index) => {
                html += `
                    <div class="pregunta-item" style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #ddd;">
                        <h4>Pregunta ${index + 1}: ${pregunta.texto}</h4>
                        <p style="font-size: 12px; color: #666;">Tipo: ${pregunta.tipo} | Puntaje: ${pregunta.puntaje || 1}</p>
                `;
                
                if (pregunta.tipo === 'opcion_multiple' || pregunta.tipo === 'verdadero_falso') {
                    pregunta.opciones.forEach((opcion, opcionIndex) => {
                        html += `
                            <label style="display: block; margin: 10px 0; padding: 10px; background: #f9f9f9; border-radius: 5px; cursor: pointer;">
                                <input type="radio" name="pregunta_${pregunta.id}" value="${opcion.id}" required>
                                ${opcion.texto}
                            </label>
                        `;
                    });
                } else if (pregunta.tipo === 'texto') {
                    html += `
                        <textarea name="pregunta_${pregunta.id}" class="form-control" rows="3" required placeholder="Escribe tu respuesta aquí..."></textarea>
                    `;
                }
                
                html += `</div>`;
            });
            
            html += `
                    <button type="submit" class="btn btn-primary" id="submit-quiz-btn">
                        Enviar Respuestas
                    </button>
                </form>
            `;
        }
        
        html += `</div>`;
        viewer.innerHTML = html;
        
        // Asegurar que el botón de cerrar esté visible después de cargar el quiz
        setTimeout(() => {
            const closeBtn = document.getElementById('content-modal-close-btn');
            if (closeBtn) {
                closeBtn.style.zIndex = '999999';
                closeBtn.style.pointerEvents = 'auto';
                closeBtn.style.display = 'flex';
                console.log('✅ Botón de cerrar verificado después de cargar quiz');
            }
        }, 200);
        
        console.log('=== mostrarQuiz COMPLETADO ===');
    } catch (error) {
        console.error('❌ Error al cargar quiz:', error);
        console.error('Stack:', error.stack);
        viewer.innerHTML = `<p style="color: var(--danger-color); padding: 20px;">Error al cargar el cuestionario: ${error.message}</p>`;
        
        // Mostrar notificación si la función está disponible
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Error al cargar el cuestionario: ' + error.message, 'error');
        }
    }
}

// Enviar quiz
async function enviarQuiz(event, contenidoId) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = document.getElementById('submit-quiz-btn');
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';
    }
    
    try {
        const qm = getQuizManager();
        if (!qm) {
            throw new Error('quizManager no está disponible');
        }
        
        const formData = new FormData(form);
        const respuestas = [];
        
        // Recopilar respuestas
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('pregunta_')) {
                const preguntaId = parseInt(key.replace('pregunta_', ''));
                respuestas.push({
                    pregunta_id: preguntaId,
                    opcion_id: value ? parseInt(value) : null,
                    texto_respuesta: value && !isNaN(value) ? null : value
                });
            }
        }
        
        const resultado = await qm.guardarRespuestas(contenidoId, respuestas);
        
        // Obtener el contenido para el curso_id
        // Usar window.contenidosActuales si está disponible, sino la variable global
        const contenidos = typeof window !== 'undefined' && window.contenidosActuales 
            ? window.contenidosActuales 
            : (typeof contenidosActuales !== 'undefined' ? contenidosActuales : []);
        const contenido = contenidos.find(c => c.id === contenidoId);
        const cursoId = contenido?.curso_id;
        
        // El backend ya actualiza el progreso automáticamente
        // Mostramos notificaciones y actualizamos la UI
        const porcentaje = resultado.mejorCalificacion?.porcentaje || resultado.calificacion?.porcentaje || 0;
        const aprobado = porcentaje >= 60;
        
        if (aprobado) {
            mostrarNotificacion(`¡Felicidades! Has aprobado el cuestionario con ${porcentaje}%. Progreso actualizado.`, 'success');
        } else {
            mostrarNotificacion(`Calificación: ${porcentaje}%. Se requiere 60% para aprobar.`, 'warning');
        }
        
        if (resultado.intentosRestantes > 0) {
            mostrarNotificacion(`Intentos restantes: ${resultado.intentosRestantes}`, 'info');
        } else {
            mostrarNotificacion('Has alcanzado el límite de intentos.', 'warning');
        }
        
        // Mostrar resultados
        await mostrarResultadosQuiz(contenidoId, resultado);
        
        // Actualizar progreso en la UI después de mostrar resultados
        // Esperar un poco para que el backend termine de guardar
        if (cursoId && typeof actualizarProgresoCursos === 'function') {
            setTimeout(async () => {
                console.log('🔄 Actualizando progreso después de enviar quiz...');
                await actualizarProgresoCursos();
                // También actualizar la vista del curso si está abierta
                if (typeof mostrarCursoDetalle === 'function') {
                    const contenidos = typeof window !== 'undefined' && window.contenidosActuales 
                        ? window.contenidosActuales 
                        : (typeof contenidosActuales !== 'undefined' ? contenidosActuales : []);
                    const contenido = contenidos.find(c => c.id === contenidoId);
                    const cursoIdParaDetalle = contenido?.curso_id || cursoId;
                    if (cursoIdParaDetalle) {
                        const cursoActual = typeof window !== 'undefined' && window.cursos 
                            ? window.cursos.find(c => c.id === cursoIdParaDetalle)
                            : null;
                        if (cursoActual) {
                            console.log('🔄 Actualizando detalle del curso después de enviar quiz...');
                            await mostrarCursoDetalle(cursoActual.id);
                        }
                    }
                }
            }, 1000); // Esperar 1 segundo para que el backend termine de guardar
        }
        
    } catch (error) {
        console.error('Error al enviar quiz:', error);
        mostrarNotificacion('Error al enviar respuestas: ' + (error.message || 'Error desconocido'), 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar Respuestas';
        }
    }
}

// Mostrar resultados del quiz
async function mostrarResultadosQuiz(contenidoId, resultado) {
    const viewer = document.getElementById('content-viewer');
    if (!viewer) return;
    
    try {
        const qm = getQuizManager();
        if (!qm) {
            throw new Error('quizManager no está disponible');
        }
        
        const resultadosDetallados = await qm.getResultadosDetallados(contenidoId);
        const calificacion = resultado.calificacion || await qm.getCalificacion(contenidoId);
        
        let html = `
            <div class="quiz-resultado-header" style="margin-bottom: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
                <h2>Resultados del Cuestionario</h2>
                <h3>Calificación: ${calificacion.porcentaje}%</h3>
                <p>Puntaje: ${calificacion.puntaje_obtenido} / ${calificacion.puntaje_total}</p>
                <p>Preguntas correctas: ${calificacion.preguntas_correctas} / ${calificacion.total_preguntas}</p>
                ${calificacion.porcentaje >= 60 ? 
                    '<p style="color: #4caf50; font-weight: bold;">✓ Aprobado</p>' : 
                    '<p style="color: #f44336; font-weight: bold;">Se requiere 60% para aprobar</p>'
                }
                <p>Intento: ${resultado.numeroIntento || 1} / 3</p>
                <p>Intentos restantes: ${resultado.intentosRestantes || 0}</p>
            </div>
        `;
        
        if (resultadosDetallados && resultadosDetallados.length > 0) {
            html += '<div class="preguntas-resultado">';
            resultadosDetallados.forEach((item, index) => {
                const esCorrecta = item.es_correcta;
                html += `
                    <div class="pregunta-resultado" style="margin-bottom: 20px; padding: 15px; background: white; border-left: 4px solid ${esCorrecta ? '#4caf50' : '#f44336'}; border-radius: 5px;">
                        <h4>Pregunta ${index + 1}: ${item.pregunta_texto}</h4>
                        <div style="margin-top: 10px;">
                            <strong>Tu respuesta:</strong>
                            <div style="padding: 10px; background: ${esCorrecta ? '#e8f5e9' : '#ffebee'}; border-radius: 5px; margin-top: 5px;">
                                ${item.respuesta_texto || item.opcion_texto || 'Sin respuesta'}
                            </div>
                        </div>
                        ${!esCorrecta && item.respuesta_correcta ? `
                            <div style="margin-top: 10px;">
                                <strong>Respuesta correcta:</strong>
                                <div style="padding: 10px; background: #e8f5e9; border-radius: 5px; margin-top: 5px;">
                                    ${item.respuesta_correcta}
                                </div>
                            </div>
                        ` : ''}
                        <div style="margin-top: 10px; font-size: 12px; color: #666;">
                            Puntaje: ${item.puntaje || 0} punto(s)
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        html += `
            <div style="text-align: center; margin-top: 30px;">
                <button class="btn btn-primary" onclick="cerrarModal()">Cerrar</button>
                ${resultado.intentosRestantes > 0 ? `
                    <button class="btn btn-secondary" onclick="reiniciarQuiz(${contenidoId})" style="margin-left: 10px;">
                        Volver a Intentar
                    </button>
                ` : ''}
            </div>
        `;
        
        viewer.innerHTML = html;
    } catch (error) {
        console.error('Error al mostrar resultados:', error);
        viewer.innerHTML = '<p>Error al cargar los resultados.</p>';
    }
}

// Ver resultados detallados
async function verResultadosDetalladosQuiz(contenidoId) {
    try {
        const qm = getQuizManager();
        if (!qm) {
            throw new Error('quizManager no está disponible');
        }
        
        const resultadosDetallados = await qm.getResultadosDetallados(contenidoId);
        const calificacion = await qm.getCalificacion(contenidoId);
        
        if (resultadosDetallados) {
            await mostrarResultadosQuiz(contenidoId, { calificacion });
        } else {
            alert('No se pudieron cargar los resultados detallados');
        }
    } catch (error) {
        console.error('Error al ver resultados detallados:', error);
        alert('Error al cargar los resultados');
    }
}

// Reiniciar quiz
async function reiniciarQuiz(contenidoId) {
    const contenidos = typeof window !== 'undefined' && window.contenidosActuales 
        ? window.contenidosActuales 
        : (typeof contenidosActuales !== 'undefined' ? contenidosActuales : []);
    const contenido = contenidos.find(c => c.id === contenidoId);
    if (contenido) {
        await mostrarQuiz(contenidoId, contenido.nombre);
    }
}

// Función para exportar funciones a window (DEFINIDA ANTES DE USARLA)
function exportarFuncionesQuiz() {
    try {
        if (typeof window !== 'undefined') {
            window.mostrarQuiz = mostrarQuiz;
            window.enviarQuiz = enviarQuiz;
            window.reiniciarQuiz = reiniciarQuiz;
            window.verResultadosDetalladosQuiz = verResultadosDetalladosQuiz;
            console.log('✅ Funciones de quiz exportadas a window:', {
                mostrarQuiz: typeof window.mostrarQuiz,
                enviarQuiz: typeof window.enviarQuiz,
                reiniciarQuiz: typeof window.reiniciarQuiz,
                verResultadosDetalladosQuiz: typeof window.verResultadosDetalladosQuiz
            });
            return true;
        }
    } catch (e) {
        console.error('Error al exportar funciones de quiz:', e);
    }
    return false;
}

// Exportar inmediatamente (después de que las funciones estén definidas)
try {
    exportarFuncionesQuiz();
} catch (e) {
    console.error('Error al exportar funciones inmediatamente:', e);
}

// También exportar cuando el DOM esté listo (por si acaso)
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            try {
                exportarFuncionesQuiz();
            } catch (e) {
                console.error('Error al exportar funciones en DOMContentLoaded:', e);
            }
        });
    } else {
        // DOM ya está listo, exportar de nuevo
        try {
            exportarFuncionesQuiz();
        } catch (e) {
            console.error('Error al exportar funciones (DOM ya listo):', e);
        }
    }
}

// Exportar también después de múltiples delays para asegurar que todo esté cargado
setTimeout(() => {
    try {
        exportarFuncionesQuiz();
    } catch (e) {
        console.error('Error al exportar funciones (timeout 100ms):', e);
    }
}, 100);

setTimeout(() => {
    try {
        exportarFuncionesQuiz();
    } catch (e) {
        console.error('Error al exportar funciones (timeout 500ms):', e);
    }
}, 500);

setTimeout(() => {
    try {
        exportarFuncionesQuiz();
    } catch (e) {
        console.error('Error al exportar funciones (timeout 1000ms):', e);
    }
}, 1000);


