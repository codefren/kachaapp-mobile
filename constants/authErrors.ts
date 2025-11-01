/**
 * Constantes y mensajes de error para autenticación
 * Basado en las validaciones del endpoint /api/token/ del backend
 */

export enum AuthErrorCode {
  // 400 - Bad Request
  NOT_NEAR_MARKET = 'NOT_NEAR_MARKET',
  MISSING_LOCATION = 'MISSING_LOCATION',
  INVALID_COORDINATES = 'INVALID_COORDINATES',
  
  // 401 - Unauthorized
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  
  // 403 - Forbidden
  ACCESS_DENIED = 'ACCESS_DENIED',
  
  // 500 - Server Error
  SERVER_ERROR = 'SERVER_ERROR',
  
  // Network
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // Unknown
  UNKNOWN = 'UNKNOWN',
}

export interface AuthError {
  code: AuthErrorCode;
  title: string;
  message: string;
  userMessage: string; // Mensaje amigable para el usuario
  technicalDetails?: string; // Detalles técnicos para debugging
  suggestions: string[]; // Sugerencias de solución
  statusCode?: number;
}

/**
 * Mensajes de error según las validaciones del backend
 */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, Omit<AuthError, 'code' | 'technicalDetails' | 'statusCode'>> = {
  // 400 - Validación de proximidad
  [AuthErrorCode.NOT_NEAR_MARKET]: {
    title: 'Fuera del área del mercado',
    message: 'No estás cerca de ningún mercado registrado',
    userMessage: 'Para iniciar sesión, debes estar dentro del radio de 500 metros de un mercado activo.',
    suggestions: [
      'Acércate a un mercado registrado',
      'Verifica que tu GPS esté activado',
      'Asegúrate de tener permisos de ubicación activados',
      'Si estás en un mercado, intenta moverte unos metros'
    ]
  },
  
  [AuthErrorCode.MISSING_LOCATION]: {
    title: 'Ubicación requerida',
    message: 'No se pudo obtener tu ubicación',
    userMessage: 'Necesitamos tu ubicación para verificar que estás en un mercado autorizado.',
    suggestions: [
      'Activa el GPS de tu dispositivo',
      'Permite el acceso a la ubicación en la configuración de la app',
      'Asegúrate de estar en un área con señal GPS',
      'Reinicia la app e intenta de nuevo'
    ]
  },
  
  [AuthErrorCode.INVALID_COORDINATES]: {
    title: 'Coordenadas inválidas',
    message: 'Las coordenadas proporcionadas no son válidas',
    userMessage: 'Hubo un problema al obtener tu ubicación. Por favor intenta nuevamente.',
    suggestions: [
      'Reinicia el GPS de tu dispositivo',
      'Reinicia la aplicación',
      'Verifica que los servicios de ubicación estén activos'
    ]
  },
  
  // 401 - Credenciales
  [AuthErrorCode.INVALID_CREDENTIALS]: {
    title: 'Credenciales incorrectas',
    message: 'Usuario o contraseña incorrectos',
    userMessage: 'El usuario o la contraseña que ingresaste no son correctos. Por favor verifica e intenta nuevamente.',
    suggestions: [
      'Verifica que el usuario esté escrito correctamente',
      'Asegúrate de que la contraseña sea correcta',
      'Revisa que no tengas el bloqueo de mayúsculas activado',
      '¿Olvidaste tu contraseña? Usa la opción de recuperación'
    ]
  },
  
  [AuthErrorCode.TOKEN_EXPIRED]: {
    title: 'Sesión expirada',
    message: 'Tu sesión ha expirado',
    userMessage: 'Tu sesión ha expirado por seguridad. Por favor inicia sesión nuevamente.',
    suggestions: [
      'Inicia sesión de nuevo con tus credenciales',
      'Asegúrate de mantener la app activa si necesitas sesiones largas'
    ]
  },
  
  [AuthErrorCode.TOKEN_INVALID]: {
    title: 'Credenciales incorrectas',
    message: 'Usuario o contraseña incorrectos',
    userMessage: 'El usuario o la contraseña que ingresaste no son correctos. Por favor verifica e intenta nuevamente.',
    suggestions: [
      'Verifica que el usuario esté escrito correctamente',
      'Asegúrate de que la contraseña sea correcta',
      'Revisa que no tengas el bloqueo de mayúsculas activado',
      '¿Olvidaste tu contraseña? Usa la opción de recuperación'
    ]
  },
  
  // 403 - Acceso denegado
  [AuthErrorCode.ACCESS_DENIED]: {
    title: 'Acceso denegado',
    message: 'No tienes permisos para acceder',
    userMessage: 'No tienes los permisos necesarios para realizar esta acción.',
    suggestions: [
      'Contacta con el administrador del mercado',
      'Verifica que tu cuenta esté activa',
      'Asegúrate de tener los permisos necesarios'
    ]
  },
  
  // 500 - Error del servidor
  [AuthErrorCode.SERVER_ERROR]: {
    title: 'Error del servidor',
    message: 'Error interno del servidor',
    userMessage: 'Ocurrió un problema en nuestros servidores. Por favor intenta más tarde.',
    suggestions: [
      'Espera unos minutos e intenta nuevamente',
      'Verifica tu conexión a internet',
      'Si el problema persiste, contacta con soporte técnico'
    ]
  },
  
  // Errores de red
  [AuthErrorCode.NETWORK_ERROR]: {
    title: 'Error de conexión',
    message: 'No se pudo conectar con el servidor',
    userMessage: 'No pudimos conectarnos al servidor. Verifica tu conexión a internet.',
    suggestions: [
      'Verifica que tengas conexión a internet',
      'Intenta cambiar entre WiFi y datos móviles',
      'Asegúrate de no estar en modo avión',
      'Reinicia tu router o conexión de datos'
    ]
  },
  
  [AuthErrorCode.TIMEOUT]: {
    title: 'Tiempo agotado',
    message: 'La solicitud tardó demasiado tiempo',
    userMessage: 'La solicitud está tardando más de lo esperado. Verifica tu conexión.',
    suggestions: [
      'Verifica la velocidad de tu conexión a internet',
      'Intenta acercarte al router WiFi',
      'Reinicia la app e intenta nuevamente'
    ]
  },
  
  // Error desconocido
  [AuthErrorCode.UNKNOWN]: {
    title: 'Error desconocido',
    message: 'Ocurrió un error inesperado',
    userMessage: 'Ocurrió un error inesperado. Por favor intenta nuevamente.',
    suggestions: [
      'Reinicia la aplicación',
      'Verifica tu conexión a internet',
      'Si el problema persiste, contacta con soporte técnico'
    ]
  },
};

