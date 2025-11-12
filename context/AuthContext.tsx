import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponseWithLocation, Coordinates } from '@/types/location';
import { authService } from '@/services/authService';
import { locationService } from '@/services/locationService';
import { apiMiddleware } from '@/middleware/api';
import { clearSavedRoute } from '@/hooks/useNavigationPersistence';

// Tipos para el usuario con geolocalización
interface UserWithLocation {
  id: string;
  username: string;
  name?: string;
  market_name?: string;
  login_time?: string;
  lastLocation?: Coordinates;
}

// Estado de autenticación con geolocalización
interface AuthStateWithLocation {
  user: UserWithLocation | null;
  accessToken: string | null;
  refreshToken: string | null;
  marketName: string | null;
  loginTime: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean; // Indica si la app ya terminó de inicializarse
  refreshInterval: number;
  isRefreshActive: boolean;
  lastLocation: Coordinates | null;
}

// Tipos para las acciones del reducer
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { 
      user: UserWithLocation; 
      accessToken: string; 
      refreshToken: string;
      marketName: string;
      loginTime: string;
    } }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'TOKEN_REFRESHED'; payload: { accessToken: string; refreshToken: string } }
  | { type: 'UPDATE_LOCATION'; payload: Coordinates }
  | { type: 'SET_REFRESH_STATUS'; payload: boolean };

// Estado inicial
const initialState: AuthStateWithLocation = {
  user: null,
  accessToken: null,
  refreshToken: null,
  marketName: null,
  loginTime: null,
  isLoading: false,
  isAuthenticated: false,
  isInitialized: false, // Empieza false hasta que termine la inicialización
  refreshInterval: 180000, // 3 minutos
  isRefreshActive: false,
  lastLocation: null,
};

// Reducer para manejar el estado de autenticación
function authReducer(state: AuthStateWithLocation, action: AuthAction): AuthStateWithLocation {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    
    case 'SET_INITIALIZED':
      return {
        ...state,
        isInitialized: action.payload,
      };
    
    case 'LOGIN_SUCCESS':
      console.log('[AUTH] LOGIN_SUCCESS ejecutado');
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        marketName: action.payload.marketName,
        loginTime: action.payload.loginTime,
        isAuthenticated: true,
        isRefreshActive: true,
        isLoading: false,
      };
    
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        marketName: null,
        loginTime: null,
        isLoading: false,
        isAuthenticated: false,
        isRefreshActive: false,
      };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        marketName: null,
        loginTime: null,
        isLoading: false,
        isAuthenticated: false,
        isRefreshActive: false,
        lastLocation: null,
        // IMPORTANTE: Mantener isInitialized en true para no mostrar preloader de nuevo
        isInitialized: true,
      };
    
    case 'TOKEN_REFRESHED':
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
      };
    
    case 'UPDATE_LOCATION':
      return {
        ...state,
        lastLocation: action.payload,
        user: state.user ? {
          ...state.user,
          lastLocation: action.payload,
        } : null,
      };
    
    case 'SET_REFRESH_STATUS':
      return {
        ...state,
        isRefreshActive: action.payload,
      };
    
    default:
      return state;
  }
}

// Tipo para el contexto con geolocalización
interface AuthContextType {
  // Estado
  state: AuthStateWithLocation;
  
  // Acciones de autenticación
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string; error?: any }>;
  logout: () => Promise<void>;
  verifyToken: () => Promise<void>;
  
  // Acciones de ubicación
  updateLocation: (coordinates: Coordinates) => void;
  getCurrentLocation: () => Promise<Coordinates | null>;
  
  // Información del refresh
  getRefreshInfo: () => { interval: number; isActive: boolean };
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props del provider
interface AuthProviderProps {
  children: ReactNode;
}

