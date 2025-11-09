// Manejo de autenticación: login, logout, registro

// Variables globales (compartidas con app.js)
let currentUser = null;
let currentToken = null;

// Manejo de login
async function handleLogin(e) {
    e.preventDefault();
    const matricula = document.getElementById('matricula').value.trim();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');
    const loginForm = document.getElementById('login-form');
    const submitBtn = loginForm ? loginForm.querySelector('button[type="submit"]') : null;

    if (!matricula || !password) {
        if (errorEl) {
            errorEl.textContent = 'Por favor, ingresa matrícula y contraseña';
            errorEl.classList.add('show');
        }
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Iniciando sesión...';
    }

    try {
        const fetchWithTimeout = (url, options, timeout = 10000) => {
            return Promise.race([
                fetch(url, options),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout: El servidor no responde. Verifica que esté ejecutándose.')), timeout)
                )
            ]);
        };
        
        const apiUrl = (window.Config && window.Config.API_URL) || 'http://localhost:8080';
        const timeout = (window.Config && window.Config.TIMEOUT) || 10000;
        const response = await fetchWithTimeout(`${apiUrl}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ matricula, password })
        }, timeout);

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            console.error('Error al parsear JSON:', parseError);
            throw new Error('Error al procesar respuesta del servidor. Verifica que el servidor esté ejecutándose correctamente.');
        }

        if (!response.ok) {
            if (errorEl) {
                errorEl.textContent = data.error || 'Error al iniciar sesión. Verifica tus credenciales.';
                errorEl.classList.add('show');
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Iniciar Sesión';
            }
            return;
        }

        if (!data.token || !data.user) {
            throw new Error('Respuesta inválida del servidor. Falta información de autenticación.');
        }

        currentToken = data.token;
        currentUser = data.user;
        const refreshToken = data.refreshToken || null;

        // Guardar en IndexedDB (incluyendo refresh token si está disponible)
        try {
            await offlineStorage.saveAuth(data.token, data.user, refreshToken);
        } catch (storageError) {
            console.error('Error al guardar en IndexedDB (continuando):', storageError);
        }
        
        // Establecer token en quizManager
        if (typeof quizManager !== 'undefined' && quizManager && typeof quizManager.setToken === 'function') {
            try {
                quizManager.setToken(data.token);
            } catch (quizError) {
                console.warn('Error al establecer token en quizManager (continuando):', quizError);
            }
        }

        // Conectar WebSocket
        try {
            await wsClient.connect(data.token);
        } catch (wsError) {
            console.warn('Error al conectar WebSocket (continuando):', wsError);
        }

        mostrarPantallaPrincipal();
        
        if (currentUser.rol === 'tutor') {
            // Mostrar panel de tutor y ocultar panel de estudiante
            document.getElementById('tutor-panel').classList.remove('hidden');
            document.getElementById('student-panel').classList.add('hidden');
            setTimeout(() => {
                if (typeof inicializarTutor === 'function') {
                    inicializarTutor();
                }
            }, 100);
        } else if (currentUser.rol === 'estudiante') {
            // Mostrar panel de estudiante y ocultar panel de tutor
            document.getElementById('student-panel').classList.remove('hidden');
            document.getElementById('tutor-panel').classList.add('hidden');
            mostrarVistaEstudiante('dashboard');
            cargarCursos();
            
            if (navigator.onLine && wsClient.isConnected) {
                setTimeout(async () => {
                    if (typeof descargarContenidosAutomaticamente === 'function') {
                        await descargarContenidosAutomaticamente();
                    }
                }, 2000);
            }
        }
    } catch (error) {
        console.error('Error en login:', error);
        if (errorEl) {
            errorEl.textContent = error.message || 'Error al iniciar sesión. Verifica que el servidor esté ejecutándose.';
            errorEl.classList.add('show');
        }
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Iniciar Sesión';
        }
    }
}

// Manejo de logout
async function handleLogout(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    try {
        // Obtener refresh token antes de limpiar
        let refreshToken = null;
        try {
            const auth = await offlineStorage.getAuth();
            refreshToken = auth?.refreshToken || null;
        } catch (error) {
            console.warn('No se pudo obtener refresh token para logout:', error);
        }

        // Revocar refresh token en el servidor
        if (refreshToken || currentToken) {
            try {
                const apiUrl = (window.Config && window.Config.API_URL) || 'http://localhost:8080';
                await fetch(`${apiUrl}/api/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {})
                    },
                    body: JSON.stringify({ refreshToken })
                });
            } catch (error) {
                console.warn('Error al revocar refresh token (continuando):', error);
            }
        }

        if (wsClient && wsClient.isConnected) {
            wsClient.disconnect();
        }
        
        currentToken = null;
        currentUser = null;
        
        await offlineStorage.clearAuth();
        
        // Limpiar variables globales
        if (typeof cursos !== 'undefined') cursos = [];
        if (typeof contenidosActuales !== 'undefined') contenidosActuales = [];
        if (typeof currentEstudianteId !== 'undefined') currentEstudianteId = null;
        
        // Limpiar error de login
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
        
        mostrarPantallaLogin();
    } catch (error) {
        console.error('Error en logout:', error);
        // Continuar con el logout aunque haya error
        mostrarPantallaLogin();
    }
}

// Mostrar pantalla de login
function mostrarPantallaLogin() {
    const loginScreen = document.getElementById('login-screen');
    const mainScreen = document.getElementById('main-screen');
    const registerScreen = document.getElementById('register-screen');
    
    if (loginScreen) {
        loginScreen.classList.add('active');
        loginScreen.classList.remove('hidden');
    }
    if (mainScreen) {
        mainScreen.classList.remove('active');
        mainScreen.classList.add('hidden');
    }
    if (registerScreen) {
        registerScreen.classList.remove('active');
        registerScreen.classList.add('hidden');
    }
}

