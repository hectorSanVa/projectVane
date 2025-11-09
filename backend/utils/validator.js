/**
 * Utilidades de validación y sanitización
 */
const validator = {
    /**
     * Valida formato de matrícula
     * @param {string} matricula - Matrícula a validar
     * @returns {boolean}
     */
    isValidMatricula(matricula) {
        if (!matricula || typeof matricula !== 'string') return false;
        // Matrícula: alfanumérica, 3-20 caracteres
        return /^[a-zA-Z0-9]{3,20}$/.test(matricula.trim());
    },

    /**
     * Valida formato de contraseña
     * @param {string} password - Contraseña a validar
     * @returns {boolean}
     */
    isValidPassword(password) {
        if (!password || typeof password !== 'string') return false;
        // Contraseña: mínimo 6 caracteres
        return password.length >= 6;
    },

    /**
     * Valida formato de email
     * @param {string} email - Email a validar
     * @returns {boolean}
     */
    isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    },

    /**
     * Sanitiza texto para prevenir XSS y ataques de inyección
     * @param {string} text - Texto a sanitizar
     * @param {number} maxLength - Longitud máxima (opcional)
     * @param {boolean} allowHtml - Si permite HTML básico (por defecto false)
     * @returns {string}
     */
    sanitizeText(text, maxLength = 1000, allowHtml = false) {
        if (typeof text !== 'string') return '';
        
        let sanitized = text.trim();
        
        // Remover caracteres de control excepto saltos de línea y tabs
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        // Remover scripts y contenido peligroso
        sanitized = sanitized
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
            .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/data:text\/html/gi, '')
            .replace(/vbscript:/gi, '')
            .replace(/expression\s*\(/gi, '');
        
        if (!allowHtml) {
            // Remover todo HTML si no se permite
            sanitized = sanitized.replace(/<[^>]+>/g, '');
        } else {
            // Permitir solo tags HTML seguros
            const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'b', 'i', 'ul', 'ol', 'li'];
            const tagPattern = new RegExp(`<(?!\/?(${allowedTags.join('|')})\\b)[^>]+>`, 'gi');
            sanitized = sanitized.replace(tagPattern, '');
        }
        
        // Escapar caracteres especiales HTML
        sanitized = sanitized
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
        
        // Limitar longitud
        if (maxLength > 0) {
            sanitized = sanitized.substring(0, maxLength);
        }
        
        return sanitized.trim();
    },

    /**
     * Sanitiza texto para chat (permite saltos de línea)
     * @param {string} text - Texto a sanitizar
     * @param {number} maxLength - Longitud máxima (opcional)
     * @returns {string}
     */
    sanitizeChatText(text, maxLength = 500) {
        if (typeof text !== 'string') return '';
        
        let sanitized = text.trim();
        
        // Remover caracteres de control excepto saltos de línea
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        // Remover scripts y contenido peligroso
        sanitized = sanitized
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/<[^>]+>/g, ''); // Remover todo HTML
        
        // Escapar caracteres especiales pero preservar saltos de línea
        sanitized = sanitized
            .replace(/&(?!\w+;)/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
        
        // Convertir saltos de línea a <br> para mostrar correctamente
        sanitized = sanitized.replace(/\n/g, '<br>');
        
        // Limitar longitud
        if (maxLength > 0) {
            sanitized = sanitized.substring(0, maxLength);
        }
        
        return sanitized.trim();
    },

    /**
     * Escapa HTML para prevenir XSS (más simple, solo escape)
     * @param {string} text - Texto a escapar
     * @returns {string}
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        
        return text.replace(/[&<>"'\/]/g, function(m) { return map[m]; });
    },

    /**
     * Valida porcentaje de avance
     * @param {number} avance - Porcentaje de avance
     * @returns {boolean}
     */
    isValidAvance(avance) {
        const num = Number(avance);
        return !isNaN(num) && num >= 0 && num <= 100;
    },

    /**
     * Valida ID numérico
     * @param {*} id - ID a validar
     * @returns {boolean}
     */
    isValidId(id) {
        const num = Number(id);
        return !isNaN(num) && Number.isInteger(num) && num > 0;
    },

    /**
     * Valida tipo de contenido
     * @param {string} tipo - Tipo de contenido
     * @returns {boolean}
     */
    isValidTipoContenido(tipo) {
        const tiposValidos = ['pdf', 'video', 'texto', 'quiz'];
        return tiposValidos.includes(tipo);
    },

    /**
     * Valida rol de usuario
     * @param {string} rol - Rol a validar
     * @returns {boolean}
     */
    isValidRol(rol) {
        const rolesValidos = ['estudiante', 'tutor', 'admin'];
        return rolesValidos.includes(rol);
    },

    /**
     * Valida objeto de solicitud de login
     * @param {object} body - Body de la solicitud
     * @returns {object} - { valid: boolean, error?: string }
     */
    validateLoginRequest(body) {
        if (!body) {
            return { valid: false, error: 'Datos de solicitud requeridos' };
        }

        if (!body.matricula || !validator.isValidMatricula(body.matricula)) {
            return { valid: false, error: 'Matrícula inválida' };
        }

        if (!body.password || !validator.isValidPassword(body.password)) {
            return { valid: false, error: 'Contraseña inválida' };
        }

        return { valid: true };
    }
};

module.exports = validator;