// Provider del contexto
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const appStateRef = useRef(AppState.currentState);

  console.log('[AUTH] Estado actual:', {
    isAuthenticated: state.isAuthenticated,
    isInitialized: state.isInitialized,
    hasToken: !!state.accessToken,
    tokenLength: state.accessToken?.length || 0,
    user: state.user?.username,
    marketName: state.marketName
  });

  // Log para detectar si el provider se remonta
  useEffect(() => {
    console.log('[AUTH] 🔶 AuthProvider montado');
    return () => {
      console.log('[AUTH] 🔴 AuthProvider desmontado');
    };
  }, []);

  // Inicializar AsyncStorage y restaurar sesión al iniciar la app
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[AUTH] Inicializando autenticación...');
      
      try {
        // Verificar si ya se inicializó previamente (para evitar preloader en reinicios)
        const wasInitialized = await AsyncStorage.getItem('app_initialized');
        if (wasInitialized === 'true') {
          console.log('[AUTH] ✨ App ya fue inicializada previamente, saltando preloader');
          dispatch({ type: 'SET_INITIALIZED', payload: true });
        }
        
        // Inicializar TokenStorage
        await apiMiddleware.initializeStorage();
        console.log('[AUTH] TokenStorage inicializado');
        
        // Intentar restaurar sesión existente
        const authToken = await AsyncStorage.getItem('auth_token');
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        const userDataStr = await AsyncStorage.getItem('user_data');
        
        if (authToken && refreshToken && userDataStr) {
          console.log('[AUTH] Tokens encontrados, restaurando sesión...');
          
          try {
            const userData = JSON.parse(userDataStr);
            
            // Restaurar sesión directamente desde AsyncStorage
            // NO hacer refresh aquí - dejamos que el sistema automático lo maneje
            console.log('[AUTH] ✅ Sesión restaurada desde AsyncStorage');
            
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: {
                user: {
                  id: userData.username || 'unknown',
                  username: userData.username || 'unknown',
                  market_name: userData.market_name,
                  login_time: userData.login_time,
                },
                accessToken: authToken,
                refreshToken: refreshToken,
                marketName: userData.market_name || '',
                loginTime: userData.login_time || '',
              },
            });
            
            // Iniciar tracking de ubicación
            setTimeout(() => {
              startLocationTracking();
            }, 100);
            
            // Hacer refresh en segundo plano (sin bloquear la restauración)
            // Si falla, el sistema de refresh automático lo manejará
            setTimeout(async () => {
              console.log('[AUTH] Validando sesión en segundo plano...');
              const result = await authService.refreshToken(refreshToken, true);
              
              if (result.success && result.access) {
                console.log('[AUTH] ✅ Sesión validada correctamente');
                // Actualizar con los nuevos tokens
                dispatch({
                  type: 'TOKEN_REFRESHED',
                  payload: {
                    accessToken: result.access,
                    refreshToken: result.refresh || refreshToken,
                  },
                });
              } else {
                // Solo limpiar si es error 401 (token definitivamente inválido)
                const statusCode = (result as any).statusCode;
                if (statusCode === 401) {
                  console.error('[AUTH] ❌ Token inválido (401), cerrando sesión');
                  dispatch({ type: 'LOGOUT' });
                  await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user_data', 'last_location']);
                } else {
                  console.warn('[AUTH] ⚠️ Error temporal al validar (código:', statusCode, '), manteniendo sesión');
                  // No hacer nada, el refresh automático seguirá intentando
                }
              }
            }, 1000); // Esperar 1 segundo antes de validar
            
          } catch (error) {
            console.error('[AUTH] Error parseando datos de usuario:', error);
            // Solo limpiar si hay corrupción de datos
            await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user_data', 'last_location']);
          }
        } else {
          console.log('[AUTH] No hay sesión guardada');
        }
      } catch (error) {
        console.error('[AUTH] Error inicializando autenticación:', error);
      } finally {
        // Marcar como inicializado SIEMPRE, haya o no sesión
        dispatch({ type: 'SET_INITIALIZED', payload: true });
        // Guardar en AsyncStorage para que persista en reinicios
        await AsyncStorage.setItem('app_initialized', 'true');
        console.log('[AUTH] ✅ Inicialización completada y guardada');
      }
    };
    
    initializeAuth();
  }, []); // Solo al montar

  // Configurar callback para refresh de token y logout automático
  useEffect(() => {
    authService.setTokenRefreshCallback((newAccessToken: string) => {
      // Si el token está vacío, significa que hubo un logout forzado
      if (!newAccessToken || newAccessToken === '') {
        console.error('[AUTH] Token inválido recibido, ejecutando logout automático');
        dispatch({ type: 'LOGOUT' });
        // Mostrar alerta al usuario
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            alert('⚠️ Sesión expirada. Por favor inicia sesión nuevamente.');
          }, 100);
        }
        return;
      }

      // Token válido, actualizar
      dispatch({
        type: 'TOKEN_REFRESHED',
        payload: { 
          accessToken: newAccessToken,
          refreshToken: state.refreshToken || '' // Mantener el refresh token actual
        },
      });
    });
  }, [state.refreshToken]);

  // AppState listener - Refrescar token cuando vuelve del background
  useEffect(() => {
    
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;
      
      // Solo actuar cuando la app pasa de background/inactive a active
      if (previousAppState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[AUTH] 🔄 App volvió a foreground desde', previousAppState);
        
        // Verificar si hay sesión activa
        const authToken = await AsyncStorage.getItem('auth_token');
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        
        if (!authToken || !refreshToken) {
          console.log('[AUTH] ⚠️ No hay tokens guardados, sesión no activa');
          return;
        }
        
        console.log('[AUTH] Verificando validez de la sesión...');
        
        try {
          // Hacer refresh inmediato con timeout extendido (desde background)
          const result = await authService.refreshToken(refreshToken, true);
          
          if (result.success && result.access) {
            console.log('[AUTH] ✅ Token refrescado exitosamente al volver');
            
            // Actualizar token en contexto
            dispatch({
              type: 'TOKEN_REFRESHED',
              payload: {
                accessToken: result.access,
                refreshToken: result.refresh || refreshToken,
              },
            });
          } else {
            // Solo cerrar sesión si el error es definitivamente de autenticación
            const statusCode = (result as any).statusCode;
            
            if (statusCode === 401) {
              console.error('[AUTH] ❌ Token expirado, cerrando sesión');
              dispatch({ type: 'LOGOUT' });
              await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user_data', 'last_location']);
            } else if (statusCode === 403) {
              console.warn('[AUTH] ⚠️ Usuario fuera de rango, manteniendo sesión pero mostrando advertencia');
              // NO cerrar sesión, solo advertir al usuario
            } else {
              console.warn('[AUTH] ⚠️ Error temporal al volver (código:', statusCode, '), manteniendo sesión');
            }
          }
        } catch (error) {
          console.error('[AUTH] Error verificando token al volver:', error);
          // No cerrar sesión en caso de error de red
          console.log('[AUTH] Manteniendo sesión a pesar del error');
        }
      }
    });

    return () => subscription.remove();
  }, []); // Sin dependencias para evitar recreaciones

  // Función para login con geolocalización
  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string; error?: any }> => {
    console.log('[AUTH] Iniciando login para', username);
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await authService.login(username, password);
      console.log('[AUTH] Respuesta del servicio:', response);

      if (response.success && response.user && response.access) {
        const userWithLocation: UserWithLocation = {
          id: response.user.id,
          username: response.user.username,
          name: response.user.name,
          market_name: response.user.market_name,
          login_time: response.user.login_time,
        };

        console.log('[AUTH] Login exitoso, confirmando ubicación automáticamente');
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: userWithLocation,
            accessToken: response.access,
            refreshToken: response.refresh || '',
            marketName: response.market_name || '',
            loginTime: response.login_time || '',
          },
        });

        // Iniciar tracking de ubicación automáticamente
        setTimeout(() => {
          startLocationTracking();
        }, 100);

        return {
          success: true,
          message: response.message,
        };
      } else {
        console.log('[AUTH] Login fallido -', response.message);
        dispatch({ type: 'LOGIN_FAILURE' });
        
        // Pasar el objeto error completo del authService
        return {
          success: false,
          message: response.message || 'Error al iniciar sesión',
          error: (response as any).error, // Pasar el objeto AuthError completo
        };
      }
    } catch (error: any) {
      console.log('[AUTH] Error en login:', error);
      dispatch({ type: 'LOGIN_FAILURE' });
      return {
        success: false,
        message: error.message || 'Error de conexión. Verifica tu internet.',
        error: error,
      };
    }
  };

  // Función para logout
  const logout = async (): Promise<void> => {
    console.log('[AUTH] Iniciando logout...');
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      await authService.logout();
      stopLocationTracking();
      // Limpiar flag de confirmación de dashboard
      await AsyncStorage.removeItem('dashboard_confirmed');
      console.log('[AUTH] Flag de dashboard limpiado');
      // Limpiar ruta de navegación guardada
      await clearSavedRoute();
    } catch (error) {
      console.warn('[AUTH] Error durante logout:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Función para verificar token
  const verifyToken = async (): Promise<void> => {
    console.log('[AUTH] Verificando token existente');
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await authService.verifyToken();
      console.log('[AUTH] Respuesta de verificación:', response);

      if (response.success && response.user && response.access) {
        const userWithLocation: UserWithLocation = {
          id: response.user.id,
          username: response.user.username,
          name: response.user.name,
          market_name: response.user.market_name,
          login_time: response.user.login_time,
        };

        console.log('[AUTH] Token válido, restaurando sesión');
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: userWithLocation,
            accessToken: response.access,
            refreshToken: response.refresh || '',
            marketName: response.market_name || '',
            loginTime: response.login_time || '',
          },
        });

        // Iniciar monitoreo de ubicación
        startLocationTracking();
      } else {
        console.log('[AUTH] Token inválido');
        dispatch({ type: 'LOGIN_FAILURE' });
      }
    } catch (error) {
      console.log('[AUTH] Error verificando token:', error);
      dispatch({ type: 'LOGIN_FAILURE' });
    }
  };

  // Función para actualizar ubicación
  const updateLocation = (coordinates: Coordinates): void => {
    dispatch({
      type: 'UPDATE_LOCATION',
      payload: coordinates,
    });
  };

  // Función para obtener ubicación actual
  const getCurrentLocation = async (): Promise<Coordinates | null> => {
    try {
      return await locationService.getCurrentLocation();
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  };

  // Función para obtener información del refresh
  const getRefreshInfo = (): { interval: number; isActive: boolean } => {
    return authService.getRefreshInfo();
  };

  // Iniciar tracking de ubicación
  const startLocationTracking = async (): Promise<void> => {
    try {
      await locationService.watchLocation((coordinates) => {
        updateLocation(coordinates);
      });
      dispatch({ type: 'SET_REFRESH_STATUS', payload: true });
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  // Detener tracking de ubicación
  const stopLocationTracking = (): void => {
    locationService.stopWatching();
    dispatch({ type: 'SET_REFRESH_STATUS', payload: false });
  };


  // Valor del contexto - Login directo sin modal
  const contextValue: AuthContextType = {
    state,
    login,
    logout,
    verifyToken,
    updateLocation,
    getCurrentLocation,
    getRefreshInfo,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar el contexto
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  
  return context;
}
