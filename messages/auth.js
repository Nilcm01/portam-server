/*
    AUTH: messages

    Format:
    {
        success: <boolean>,
        code: <numeric_code>,
        status: <text_code>,
        msg: {
            ca: "Missatge en Català",
            en: "Message in English",
            es: "Mensaje en Español"
        }
    }
*/

const messages = {
    // Success messages (2xx - Success)
    REGISTER_SUCCESS: {
        success: true,
        code: 201,
        status: 'REGISTER_SUCCESS',
        msg: {
            ca: 'L\'usuari s\'ha registrat correctament',
            en: 'The user has been registered successfully',
            es: 'El usuario se ha registrado correctamente'
        }
    },

    LOGIN_SUCCESS: {
        success: true,
        code: 200,
        status: 'LOGIN_SUCCESS',
        msg: {
            ca: 'L\'usuari ha iniciat sessió correctament',
            en: 'The user has logged in successfully',
            es: 'El usuario ha iniciado sesión correctamente'
        }
    },

    SESSION_VALID: {
        success: true,
        code: 200,
        status: 'SESSION_VALID',
        msg: {
            ca: 'La sessió és vàlida',
            en: 'The session is valid',
            es: 'La sesión es válida'
        }
    },

    // Warning messages (3xx - Redirection/Warnings)

    // Error messages (4xx - Client errors)
    REGISTER_MISSING_PARAMETERS: {
        success: false,
        code: 400,
        status: 'REGISTER_MISSING_PARAMETERS',
        msg: {
            ca: 'Falten paràmetres requerits per al registre',
            en: 'Missing required parameters for registration',
            es: 'Faltan parámetros requeridos para el registro'
        }
    },

    REGISTER_INVALID_PARAMETERS: {
        success: false,
        code: 400,
        status: 'REGISTER_INVALID_PARAMETERS',
        msg: {
            ca: 'Paràmetres invàlids per al registre',
            en: 'Invalid parameters for registration',
            es: 'Parámetros inválidos para el registro'
        }
    },

    REGISTER_USER_EXISTS_EMAIL: {
        success: false,
        code: 409,
        status: 'REGISTER_USER_EXISTS_EMAIL',
        msg: {
            ca: 'L\'usuari amb aquest correu electrònic ja existeix',
            en: 'User with this email already exists',
            es: 'El usuario con este correo electrónico ya existe'
        }
    },

    REGISTER_USER_EXISTS_GOVID: {
        success: false,
        code: 409,
        status: 'REGISTER_USER_EXISTS_GOVID',
        msg: {
            ca: 'L\'usuari amb aquest DNI/NIE ja existeix',
            en: 'User with this govId already exists',
            es: 'El usuario con este DNI/NIE ya existe'
        }
    },

    LOGIN_MISSING_PARAMETERS: {
        success: false,
        code: 400,
        status: 'LOGIN_MISSING_PARAMETERS',
        msg: {
            ca: 'Falten paràmetres requerits per a l\'inici de sessió',
            en: 'Missing required parameters for login',
            es: 'Faltan parámetros requeridos para el inicio de sesión'
        }
    },

    LOGIN_INVALID_CREDENTIALS: {
        success: false,
        code: 401,
        status: 'LOGIN_INVALID_CREDENTIALS',
        msg: {
            ca: 'Credencials d\'inici de sessió invàlides',
            en: 'Invalid login credentials',
            es: 'Credenciales de inicio de sesión inválidas'
        }
    },

    SESSION_MISSING_PARAMETERS: {
        success: false,
        code: 400,
        status: 'SESSION_MISSING_PARAMETERS',
        msg: {
            ca: 'Falten paràmetres requerits per a la sessió',
            en: 'Missing required parameters for session',
            es: 'Faltan parámetros requeridos para la sesión'
        }
    },

    SESSION_NOT_FOUND: {
        success: false,
        code: 404,
        status: 'SESSION_NOT_FOUND',
        msg: {
            ca: 'Sessió no trobada',
            en: 'Session not found',
            es: 'Sesión no encontrada'
        }
    },

    SESSION_INVALID_TOKEN: {
        success: false,
        code: 401,
        status: 'SESSION_INVALID_TOKEN',
        msg: {
            ca: 'Token de sessió invàlid',
            en: 'Invalid session token',
            es: 'Token de sesión inválido'
        }
    },

    SESSION_EXPIRED: {
        success: false,
        code: 401,
        status: 'SESSION_EXPIRED',
        msg: {
            ca: 'La sessió ha expirat',
            en: 'The session has expired',
            es: 'La sesión ha expirado'
        }
    },

    // 5xx - Server errors
    ERROR_INTERNAL_SERVER: {
        success: false,
        code: 500,
        status: 'ERROR_INTERNAL_SERVER',
        msg: {
            ca: 'Error intern del servidor',
            en: 'Internal server error',
            es: 'Error interno del servidor'
        }
    }
};

/**
 * Get a message by its status code
 * @param {string} statusCode - The status code (e.g., 'VALIDATION_SUCCESS', 'ERROR_SUPORT_NOT_FOUND')
 * @returns {object} The message object with success, code, status, and msg properties
 */
const getMessage = (statusCode) => {
    return messages[statusCode] || messages.ERROR_INTERNAL_SERVER;
};

/**
 * Get a message by its status code with additional data
 * @param {string} statusCode - The status code
 * @param {object} additionalData - Additional data to include in the response
 * @returns {object} The message object with additional data merged
 */
const getMessageWithData = (statusCode, additionalData = {}) => {
    const message = getMessage(statusCode);
    return { ...message, ...additionalData };
};

module.exports = {
    messages,
    getMessage,
    getMessageWithData
};