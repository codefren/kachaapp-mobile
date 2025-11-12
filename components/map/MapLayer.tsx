import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Platform,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface MapLayerProps {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
  marketName?: string;
  loginTime?: string | null;
  onClose: () => void;
  onUpdateLocation: () => void;
  onGoToDashboard?: () => void;
}

export default function MapLayer({ 
  latitude, 
  longitude, 
  accuracy, 
  timestamp,
  marketName,
  loginTime,
  onClose,
  onUpdateLocation,
  onGoToDashboard
}: MapLayerProps) {
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // Auto-ocultar el loading después de 2 segundos máximo
  useEffect(() => {
    const timeout = setTimeout(() => {
      setMapLoading(false);
    }, 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Validar coordenadas
  const isValidCoordinate = (lat: number, lng: number): boolean => {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const getLocationAccuracy = () => {
    if (!accuracy) return 'N/A';
    return `±${accuracy.toFixed(1)}m`;
  };

  const getTimeSinceUpdate = () => {
    if (!timestamp) return 'Nunca';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `Hace ${minutes}m ${seconds}s`;
    }
    return `Hace ${seconds}s`;
  };

  const renderMap = () => {
    // Validar coordenadas antes de renderizar
    if (!isValidCoordinate(latitude, longitude)) {
      console.error('❌ Coordenadas inválidas en MapLayer:', { latitude, longitude });
      return (
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackTitle}>❌ Error de Ubicación</Text>
          <View style={styles.locationCard}>
            <Text style={styles.errorText}>Las coordenadas recibidas no son válidas</Text>
            <Text style={styles.locationText}>Lat: {latitude}</Text>
            <Text style={styles.locationText}>Lng: {longitude}</Text>
          </View>
        </View>
      );
    }

    const coordinates = formatCoordinates(latitude, longitude);
    const description = `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}\nPrecisión: ${getLocationAccuracy()}`;

    // Si hubo un error al cargar el mapa, mostrar fallback
    if (mapError) {
      return renderFallbackMap();
    }

    try {
      // Importar el componente correcto según la plataforma
      const NativeMapView = require('@/components/map/NativeMapView').default;
      
      return (
        <View style={{ flex: 1, position: 'relative' }}>
          <NativeMapView
            latitude={latitude}
            longitude={longitude}
            loading={false}
            title={marketName || "Tu ubicación actual"}
            description={description}
            loginTime={loginTime}
            onMapReady={() => {
              console.log('✅ Mapa cargado correctamente');
              setMapLoading(false);
            }}
            onRegionChange={(region: any) => {
              console.log('🗺️ Región del mapa cambió:', region);
            }}
            onUserLocationChange={(event: any) => {
              console.log('📍 Ubicación del usuario cambió');
            }}
          />
          {/* Overlay de carga sutil */}
          {mapLoading && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>Cargando mapa...</Text>
              </View>
            </View>
          )}
        </View>
      );
    } catch (error) {
      console.error('❌ Error al renderizar el mapa:', error);
      setMapError(error instanceof Error ? error.message : 'Error desconocido');
      return renderFallbackMap();
    }
  };

  const renderFallbackMap = () => {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackTitle}>🗺️ Vista de Ubicación</Text>
        <View style={styles.locationCard}>
          <Text style={styles.locationText}>
            📍 {formatCoordinates(latitude, longitude)}
          </Text>
          <Text style={styles.accuracyText}>
            🎯 Precisión: {getLocationAccuracy()}
          </Text>
          <Text style={styles.timestampText}>
            🕒 {getTimeSinceUpdate()}
          </Text>
        </View>
        <Pressable 
          style={styles.openExternalButton}
          onPress={() => {
            const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
            console.log('Abrir mapa externo:', url);
          }}
        >
          <Text style={styles.openExternalButtonText}>
            🌐 Abrir en Google Maps
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Solo el mapa a pantalla completa */}
      <View style={styles.mapContainer}>
        {renderMap()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mapContainer: {
    flex: 1,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8fafc',
  },
  fallbackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 24,
  },
  locationCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 24,
    minWidth: width * 0.8,
  },
  locationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  accuracyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  timestampText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  openExternalButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  openExternalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para overlay de carga
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 12,
  },
});
