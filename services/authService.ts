import { apiMiddleware } from '@/middleware/api';
import { locationService } from '@/services/locationService';
import { detectAuthError, formatAuthErrorMessage, AuthError } from '@/constants/authErrors';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  
  // Sistema de reintentos y modo de gracia
  private gracePeriodStart: number | null = null;
  private readonly GRACE_PERIOD_DURATION = 300000; // 5 minutos
  private readonly GPS_TIMEOUT = 10000; // 10 segundos
  private readonly GPS_TIMEOUT_FROM_BACKGROUND = 15000; // 15 segundos
  private readonly GPS_MAX_RETRIES = 3;
  private readonly LAST_LOCATION_MAX_AGE = 120000; // 2 minutos
  private locationWarningCallback: ((message: string) => void) | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Método para configurar callback de advertencias
  setLocationWarningCallback(callback: (message: string) => void): void {
    this.locationWarningCallback = callback;
  }

  // Obtener ubicación con reintentos inteligentes
  private async getLocationWithRetries(
    fromBackground: boolean = false,
    maxRetries: number = this.GPS_MAX_RETRIES
  ): Promise<{ latitude: number; longitude: number } | null> {
    const timeout = fromBackground ? this.GPS_TIMEOUT_FROM_BACKGROUND : this.GPS_TIMEOUT;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[AUTH/LOCATION] Intento ${attempt}/${maxRetries} de obtener GPS (timeout: ${timeout}ms)...`);
        
        const location = await Promise.race([
          locationService.getCurrentLocation(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('GPS timeout')), timeout)
          )
        ]);
        
        console.log('[AUTH/LOCATION] ✅ Ubicación obtenida exitosamente:', location);
        
        // Guardar como última ubicación conocida con timestamp
        await AsyncStorage.setItem('last_location', JSON.stringify({
          ...location,
          timestamp: Date.now()
        }));
        
        // Limpiar modo de gracia si estaba activo
        if (this.gracePeriodStart) {
          console.log('[AUTH/GRACE] ✅ Ubicación recuperada, saliendo del modo de gracia');
          this.gracePeriodStart = null;
        }
        
        return location;
      } catch (error: any) {
        console.warn(`[AUTH/LOCATION] ⚠️ Intento ${attempt} falló:`, error.message);
        
        // Si es el último intento, manejar el error
        if (attempt === maxRetries) {
          return null;
        }
        
        // Esperar un poco antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return null;
  }

  // Verificar si estamos en modo de gracia
  private isInGracePeriod(): boolean {
    if (!this.gracePeriodStart) return false;
    
    const elapsed = Date.now() - this.gracePeriodStart;
    const remaining = this.GRACE_PERIOD_DURATION - elapsed;
    
    if (remaining <= 0) {
      console.log('[AUTH/GRACE] ⏰ Modo de gracia expirado');
      return false;
    }
    
    console.log(`[AUTH/GRACE] En modo de gracia: ${Math.round(remaining / 1000)}s restantes`);
    return true;
  }

  // Iniciar modo de gracia
  private startGracePeriod(): void {
    if (this.gracePeriodStart) return; // Ya está en modo de gracia
    
    this.gracePeriodStart = Date.now();
    const minutes = Math.round(this.GRACE_PERIOD_DURATION / 60000);
    
    const warningMessage = `⚠️ No se puede obtener tu ubicación. Verifica tu GPS. Sesión cerrará en ${minutes} minutos.`;
    console.warn('[AUTH/GRACE] ⚠️ Iniciando modo de gracia:', warningMessage);
    
    if (this.locationWarningCallback) {
      this.locationWarningCallback(warningMessage);
    }
  }

  // Obtener última ubicación conocida (solo si es reciente)
  private async getLastKnownLocation(): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const lastLocationStr = await AsyncStorage.getItem('last_location');
      if (!lastLocationStr) return null;
      
      const lastLocation = JSON.parse(lastLocationStr);
      const age = Date.now() - lastLocation.timestamp;
      
      if (age > this.LAST_LOCATION_MAX_AGE) {
        console.log(`[AUTH/LOCATION] ⚠️ Última ubicación muy antigua (${Math.round(age / 1000)}s)`);
        return null;
      }
      
      console.log(`[AUTH/LOCATION] Usando última ubicación conocida (${Math.round(age / 1000)}s de antigüedad)`);
      return { latitude: lastLocation.latitude, longitude: lastLocation.longitude };
    } catch (error) {
      return null;
    }
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
        await apiMiddleware.setAuthToken(response.data.access);
        
        // Guardar refresh token
        this.currentRefreshToken = response.data.refresh;
        await AsyncStorage.setItem('refresh_token', response.data.refresh);
        
        // Guardar datos del usuario
        await AsyncStorage.setItem('user_data', JSON.stringify({
          username: credentials.username,
          market_name: response.data.market_name,
          login_time: response.data.login_time,
        }));
        
        console.log('[AUTH/LOGIN] Tokens y datos guardados en AsyncStorage');
        
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
        
        // Formatear mensaje con sugerencias
        const formattedMessage = formatAuthErrorMessage(authError, false);
        
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
      
      const formattedMessage = formatAuthErrorMessage(authError, false);
      
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
        // Obtener ubicación GPS con timeout
        location = await Promise.race([
          locationService.getQuickLocation(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout de ubicación')), 5000)
          )
        ]);
        console.log('[AUTH/LOCATION] Ubicación GPS obtenida:', location);
      } catch (locationError) {
        console.error('[AUTH/LOCATION] No se pudo obtener ubicación GPS');
        return {
          success: false,
          message: 'No se pudo obtener tu ubicación. Verifica que el GPS esté activado y los permisos estén otorgados.',
        };
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
    
    // Guardar refresh token en AsyncStorage
    AsyncStorage.setItem('refresh_token', refreshToken);

    // Configurar nuevo timer
    this.refreshTimer = setInterval(async () => {
      try {
        // Obtener refresh token actual (puede haber sido actualizado)
        const storedRefreshToken = await AsyncStorage.getItem('refresh_token');
        if (!storedRefreshToken) {
          console.warn('[AUTH/REFRESH] No hay refresh token, deteniendo...');
          if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
          }
          return;
        }
        
        console.log('[AUTH/REFRESH] Ejecutando refresh automático del token...');
        const result = await this.refreshToken(storedRefreshToken);
        
        // Solo hacer logout si es error FATAL (401, 403, fuera de rango)
        // Los errores temporales (GPS, red) solo generan warnings
        if (!result.success) {
          const statusCode = (result as any).statusCode;
          
          if (statusCode === 401 || statusCode === 403) {
            console.error('[AUTH/REFRESH] ❌ Error FATAL en refresh automático, sesión terminada');
            // El forceLogout ya fue ejecutado dentro de refreshToken
          } else {
            console.warn('[AUTH/REFRESH] ⚠️ Error temporal en refresh automático, reintentando en próximo ciclo');
            // NO hacer logout, seguir intentando
          }
        }
      } catch (error) {
        console.error('[AUTH/REFRESH] Excepción en refresh automático:', error);
        // Para excepciones inesperadas, solo advertir (no hacer logout por error de red temporal)
        console.warn('[AUTH/REFRESH] ⚠️ Excepción temporal, reintentando en próximo ciclo');
      }
    }, this.refreshInterval);
  }

  // Refresh del token con ubicación actual usando la API real de KCH Digital
  async refreshToken(refreshToken?: string, fromBackground: boolean = false): Promise<AuthResponseWithLocation> {
    try {
      const currentRefreshToken = refreshToken || this.currentRefreshToken || await AsyncStorage.getItem('refresh_token');
      if (!currentRefreshToken) {
        console.error('[AUTH/REFRESH] No hay refresh token disponible');
        return {
          success: false,
          message: 'No hay sesión activa para refrescar',
        };
      }

      console.log('[AUTH/REFRESH] Refrescando token...');

      // Intentar obtener ubicación con reintentos
      let coordinates = await this.getLocationWithRetries(fromBackground);
      
      // Si falló, verificar si estamos en modo de gracia
      if (!coordinates) {
        console.warn('[AUTH/REFRESH] ⚠️ No se pudo obtener ubicación GPS');
        
        // Si estamos en modo de gracia, intentar usar última ubicación
        if (this.isInGracePeriod()) {
          coordinates = await this.getLastKnownLocation();
          if (coordinates) {
            console.log('[AUTH/REFRESH] Usando última ubicación en modo de gracia');
          }
        }
        
        // Si aún no hay coordenadas, iniciar o verificar modo de gracia
        if (!coordinates) {
          if (!this.gracePeriodStart) {
            // Iniciar modo de gracia
            this.startGracePeriod();
            // Intentar con última ubicación conocida por esta vez
            coordinates = await this.getLastKnownLocation();
          } else if (!this.isInGracePeriod()) {
            // Modo de gracia expirado
            console.error('[AUTH/REFRESH] Modo de gracia expirado, forzando logout');
            await this.forceLogout('No se pudo verificar tu ubicación durante 5 minutos. Sesión cerrada.');
            return {
              success: false,
              message: 'Sesión cerrada por falta de ubicación GPS',
              statusCode: 403,
            } as any;
          }
        }
        
        // Si definitivamente no hay coordenadas, retornar error
        if (!coordinates) {
          console.error('[AUTH/REFRESH] No hay ubicación disponible para refresh');
          return {
            success: false,
            message: 'No se pudo obtener tu ubicación. Verifica que el GPS esté activado.',
          };
        }
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
        await apiMiddleware.setAuthToken(response.data.access);
        
        // Guardar nuevo refresh token
        this.currentRefreshToken = response.data.refresh;
        await AsyncStorage.setItem('refresh_token', response.data.refresh);
        
        // Actualizar datos del usuario
        await AsyncStorage.setItem('user_data', JSON.stringify({
          market_name: response.data.market_name,
          login_time: response.data.login_time,
        }));
        
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
        // Clasificar errores: FATAL vs TEMPORAL
        const errorData = response as any;
        const statusCode = response.statusCode || 0;
        let errorMessage = 'Error al refrescar token';
        let isFatalError = false;
        
        // Errores FATALES que requieren logout inmediato
        if (statusCode === 401 || statusCode === 403) {
          isFatalError = true;
          errorMessage = 'Sesión expirada. Por favor inicia sesión nuevamente.';
          console.error('[AUTH/REFRESH] ❌ Error FATAL: Token inválido (', statusCode, ')');
        } else if (errorData.non_field_errors) {
          const errorText = errorData.non_field_errors[0] || '';
          
          // Usuario fuera del rango del mercado - FATAL
          if (errorText.includes('not near any market') || errorText.includes('Refresh denied')) {
            isFatalError = true;
            errorMessage = 'Has salido del área del mercado. Debes estar a menos de 500 metros de un mercado registrado.';
            console.error('[AUTH/REFRESH] ❌ Error FATAL: Usuario fuera del rango de proximidad');
          } 
          // Token inválido o expirado - FATAL
          else if (errorText.includes('invalid') || errorText.includes('expired')) {
            isFatalError = true;
            errorMessage = 'Sesión expirada. Por favor inicia sesión nuevamente.';
            console.error('[AUTH/REFRESH] ❌ Error FATAL: Token inválido o expirado');
          } 
          // Otros errores del servidor
          else {
            errorMessage = errorText;
          }
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }
        
        // Si es error fatal, hacer logout inmediato
        if (isFatalError) {
          console.error('[AUTH/REFRESH] Ejecutando logout por error fatal');
          await this.forceLogout(errorMessage);
        } else {
          // Error temporal, solo loguear advertencia
          console.warn('[AUTH/REFRESH] ⚠️ Error TEMPORAL:', errorMessage, '- Reintentando en próximo ciclo');
        }
        
        return {
          success: false,
          message: errorMessage,
          statusCode: statusCode,
        } as any;
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
      // Limpiar tokens y datos
      await apiMiddleware.clearAuthToken();
      this.currentRefreshToken = null;
      this.onTokenRefreshCallback = null;
      this.gracePeriodStart = null;
      
      // Limpiar AsyncStorage
      await AsyncStorage.multiRemove([
        'auth_token',
        'refresh_token',
        'user_data',
        'last_location'
      ]);
      
      console.log('[AUTH/LOGOUT] Tokens y datos limpiados');
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
    await apiMiddleware.clearAuthToken();
    this.currentRefreshToken = null;
    this.onTokenRefreshCallback = null;
    this.gracePeriodStart = null;
    
    // Limpiar AsyncStorage
    await AsyncStorage.multiRemove([
      'auth_token',
      'refresh_token',
      'user_data',
      'last_location'
    ]);

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
