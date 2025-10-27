import { useState, useEffect, useCallback } from 'react';
import { locationService } from '@/services/locationService';
import { Coordinates, LocationPermission } from '@/types/location';
import { APP_CONFIG } from '@/utils/constants';
import { useAuth } from '@/context/AuthContext';

interface UseLocationReturn {
  // Estado
  currentLocation: Coordinates | null;
  isLoading: boolean;
  error: string | null;
  permission: LocationPermission | null;
  
  // Acciones
  getCurrentLocation: () => Promise<Coordinates | null>;
  requestPermissions: () => Promise<boolean>;
  startWatching: () => Promise<() => void>;
  stopWatching: () => void;
  
  // Utilidades
  hasPermission: boolean;
  isLocationEnabled: boolean;
}

export function useLocation(): UseLocationReturn {
  const { updateLocation } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<LocationPermission | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [watchStopFunction, setWatchStopFunction] = useState<(() => void) | null>(null);

  // Verificar permisos al inicializar
  useEffect(() => {
    checkLocationServices();
  }, []);

  // Verificar si los servicios de ubicación están habilitados
  const checkLocationServices = useCallback(async () => {
    try {
      const enabled = await locationService.isLocationEnabled();
      setIsLocationEnabled(enabled);
    } catch (error) {
      console.error('Error checking location services:', error);
      setIsLocationEnabled(false);
    }
  }, []);

  // Solicitar permisos de ubicación
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const permissionResult = await locationService.requestPermissions();
      setPermission(permissionResult);

      if (!permissionResult.granted) {
        setError(APP_CONFIG.ERROR_MESSAGES.LOCATION_PERMISSION_DENIED);
        return false;
      }

      return true;
    } catch (error: any) {
      setError(error.message || APP_CONFIG.ERROR_MESSAGES.LOCATION_UNAVAILABLE);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Obtener ubicación actual
  const getCurrentLocation = useCallback(async (): Promise<Coordinates | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Verificar permisos primero
      if (!permission?.granted) {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
          return null;
        }
      }

      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);
      
      // Actualizar el contexto de autenticación con la nueva ubicación
      if (location) {
        updateLocation(location);
        console.log('📍 useLocation: Ubicación actualizada en AuthContext:', location);
      }
      
      return location;

    } catch (error: any) {
      const errorMessage = error.message || APP_CONFIG.ERROR_MESSAGES.LOCATION_UNAVAILABLE;
      setError(errorMessage);
      console.error('Error getting current location:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [permission]);

  // Iniciar monitoreo de ubicación
  const startWatching = useCallback(async (): Promise<() => void> => {
    setError(null);

    try {
      // Verificar permisos primero
      if (!permission?.granted) {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
          throw new Error(APP_CONFIG.ERROR_MESSAGES.LOCATION_PERMISSION_DENIED);
        }
      }

      // Detener watch anterior si existe
      if (watchStopFunction) {
        watchStopFunction();
      }

      const stopFunction = await locationService.watchLocation((coordinates) => {
        setCurrentLocation(coordinates);
        setError(null);
        
        // Actualizar el contexto de autenticación con la nueva ubicación
        updateLocation(coordinates);
        console.log('📍 useLocation: Ubicación actualizada en watch:', coordinates);
      });

      setWatchStopFunction(() => stopFunction);
      return stopFunction;

    } catch (error: any) {
      const errorMessage = error.message || APP_CONFIG.ERROR_MESSAGES.LOCATION_UNAVAILABLE;
      setError(errorMessage);
      console.error('Error starting location watch:', error);
      
      // Retornar función vacía como fallback
      return () => {};
    }
  }, [permission, watchStopFunction]);

  // Detener monitoreo de ubicación
  const stopWatching = useCallback(() => {
    if (watchStopFunction) {
      watchStopFunction();
      setWatchStopFunction(null);
    }
  }, [watchStopFunction]);

  // Limpiar al desmontar el componente
  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  return {
    // Estado
    currentLocation,
    isLoading,
    error,
    permission,
    
    // Acciones
    getCurrentLocation,
    requestPermissions,
    startWatching,
    stopWatching,
    
    // Utilidades
    hasPermission: permission?.granted || false,
    isLocationEnabled,
  };
}
