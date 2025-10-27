import * as Location from 'expo-location';
import { Coordinates, LocationPermission } from '@/types/location';

class LocationService {
  private static instance: LocationService;
  private watchSubscription: Location.LocationSubscription | null = null;
  private lastKnownLocation: Coordinates | null = null;

  private constructor() {}

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  // Solicitar permisos de ubicación
  async requestPermissions(): Promise<LocationPermission> {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      
      return {
        granted: status === 'granted',
        canAskAgain,
        status: status as 'granted' | 'denied' | 'undetermined',
      };
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
    }
  }

  // Obtener ubicación actual rápida (para login)
  async getQuickLocation(): Promise<Coordinates> {
    try {
      // Si tenemos una ubicación reciente (menos de 30 segundos), usarla
      if (this.lastKnownLocation && 
          Date.now() - this.lastKnownLocation.timestamp < 30000) {
        console.log('📍 LocationService: Usando ubicación en caché');
        return this.lastKnownLocation;
      }

      // Verificar permisos
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permisos de ubicación no concedidos');
      }

      // Obtener ubicación con precisión baja para velocidad
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low, // Precisión baja para velocidad
        timeInterval: 500, // Muy rápido
        distanceInterval: 50, // Tolerancia alta
      });

      const coordinates: Coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        altitude: location.coords.altitude || undefined,
        altitudeAccuracy: location.coords.altitudeAccuracy || undefined,
        heading: location.coords.heading || undefined,
        speed: location.coords.speed || undefined,
        timestamp: location.timestamp,
      };

      this.lastKnownLocation = coordinates;
      return coordinates;

    } catch (error: any) {
      console.error('Error getting quick location:', error);
      
      // Si hay una ubicación conocida, usarla como fallback
      if (this.lastKnownLocation) {
        console.warn('Using last known location as fallback');
        return this.lastKnownLocation;
      }
      
      throw error;
    }
  }

  // Obtener ubicación actual con alta precisión
  async getCurrentLocation(): Promise<Coordinates> {
    try {
      // Verificar permisos
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permisos de ubicación no concedidos');
      }

      // Obtener ubicación con precisión balanceada para login rápido
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Cambiar de High a Balanced
        timeInterval: 1000, // Reducir de 5000 a 1000ms
        distanceInterval: 10, // Aumentar tolerancia de distancia
      });

      const coordinates: Coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        altitude: location.coords.altitude || undefined,
        altitudeAccuracy: location.coords.altitudeAccuracy || undefined,
        heading: location.coords.heading || undefined,
        speed: location.coords.speed || undefined,
        timestamp: location.timestamp,
      };

      this.lastKnownLocation = coordinates;
      return coordinates;

    } catch (error: any) {
      console.error('Error getting current location:', error);
      
      // Si hay una ubicación conocida, usarla como fallback
      if (this.lastKnownLocation) {
        console.warn('Using last known location as fallback');
        return this.lastKnownLocation;
      }
      
      throw new Error(`No se pudo obtener la ubicación: ${error.message}`);
    }
  }

  // Monitorear ubicación en tiempo real
  async watchLocation(callback: (coords: Coordinates) => void): Promise<() => void> {
    try {
      // Verificar permisos
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permisos de ubicación no concedidos');
      }

      // Detener watch anterior si existe
      if (this.watchSubscription) {
        this.watchSubscription.remove();
      }

      // Iniciar monitoreo
      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // Actualizar cada 30 segundos
          distanceInterval: 10, // O cuando se mueva 10 metros
        },
        (location) => {
          const coordinates: Coordinates = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            altitudeAccuracy: location.coords.altitudeAccuracy,
            heading: location.coords.heading,
            speed: location.coords.speed,
            timestamp: location.timestamp,
          };

          this.lastKnownLocation = coordinates;
          callback(coordinates);
        }
      );

      // Retornar función para detener el monitoreo
      return () => {
        if (this.watchSubscription) {
          this.watchSubscription.remove();
          this.watchSubscription = null;
        }
      };

    } catch (error: any) {
      console.error('Error watching location:', error);
      throw new Error(`No se pudo monitorear la ubicación: ${error.message}`);
    }
  }

  // Detener monitoreo
  stopWatching(): void {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
  }

  // Obtener última ubicación conocida
  getLastKnownLocation(): Coordinates | null {
    return this.lastKnownLocation;
  }

  // Verificar si los servicios de ubicación están habilitados
  async isLocationEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }

  // Calcular distancia entre dos puntos (en metros)
  calculateDistance(coords1: Coordinates, coords2: Coordinates): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = coords1.latitude * Math.PI / 180;
    const φ2 = coords2.latitude * Math.PI / 180;
    const Δφ = (coords2.latitude - coords1.latitude) * Math.PI / 180;
    const Δλ = (coords2.longitude - coords1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distancia en metros
  }

  // Verificar si la ubicación ha cambiado significativamente
  hasLocationChanged(newCoords: Coordinates, threshold: number = 50): boolean {
    if (!this.lastKnownLocation) return true;
    
    const distance = this.calculateDistance(this.lastKnownLocation, newCoords);
    return distance > threshold;
  }
}

// Exportar instancia singleton
export const locationService = LocationService.getInstance();
