import { apiMiddleware } from '@/middleware/api';
import { locationService } from '@/services/locationService';
import { isDevelopmentMode, shouldBypassLocation, getTestLocation } from '@/config/dev.config';
import { detectAuthError, formatAuthErrorMessage, AuthError } from '@/constants/authErrors';
import { 
  LoginWithLocationCredentials, 
  AuthResponseWithLocation, 
  KCHAuthResponse, 
  KCHRefreshPayload,
  KCHErrorResponse 
} from '@/types/location';

class AuthService {
  private static instance: AuthService;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private refreshInterval: number = 120000; // 2 minutos para ser más ágil
  private onTokenRefreshCallback: ((token: string) => void) | null = null;
  private currentRefreshToken: string | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Login con geolocalización usando la API real de KCH Digital
  async loginWithLocation(credentials: LoginWithLocationCredentials): Promise<AuthResponseWithLocation> {
    try {
      console.log('[AUTH/LOGIN] Iniciando login con ubicación:', {
        username: credentials.username,
        latitude: credentials.latitude,
        longitude: credentials.longitude
      });

      const response = await apiMiddleware.post<KCHAuthResponse>('/api/token/', {
        username: credentials.username,
        password: credentials.password,
        latitude: credentials.latitude,
        longitude: credentials.longitude,
      });

      // Log completo de la respuesta para debugging
      console.log('[AUTH/LOGIN] Respuesta del servidor:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        console.log('[AUTH/LOGIN] Login exitoso:', {
          market: response.data.market_name,
          login_time: response.data.login_time
        });

        // Guardar tokens en el middleware (usar access token como bearer)
        apiMiddleware.setAuthToken(response.data.access);
        
        // Guardar refresh token
        this.currentRefreshToken = response.data.refresh;
        
        // Configurar refresh automático cada 2 minutos
        this.refreshInterval = 120000; // 2 minutos para ser más ágil
        this.startTokenRefresh(response.data.refresh);
        
        return {
          success: true,
          access: response.data.access,
          refresh: response.data.refresh,
          market_name: response.data.market_name,
          login_time: response.data.login_time,
          user: {
            id: credentials.username, // Usar username como ID
            username: credentials.username,
            name: credentials.username,
            market_name: response.data.market_name,
            login_time: response.data.login_time,
          },
          message: `Inicio de sesión exitoso en ${response.data.market_name}`,
        };
      } else {
        // Detectar y formatear error usando el nuevo sistema
        const errorData = response as any;
        const serverMessage = response.error || errorData.detail || (errorData.non_field_errors && errorData.non_field_errors[0]);
        
        console.log('[AUTH/LOGIN] Error del servidor:', {
          error: response.error,
          statusCode: response.statusCode,
          non_field_errors: errorData.non_field_errors,
          detail: errorData.detail
        });
        
        // Detectar tipo de error
        const authError = detectAuthError(
          response.statusCode,
          serverMessage,
          {
            latitude: credentials.latitude,
            longitude: credentials.longitude
          }
        );
        
        console.warn('[AUTH/LOGIN] Login failed:', {
          code: authError.code,
          title: authError.title,
          statusCode: authError.statusCode
        });
        
        // En modo desarrollo, mostrar información adicional
        if (isDevelopmentMode()) {
          console.log('[DEV] Error details:', authError.technicalDetails);
          console.log('[DEV] Suggestions:', authError.suggestions);
        }
        
        // Formatear mensaje con sugerencias
        const formattedMessage = formatAuthErrorMessage(authError, isDevelopmentMode());
        
        return {
          success: false,
          message: formattedMessage,
          error: authError, // Incluir objeto de error completo para el frontend
        } as any;
      }
    } catch (error: any) {
      console.error('[AUTH/LOGIN] Excepción en login:', error);
      
      // Detectar error de red o excepción
      const authError = detectAuthError(
        undefined,
        error.message || 'Error de conexión'
      );
      
      const formattedMessage = formatAuthErrorMessage(authError, isDevelopmentMode());
      
      return {
        success: false,
        message: formattedMessage,
        error: authError,
      } as any;
    }
  }
  // Login automático con ubicación actual
  async login(username: string, password: string): Promise<AuthResponseWithLocation> {
    try {
      console.log('[AUTH] Iniciando login optimizado para', username);
      
      // Validaciones básicas
      if (!username || username.length < 3) {
        return {
          success: false,
          message: 'El nombre de usuario debe tener al menos 3 caracteres',
        };
      }
      
      if (!password || password.length < 4) {
        return {
          success: false,
          message: 'La contraseña debe tener al menos 4 caracteres',
        };
      }
      
      // Intentar obtener ubicación rápidamente
      console.log('[AUTH/LOCATION] Obteniendo ubicación GPS...');
      
      let location: any;
      try {
        // En modo desarrollo con bypass, usar ubicación de prueba
        if (shouldBypassLocation()) {
          location = {
            ...getTestLocation(),
            timestamp: Date.now()
          };
          console.log('[DEV] Using test location (bypass enabled):', location);
        } else {
          // Usar método rápido de ubicación con timeout corto
          location = await Promise.race([
            locationService.getQuickLocation(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout de ubicación')), 3000)
            )
          ]);
          console.log('[AUTH/LOCATION] Ubicación GPS obtenida:', location);
        }
      } catch (locationError) {
        console.warn('[AUTH/LOCATION] No se pudo obtener ubicación GPS, usando ubicación por defecto');
        // Usar ubicación por defecto
        location = {
          ...getTestLocation(),
          timestamp: Date.now()
        };
        
        if (isDevelopmentMode()) {
          console.log('[DEV] GPS failed, using default test location. Update config/dev.config.ts if needed.');
        }
      }
      
      // Hacer login con ubicación
      return await this.loginWithLocation({
        username,
        password,
        latitude: location.latitude,
        longitude: location.longitude,
      });
    } catch (error: any) {
      console.error('[AUTH] Error en login:', error);
      return {
        success: false,
        message: error.message || 'Error al hacer login',
      };
    }
  }

  // Iniciar refresh automático del token
  private startTokenRefresh(refreshToken: string): void {
    // Limpiar timer anterior si existe
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    console.log(`[AUTH/REFRESH] Configurando refresh automático cada ${this.refreshInterval / 1000} segundos`);

    // Configurar nuevo timer
    this.refreshTimer = setInterval(async () => {
      try {
        console.log('[AUTH/REFRESH] Ejecutando refresh automático del token...');
        const result = await this.refreshToken(refreshToken);
        
        if (!result.success) {
          console.error('[AUTH/REFRESH] Refresh automático falló, iniciando logout...');
          // Si el refresh falla, hacer logout inmediato
          await this.forceLogout('Sesión expirada. Por favor inicia sesión nuevamente.');
        }
      } catch (error) {
        console.error('[AUTH/REFRESH] Error en refresh automático:', error);
        // En caso de error, hacer logout inmediato
        await this.forceLogout('Error al refrescar la sesión. Por favor inicia sesión nuevamente.');
      }
    }, this.refreshInterval);
  }

  // Refresh del token con ubicación actual usando la API real de KCH Digital
  async refreshToken(refreshToken?: string): Promise<AuthResponseWithLocation> {
    try {
      const currentRefreshToken = refreshToken || this.currentRefreshToken;
      if (!currentRefreshToken) {
        console.error('[AUTH/REFRESH] No hay refresh token disponible');
        return {
          success: false,
          message: 'No hay sesión activa para refrescar',
        };
      }

      console.log('[AUTH/REFRESH] Refrescando token...');

      // Obtener ubicación actual con validación
      let coordinates;
      try {
        coordinates = await locationService.getCurrentLocation();
        console.log('[AUTH/REFRESH] Ubicación obtenida para refresh:', {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude
        });
      } catch (locationError) {
        console.error('[AUTH/REFRESH] Error obteniendo ubicación para refresh:', locationError);
        return {
          success: false,
          message: 'No se pudo obtener tu ubicación. Verifica que los permisos GPS estén activados.',
        };
      }
      
      const refreshPayload: KCHRefreshPayload = {
        refresh: currentRefreshToken,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };

      const response = await apiMiddleware.post<KCHAuthResponse>('/api/token/refresh/', refreshPayload);

      if (response.success && response.data) {
        console.log('[AUTH/REFRESH] Token refrescado exitosamente:', {
          market: response.data.market_name,
          login_time: response.data.login_time
        });

        // Actualizar access token en el middleware
        apiMiddleware.setAuthToken(response.data.access);
        
        // Guardar nuevo refresh token
        this.currentRefreshToken = response.data.refresh;
        
        // Notificar al callback si existe
        if (this.onTokenRefreshCallback) {
          this.onTokenRefreshCallback(response.data.access);
        }
        
        return {
          success: true,
          access: response.data.access,
          refresh: response.data.refresh,
          market_name: response.data.market_name,
          login_time: response.data.login_time,
          message: `Token refrescado exitosamente en ${response.data.market_name}`,
        };
      } else {
        // Manejar errores específicos de la API
        const errorData = response as any;
        let errorMessage = 'Error al refrescar token';
        
        // Validación específica de proximidad en refresh
        if (errorData.non_field_errors) {
          const errorText = errorData.non_field_errors[0] || '';
          
          if (errorText.includes('not near any market') || errorText.includes('Refresh denied')) {
            errorMessage = 'Has salido del área del mercado. Debes estar a menos de 500 metros de un mercado registrado.';
            console.warn('[AUTH/REFRESH] Usuario fuera del rango de proximidad en refresh');
          } else if (errorText.includes('invalid') || errorText.includes('expired')) {
            errorMessage = 'Sesión expirada. Por favor inicia sesión nuevamente.';
            console.warn('[AUTH/REFRESH] Refresh token inválido o expirado');
          } else {
            errorMessage = errorText;
          }
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }
        
        console.error('[AUTH/REFRESH] Error en refresh:', errorMessage);
        
        return {
          success: false,
          message: errorMessage,
        };
      }

    } catch (error: any) {
      console.error('[AUTH/REFRESH] Excepción en refresh token:', error);
      
      let errorMessage = 'Error al refrescar token';
      
      if (error.message?.includes('Network')) {
        errorMessage = 'Error de red. Verifica tu conexión a internet.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  // Configurar callback para cuando se refresque el token
  setTokenRefreshCallback(callback: (token: string) => void): void {
    this.onTokenRefreshCallback = callback;
  }

  // Logout del usuario
  async logout(): Promise<void> {
    try {
      console.log('[AUTH/LOGOUT] Iniciando logout...');

      // Detener refresh timer
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }

      // Detener monitoreo de ubicación
      locationService.stopWatching();

      // Llamar al endpoint de logout si existe
      const currentToken = apiMiddleware.getAuthToken();
      if (currentToken) {
        await apiMiddleware.post('/auth/logout', {
          bearer_token: currentToken,
          timestamp: Date.now(),
        }, true);
      }

      console.log('[AUTH/LOGOUT] Logout exitoso');
    } catch (error) {
      // Continuar con logout local aunque falle el servidor
      console.warn('[AUTH/LOGOUT] Error al hacer logout en servidor:', error);
    } finally {
      // Limpiar token local
      apiMiddleware.clearAuthToken();
      this.currentRefreshToken = null;
      this.onTokenRefreshCallback = null;
    }
  }

  // Logout forzado (para cuando falla el refresh automático)
  async forceLogout(reason?: string): Promise<void> {
    console.error('[AUTH/LOGOUT] Logout forzado -', reason || 'Sesión inválida');

    // Notificar al callback antes de limpiar
    if (this.onTokenRefreshCallback) {
      try {
        this.onTokenRefreshCallback('');
      } catch (e) {
        console.warn('Error notificando callback:', e);
      }
    }

    // Detener refresh timer inmediatamente
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Detener monitoreo de ubicación
    locationService.stopWatching();

    // Limpiar todo sin intentar llamar al servidor
    apiMiddleware.clearAuthToken();
    this.currentRefreshToken = null;
    this.onTokenRefreshCallback = null;

    console.log('[AUTH/LOGOUT] Logout forzado completado');
  }

  // Verificar si el token está activo
  isTokenActive(): boolean {
    return apiMiddleware.getAuthToken() !== null && this.refreshTimer !== null;
  }

  // Obtener información del refresh
  getRefreshInfo(): { interval: number; isActive: boolean } {
    return {
      interval: this.refreshInterval,
      isActive: this.refreshTimer !== null,
    };
  }

  // Verificar token actual con ubicación
  async verifyToken(): Promise<AuthResponseWithLocation> {
    try {
      const token = apiMiddleware.getAuthToken();
      
      if (!token) {
        return {
          success: false,
          message: 'No hay token de autenticación',
        };
      }

      // Obtener ubicación para verificación
      const coordinates = await locationService.getCurrentLocation();
      
      const response = await apiMiddleware.post<{
        user: {
          id: string;
          username: string;
          name?: string;
          permissions?: string[];
        };
        bearer_token: string;
        expires_in: number;
        refresh_interval: number;
      }>('/auth/verify', {
        bearer_token: token,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        timestamp: Date.now(),
      }, true);

      if (response.success && response.data) {
        // Reiniciar refresh automático
        this.refreshInterval = response.data.refresh_interval || 180000;
        this.startTokenRefresh(response.data.bearer_token);
        
        return {
          success: true,
          user: response.data.user,
          access: response.data.bearer_token,
          refresh: response.data.bearer_token,
          message: 'Token válido',
        };
      } else {
        // Token inválido, limpiar
        apiMiddleware.clearAuthToken();
        return {
          success: false,
          message: 'Token inválido',
        };
      }
    } catch (error: any) {
      apiMiddleware.clearAuthToken();
      return {
        success: false,
        message: error.message || 'Error al verificar token',
      };
    }
  }

  // Recuperar contraseña
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiMiddleware.post('/auth/forgot-password', { email });

      return {
        success: response.success,
        message: response.success 
          ? 'Se ha enviado un enlace de recuperación a tu email'
          : response.error || 'Error al enviar email de recuperación',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Error de conexión',
      };
    }
  }
}

// Exportar instancia singleton
export const authService = AuthService.getInstance();
