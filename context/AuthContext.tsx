import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthResponseWithLocation, Coordinates } from '@/types/location';
import { authService } from '@/services/authService';
import { locationService } from '@/services/locationService';

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
  showLocationModal: boolean;
  pendingLoginData: {
    user: UserWithLocation;
    accessToken: string;
    refreshToken: string;
    marketName: string;
    loginTime: string;
  } | null;
  refreshInterval: number;
  isRefreshActive: boolean;
  lastLocation: Coordinates | null;
}

// Tipos para las acciones del reducer
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SHOW_LOCATION_MODAL'; payload: { 
      user: UserWithLocation; 
      accessToken: string; 
      refreshToken: string;
      marketName: string;
      loginTime: string;
    } }
  | { type: 'CONFIRM_LOCATION' }
  | { type: 'CANCEL_LOCATION_MODAL' }
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
  showLocationModal: false,
  pendingLoginData: null,
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
    
    case 'SHOW_LOCATION_MODAL':
      console.log('🔄 AuthContext: SHOW_LOCATION_MODAL ejecutado');
      return {
        ...state,
        showLocationModal: true,
        pendingLoginData: action.payload,
        isLoading: false,
      };
    
    case 'CONFIRM_LOCATION':
      console.log('🔄 AuthContext: CONFIRM_LOCATION ejecutado');
      if (!state.pendingLoginData) {
        return state;
      }
      return {
        ...state,
        user: state.pendingLoginData.user,
        accessToken: state.pendingLoginData.accessToken,
        refreshToken: state.pendingLoginData.refreshToken,
        marketName: state.pendingLoginData.marketName,
        loginTime: state.pendingLoginData.loginTime,
        isAuthenticated: true,
        isRefreshActive: true,
        showLocationModal: false,
        pendingLoginData: null,
        isLoading: false,
      };
    
    case 'CANCEL_LOCATION_MODAL':
      console.log('🔄 AuthContext: CANCEL_LOCATION_MODAL ejecutado');
      return {
        ...state,
        showLocationModal: false,
        pendingLoginData: null,
        isLoading: false,
      };
    
    case 'LOGIN_SUCCESS':
      console.log('🔄 AuthContext: LOGIN_SUCCESS ejecutado');
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
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
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

  console.log('🔄 AuthProvider: Estado actual:', {
    isAuthenticated: state.isAuthenticated,
    hasToken: !!state.accessToken,
    tokenLength: state.accessToken?.length || 0,
    user: state.user?.username,
    marketName: state.marketName
  });

  // No verificar token al inicializar para acelerar el login

  // Configurar callback para refresh de token
  useEffect(() => {
    authService.setTokenRefreshCallback((newAccessToken: string) => {
      dispatch({
        type: 'TOKEN_REFRESHED',
        payload: { 
          accessToken: newAccessToken,
          refreshToken: state.refreshToken || '' // Mantener el refresh token actual
        },
      });
    });
  }, [state.refreshToken]);

  // Función para login con geolocalización
  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    console.log('🔐 AuthContext: Iniciando login para', username);
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await authService.login(username, password);
      console.log('📡 AuthContext: Respuesta del servicio:', response);

      if (response.success && response.user && response.access) {
        const userWithLocation: UserWithLocation = {
          id: response.user.id,
          username: response.user.username,
          name: response.user.name,
          market_name: response.user.market_name,
          login_time: response.user.login_time,
        };

        console.log('✅ AuthContext: Login exitoso, confirmando ubicación automáticamente');
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
        console.log('❌ AuthContext: Login fallido');
        dispatch({ type: 'LOGIN_FAILURE' });
        return {
          success: false,
          message: response.message || 'Error al iniciar sesión',
        };
      }
    } catch (error: any) {
      console.log('💥 AuthContext: Error en login:', error);
      dispatch({ type: 'LOGIN_FAILURE' });
      return {
        success: false,
        message: error.message || 'Error de conexión',
      };
    }
  };

  // Función para logout
  const logout = async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      await authService.logout();
      stopLocationTracking();
    } catch (error) {
      console.warn('Error durante logout:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Función para verificar token
  const verifyToken = async (): Promise<void> => {
    console.log('🔍 AuthContext: Verificando token existente');
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await authService.verifyToken();
      console.log('📡 AuthContext: Respuesta de verificación:', response);

      if (response.success && response.user && response.access) {
        const userWithLocation: UserWithLocation = {
          id: response.user.id,
          username: response.user.username,
          name: response.user.name,
          market_name: response.user.market_name,
          login_time: response.user.login_time,
        };

        console.log('✅ AuthContext: Token válido, restaurando sesión');
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
        console.log('❌ AuthContext: Token inválido');
        dispatch({ type: 'LOGIN_FAILURE' });
      }
    } catch (error) {
      console.log('💥 AuthContext: Error verificando token:', error);
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