/**
 * Detectar el tipo de error basado en el status code y mensaje del servidor
 */
export function detectAuthError(
  statusCode?: number,
  serverMessage?: string,
  errorData?: any
): AuthError {
  let errorCode = AuthErrorCode.UNKNOWN;
  let technicalDetails = '';

  // Analizar por status code
  if (statusCode === 400) {
    // Errores de validación (proximidad)
    if (serverMessage?.includes('not near any market') || 
        serverMessage?.includes('Login denied') ||
        serverMessage?.includes('Refresh denied')) {
      errorCode = AuthErrorCode.NOT_NEAR_MARKET;
      technicalDetails = `Usuario fuera del radio de 500m. Coordenadas: ${errorData?.latitude}, ${errorData?.longitude}`;
    } else if (serverMessage?.includes('location') || serverMessage?.includes('coordinates')) {
      errorCode = AuthErrorCode.MISSING_LOCATION;
      technicalDetails = serverMessage;
    } else {
      errorCode = AuthErrorCode.INVALID_COORDINATES;
      technicalDetails = serverMessage || 'Bad request';
    }
  } else if (statusCode === 401) {
    // Errores de autenticación
    if (serverMessage?.includes('Invalid credentials') || 
        serverMessage?.includes('Unable to log in') ||
        serverMessage?.includes('incorrect')) {
      errorCode = AuthErrorCode.INVALID_CREDENTIALS;
      technicalDetails = 'Credenciales inválidas proporcionadas';
    } else if (serverMessage?.includes('expired')) {
      errorCode = AuthErrorCode.TOKEN_EXPIRED;
      technicalDetails = serverMessage;
    } else {
      errorCode = AuthErrorCode.TOKEN_INVALID;
      technicalDetails = serverMessage || 'Token inválido';
    }
  } else if (statusCode === 403) {
    errorCode = AuthErrorCode.ACCESS_DENIED;
    technicalDetails = serverMessage || 'Acceso denegado';
  } else if (statusCode && statusCode >= 500) {
    errorCode = AuthErrorCode.SERVER_ERROR;
    technicalDetails = `Server error ${statusCode}: ${serverMessage}`;
  } else if (!statusCode) {
    // Sin status code = error de red
    if (serverMessage?.includes('Network') || serverMessage?.includes('conexión') || serverMessage?.includes('connection')) {
      errorCode = AuthErrorCode.NETWORK_ERROR;
      technicalDetails = serverMessage;
    } else if (serverMessage?.includes('timeout') || serverMessage?.includes('agotado')) {
      errorCode = AuthErrorCode.TIMEOUT;
      technicalDetails = serverMessage;
    }
  }

  const baseError = AUTH_ERROR_MESSAGES[errorCode];
  
  return {
    code: errorCode,
    ...baseError,
    technicalDetails,
    statusCode,
  };
}

/**
 * Formatear mensaje de error para mostrar al usuario
 */
export function formatAuthErrorMessage(error: AuthError, includeDetails: boolean = false): string {
  let message = error.userMessage;
  
  if (error.suggestions.length > 0) {
    message += '\n\nSugerencias:\n';
    message += error.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n');
  }
  
  // En modo desarrollo, agregar detalles técnicos
  if (includeDetails && error.technicalDetails) {
    message += '\n\nDetalles técnicos:\n' + error.technicalDetails;
  }
  
  return message;
}
