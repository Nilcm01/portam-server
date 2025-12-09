/*
    Validation: messages

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
    // Success message
    VALIDATION_SUCCESS: {
        success: true,
        code: 200,
        status: 'VALIDATION_SUCCESS',
        msg: {
            ca: 'Validació correcta',
            en: 'Validation successful',
            es: 'Validación correcta'
        }
    },

    HISTORY_FETCH_SUCCESS: {
        success: true,
        code: 200,
        status: 'HISTORY_FETCH_SUCCESS',
        msg: {
            ca: 'Historial de validacions obtingut correctament',
            en: 'Validation history fetched successfully',
            es: 'Historial de validaciones obtenido correctamente'
        }
    },

    // Error messages (4xx - Client errors)
    ERROR_SUPORT_NOT_FOUND: {
        success: false,
        code: 404,
        status: 'ERROR_SUPORT_NOT_FOUND',
        msg: {
            ca: 'Suport no trobat',
            en: 'Support not found',
            es: 'Soporte no encontrado'
        }
    },

    ERROR_SUPORT_INACTIVE: {
        success: false,
        code: 403,
        status: 'ERROR_SUPORT_INACTIVE',
        msg: {
            ca: 'Suport inactiu',
            en: 'Support inactive',
            es: 'Soporte inactivo'
        }
    },

    ERROR_STATION_NOT_AVAILABLE: {
        success: false,
        code: 404,
        status: 'ERROR_STATION_NOT_AVAILABLE',
        msg: {
            ca: 'Estació no disponible',
            en: 'Station not available',
            es: 'Estación no disponible'
        }
    },

    ERROR_NO_USER_TITLE_ACTIVE: {
        success: false,
        code: 404,
        status: 'ERROR_NO_USER_TITLE_ACTIVE',
        msg: {
            ca: 'No tens cap títol actiu',
            en: 'You have no active title',
            es: 'No tienes ningún título activo'
        }
    },

    ERROR_USER_TITLE_EXPIRED: {
        success: false,
        code: 410,
        status: 'ERROR_USER_TITLE_EXPIRED',
        msg: {
            ca: 'El teu títol ha caducat',
            en: 'Your title has expired',
            es: 'Tu título ha caducado'
        }
    },

    ERROR_CANNOT_INITIALIZE_USER_TITLE: {
        success: false,
        code: 403,
        status: 'ERROR_CANNOT_INITIALIZE_USER_TITLE',
        msg: {
            ca: 'No pots inicialitzar el títol en aquesta estació',
            en: 'You cannot initialize the title at this station',
            es: 'No puedes inicializar el título en esta estación'
        }
    },

    ERROR_REENTRY_TIME_NOT_PASSED: {
        success: false,
        code: 429,
        status: 'ERROR_REENTRY_TIME_NOT_PASSED',
        msg: {
            ca: 'No pots tornar a validar a la mateixa estació encara',
            en: 'You cannot validate at the same station yet',
            es: 'No puedes volver a validar en la misma estación todavía'
        }
    },

    ERROR_USER_TITLE_NOT_VALID_FOR_ZONE: {
        success: false,
        code: 403,
        status: 'ERROR_USER_TITLE_NOT_VALID_FOR_ZONE',
        msg: {
            ca: 'El teu títol no és vàlid per aquesta zona',
            en: 'Your title is not valid for this zone',
            es: 'Tu título no es válido para esta zona'
        }
    },

    ERROR_NO_USES_LEFT: {
        success: false,
        code: 410,
        status: 'ERROR_NO_USES_LEFT',
        msg: {
            ca: 'No et queden viatges disponibles',
            en: 'You have no trips left',
            es: 'No te quedan viajes disponibles'
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
    },

    ERROR_MISSING_PARAMETERS: {
        success: false,
        code: 400,
        status: 'ERROR_MISSING_PARAMETERS',
        msg: {
            ca: 'Falten paràmetres requerits',
            en: 'Missing required parameters',
            es: 'Faltan parámetros requeridos'
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