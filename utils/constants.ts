// Constantes de la aplicación
export const APP_CONFIG = {
  // Configuración de autenticación
  AUTH: {
    TOKEN_REFRESH_INTERVAL: 180000, // 3 minutos en milisegundos
    LOCATION_UPDATE_INTERVAL: 30000, // 30 segundos
    LOCATION_DISTANCE_THRESHOLD: 50, // 50 metros
    LOGIN_TIMEOUT: 30000, // 30 segundos para login
  },
  
  // Configuración de geolocalización
  LOCATION: {
    HIGH_ACCURACY: true,
    TIMEOUT: 15000, // 15 segundos
    MAXIMUM_AGE: 60000, // 1 minuto
    DISTANCE_FILTER: 10, // 10 metros
  },
  
  // Configuración de API
  API: {
    TIMEOUT: 10000, // 10 segundos
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 segundo
  },
  
  // Mensajes de error
  ERROR_MESSAGES: {
    LOCATION_PERMISSION_DENIED: 'Se requieren permisos de ubicación para usar la aplicación',
    LOCATION_UNAVAILABLE: 'No se pudo obtener la ubicación actual',
    NETWORK_ERROR: 'Error de conexión. Verifica tu internet',
    INVALID_CREDENTIALS: 'Usuario o contraseña incorrectos',
    TOKEN_EXPIRED: 'Sesión expirada. Por favor inicia sesión nuevamente',
    SERVER_ERROR: 'Error del servidor. Intenta más tarde',
  },
  
  // Configuración de UI
  UI: {
    ANIMATION_DURATION: 300,
    TOAST_DURATION: 3000,
    LOADING_DELAY: 500,
  },
} as const;

// Tipos para las constantes
export type AppConfig = typeof APP_CONFIG;
