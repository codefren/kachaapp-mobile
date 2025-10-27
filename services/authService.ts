import { apiMiddleware } from '@/middleware/api';
import { locationService } from '@/services/locationService';
import { 
  LoginWithLocationCredentials, 
  AuthResponseWithLocation, 
  KCHAuthResponse, 
  KCHRefreshPayload,
  KCHErrorResponse 
} from '@/types/location';

class AuthService {
  private static instance: AuthService;
  private refreshTimer: NodeJS.Timeout | null = null;
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
      const response = await apiMiddleware.post<KCHAuthResponse>('/api/token/', {
        username: credentials.username,
        password: credentials.password,
        latitude: credentials.latitude,
        longitude: credentials.longitude,
      });

      if (response.success && response.data) {
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
        // Manejar errores específicos de la API
        const errorData = response as any;
        let errorMessage = 'Error al iniciar sesión';
        
        if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors[0] || errorMessage;
        }
        
        return {
          success: false,
          message: errorMessage,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Error de conexión',
      };
    }
  }
  // Login automático con ubicación actual
  async login(username: string, password: string): Promise<AuthResponseWithLocation> {
    try {
      console.log('AuthService: Iniciando login optimizado para', username);
      
      // Intentar obtener ubicación rápidamente
      console.log('AuthService: Obteniendo ubicación rápida...');
      
      let location: any;
      try {
        // Usar método rápido de ubicación con timeout corto
        location = await Promise.race([
          locationService.getQuickLocation(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout de ubicación')), 2000)
          )
        ]);
      } catch (locationError) {
        console.warn('AuthService: Error o timeout de ubicación, usando ubicación por defecto');
        // Usar ubicación por defecto (Madrid centro como ejemplo)
        location = {
          latitude: 40.4168,
          longitude: -3.7038,
          accuracy: 100,
          timestamp: Date.now()
        };
      }
      
      console.log('AuthService: Ubicación obtenida:', location);
      
      // Hacer login con ubicación
      return await this.loginWithLocation({
        username,
        password,
        latitude: location.latitude,
        longitude: location.longitude,
      });
    } catch (error: any) {
      console.error('AuthService: Error en login:', error);
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

    // Configurar nuevo timer
    this.refreshTimer = setInterval(async () => {
      try {
        await this.refreshToken(refreshToken);
      } catch (error) {
        console.error('Error en refresh automático:', error);
        // En caso de error, intentar logout
        this.logout();
      }
    }, this.refreshInterval);

    console.log(`Token refresh configurado cada ${this.refreshInterval / 1000} segundos`);
  }

  // Refresh del token con ubicación actual usando la API real de KCH Digital
  async refreshToken(refreshToken?: string): Promise<AuthResponseWithLocation> {
    try {
      const currentRefreshToken = refreshToken || this.currentRefreshToken;
      if (!currentRefreshToken) {
        throw new Error('No hay refresh token disponible');
      }

      // Obtener ubicación actual
      const coordinates = await locationService.getCurrentLocation();
      
      const refreshPayload: KCHRefreshPayload = {
        refresh: currentRefreshToken,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };

      const response = await apiMiddleware.post<KCHAuthResponse>('/api/token/refresh/', refreshPayload);

      if (response.success && response.data) {
        // Actualizar access token en el middleware
        apiMiddleware.setAuthToken(response.data.access);
        
        // Guardar nuevo refresh token
        this.currentRefreshToken = response.data.refresh;
        
        // Notificar al callback si existe
        if (this.onTokenRefreshCallback) {
          this.onTokenRefreshCallback(response.data.access);
        }

        console.log(`Token refrescado exitosamente para ${response.data.market_name}`);
        
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
        
        if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors[0] || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

    } catch (error: any) {
      console.error('Error refreshing token:', error);
      return {
        success: false,
        message: error.message || 'Error al refrescar token',
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
    } catch (error) {
      // Continuar con logout local aunque falle el servidor
      console.warn('Error al hacer logout en servidor:', error);
    } finally {
      // Limpiar token local
      apiMiddleware.clearAuthToken();
      this.onTokenRefreshCallback = null;
    }
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
          bearer_token: response.data.bearer_token,
          expires_in: response.data.expires_in,
          refresh_interval: response.data.refresh_interval,
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
