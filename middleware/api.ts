import { ApiResponse } from '@/types/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuración base de la API
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://kachaapp.kachadigitalbcn.com';
const API_TIMEOUT = 10000; // 10 segundos

// Tipos de métodos HTTP
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Configuración de request
interface RequestConfig {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  requiresAuth?: boolean;
}

// Storage para el token con AsyncStorage
class TokenStorage {
  private static token: string | null = null;
  private static initialized: boolean = false;

  // Inicializar token desde AsyncStorage al arrancar
  static async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.token = await AsyncStorage.getItem('auth_token');
      this.initialized = true;
      console.log('[TOKEN_STORAGE] Inicializado desde AsyncStorage');
    } catch (error) {
      console.error('[TOKEN_STORAGE] Error al inicializar:', error);
    }
  }

  static async setToken(token: string | null): Promise<void> {
    this.token = token;
    try {
      if (token) {
        await AsyncStorage.setItem('auth_token', token);
        console.log('[TOKEN_STORAGE] Token guardado en AsyncStorage');
      } else {
        await AsyncStorage.removeItem('auth_token');
        console.log('[TOKEN_STORAGE] Token eliminado de AsyncStorage');
      }
    } catch (error) {
      console.error('[TOKEN_STORAGE] Error al guardar token:', error);
    }
  }

  static getToken(): string | null {
    return this.token;
  }

  static async clearToken(): Promise<void> {
    this.token = null;
    try {
      await AsyncStorage.removeItem('auth_token');
      console.log('[TOKEN_STORAGE] Token limpiado');
    } catch (error) {
      console.error('[TOKEN_STORAGE] Error al limpiar token:', error);
    }
  }
}

// Middleware principal para requests
class ApiMiddleware {
  private static instance: ApiMiddleware;

  private constructor() {}

  static getInstance(): ApiMiddleware {
    if (!ApiMiddleware.instance) {
      ApiMiddleware.instance = new ApiMiddleware();
    }
    return ApiMiddleware.instance;
  }

  // Interceptor para requests
  private async interceptRequest(url: string, config: RequestConfig): Promise<RequestConfig> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...config.headers,
    };

    // Agregar token de autenticación si es requerido
    if (config.requiresAuth) {
      const token = TokenStorage.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        throw new Error('Token de autenticación requerido');
      }
    }

    return {
      ...config,
      headers,
    };
  }

  // Interceptor para responses
  private async interceptResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();
      
      // Log para debug
      console.log('📥 API Response:', {
        status: response.status,
        ok: response.ok,
        data
      });

      // Manejar diferentes códigos de estado
      if (response.ok) {
        return {
          success: true,
          data,
          statusCode: response.status,
        };
      } else {
        // Manejar errores específicos - PRESERVAR datos completos del servidor
        let errorMessage = data.message || data.detail || 'Error desconocido';
        
        // Si hay non_field_errors (formato Django REST Framework), usar el primero
        if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
          errorMessage = data.non_field_errors[0] || errorMessage;
        }
        
        // Mensajes por código de estado (solo si no hay mensaje específico)
        if (!data.detail && !data.non_field_errors && !data.message) {
          switch (response.status) {
            case 401:
              errorMessage = 'No autorizado. Por favor inicia sesión nuevamente.';
              // NO limpiar token aquí - dejamos que AuthContext lo maneje
              // TokenStorage.clearToken(); ❌ REMOVIDO
              break;
            case 403:
              errorMessage = 'Acceso denegado.';
              break;
            case 404:
              errorMessage = 'Recurso no encontrado.';
              break;
            case 500:
              errorMessage = 'Error interno del servidor.';
              break;
          }
        }

        // Retornar respuesta con error, INCLUYENDO datos completos
        return {
          success: false,
          error: errorMessage,
          statusCode: response.status,
          // Preservar datos completos del error para análisis posterior
          ...data,
        } as any;
      }
    } catch (error) {
      return {
        success: false,
        error: 'Error al procesar la respuesta del servidor',
        statusCode: response.status,
      };
    }
  }

  // Método principal para hacer requests
  async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const requestConfig = await this.interceptRequest(url, config);

      // Configurar timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout || API_TIMEOUT);

      const fetchConfig: RequestInit = {
        method: requestConfig.method || 'GET',
        headers: requestConfig.headers,
        signal: controller.signal,
      };

      // Agregar body si existe
      if (requestConfig.body && requestConfig.method !== 'GET') {
        fetchConfig.body = JSON.stringify(requestConfig.body);
        // Log para debug
        console.log('🌐 API Request:', {
          url,
          method: requestConfig.method,
          body: requestConfig.body,
          headers: requestConfig.headers
        });
      }

      const response = await fetch(url, fetchConfig);
      clearTimeout(timeoutId);

      return await this.interceptResponse<T>(response);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Tiempo de espera agotado',
        };
      }

      return {
        success: false,
        error: error.message || 'Error de conexión',
      };
    }
  }

  // Métodos de conveniencia
  async get<T>(endpoint: string, requiresAuth = false): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', requiresAuth });
  }

  async post<T>(endpoint: string, data: any, requiresAuth = false): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { 
      method: 'POST', 
      body: data, 
      requiresAuth 
    });
  }

  async put<T>(endpoint: string, data: any, requiresAuth = true): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { 
      method: 'PUT', 
      body: data, 
      requiresAuth 
    });
  }

  async delete<T>(endpoint: string, requiresAuth = true): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', requiresAuth });
  }

  async patch<T>(endpoint: string, data: any, requiresAuth = true): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { 
      method: 'PATCH', 
      body: data, 
      requiresAuth 
    });
  }

  // Métodos para manejo de tokens
  async setAuthToken(token: string): Promise<void> {
    await TokenStorage.setToken(token);
  }

  async clearAuthToken(): Promise<void> {
    await TokenStorage.clearToken();
  }

  getAuthToken(): string | null {
    return TokenStorage.getToken();
  }

  // Inicializar TokenStorage
  async initializeStorage(): Promise<void> {
    await TokenStorage.init();
  }

  getBaseUrl(): string {
    return API_BASE_URL;
  }
}

// Exportar instancia singleton
export const apiMiddleware = ApiMiddleware.getInstance();

// Exportar clase de storage para uso externo si es necesario
export { TokenStorage };