// Mostrar pantalla principal
function mostrarPantallaPrincipal() {
    const loginScreen = document.getElementById('login-screen');
    const mainScreen = document.getElementById('main-screen');
    const registerScreen = document.getElementById('register-screen');
    
    if (loginScreen) {
        loginScreen.classList.remove('active');
        loginScreen.classList.add('hidden');
    }
    if (mainScreen) {
        mainScreen.classList.add('active');
        mainScreen.classList.remove('hidden');
    }
    if (registerScreen) {
        registerScreen.classList.remove('active');
        registerScreen.classList.add('hidden');
    }
    
    if (currentUser) {
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) {
            userNameEl.textContent = currentUser.nombre || currentUser.matricula;
        }
    }
}

// Manejo de registro
async function handleRegister(event) {
    event.preventDefault();
    
    const matricula = document.getElementById('register-matricula').value.trim();
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    const nombre = document.getElementById('register-nombre').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const rol = document.getElementById('register-rol').value;
    const errorEl = document.getElementById('register-error');
    const submitBtn = document.getElementById('register-btn');
    
    if (!matricula || !password) {
        if (errorEl) {
            errorEl.textContent = 'Matrícula y contraseña son requeridos';
            errorEl.style.display = 'block';
        }
        return;
    }
    
    if (password.length < 6) {
        if (errorEl) {
            errorEl.textContent = 'La contraseña debe tener al menos 6 caracteres';
            errorEl.style.display = 'block';
        }
        return;
    }
    
    if (password !== passwordConfirm) {
        if (errorEl) {
            errorEl.textContent = 'Las contraseñas no coinciden';
            errorEl.style.display = 'block';
        }
        return;
    }
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creando cuenta...';
    }
    
    try {
        const apiUrl = (window.Config && window.Config.API_URL) || 'http://localhost:8080';
        const endpoint = rol === 'tutor' ? '/api/register/tutor' : '/api/register/estudiante';
        const response = await fetch(`${apiUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ matricula, password, nombre, email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarNotificacion('Cuenta creada exitosamente. Por favor, inicia sesión.', 'success');
            volverALogin();
        } else {
            if (errorEl) {
                errorEl.textContent = data.error || 'Error al crear cuenta';
                errorEl.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error en registro:', error);
        if (errorEl) {
            errorEl.textContent = 'Error al crear cuenta. Verifica que el servidor esté ejecutándose.';
            errorEl.style.display = 'block';
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crear Cuenta';
        }
    }
}

// Mostrar registro de estudiante
function mostrarRegistroEstudiante() {
    const loginScreen = document.getElementById('login-screen');
    const registerScreen = document.getElementById('register-screen');
    const mainScreen = document.getElementById('main-screen');
    
    if (loginScreen) {
        loginScreen.classList.remove('active');
        loginScreen.classList.add('hidden');
    }
    if (mainScreen) {
        mainScreen.classList.remove('active');
        mainScreen.classList.add('hidden');
    }
    if (registerScreen) {
        registerScreen.classList.remove('hidden');
        registerScreen.classList.add('active');
    }
    
    const rolInput = document.getElementById('register-rol');
    const subtitleEl = document.getElementById('register-subtitle');
    const registerForm = document.getElementById('register-form');
    const errorEl = document.getElementById('register-error');
    
    if (rolInput) rolInput.value = 'estudiante';
    if (subtitleEl) subtitleEl.textContent = 'Regístrate como Estudiante';
    
    if (registerForm) registerForm.reset();
    if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
    }
}

// Mostrar registro de tutor
function mostrarRegistroTutor() {
    const loginScreen = document.getElementById('login-screen');
    const registerScreen = document.getElementById('register-screen');
    const mainScreen = document.getElementById('main-screen');
    
    if (loginScreen) {
        loginScreen.classList.remove('active');
        loginScreen.classList.add('hidden');
    }
    if (mainScreen) {
        mainScreen.classList.remove('active');
        mainScreen.classList.add('hidden');
    }
    if (registerScreen) {
        registerScreen.classList.remove('hidden');
        registerScreen.classList.add('active');
    }
    
    const rolInput = document.getElementById('register-rol');
    const subtitleEl = document.getElementById('register-subtitle');
    const registerForm = document.getElementById('register-form');
    const errorEl = document.getElementById('register-error');
    
    if (rolInput) rolInput.value = 'tutor';
    if (subtitleEl) subtitleEl.textContent = 'Regístrate como Tutor';
    
    if (registerForm) registerForm.reset();
    if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
    }
}

// Volver al login desde el registro
function volverALogin() {
    const loginScreen = document.getElementById('login-screen');
    const registerScreen = document.getElementById('register-screen');
    
    if (loginScreen) {
        loginScreen.classList.add('active');
        loginScreen.classList.remove('hidden');
    }
    if (registerScreen) {
        registerScreen.classList.remove('active');
        registerScreen.classList.add('hidden');
    }
}

// Exportar funciones globalmente
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.handleRegister = handleRegister;
window.mostrarPantallaLogin = mostrarPantallaLogin;
window.mostrarPantallaPrincipal = mostrarPantallaPrincipal;
window.mostrarRegistroEstudiante = mostrarRegistroEstudiante;
window.mostrarRegistroTutor = mostrarRegistroTutor;
window.volverALogin = volverALogin;

// Exportar variables para uso en otros módulos
window.getCurrentUser = () => currentUser;
window.getCurrentToken = () => currentToken;
window.setCurrentUser = (user) => { currentUser = user; };
window.setCurrentToken = (token) => { currentToken = token; };


