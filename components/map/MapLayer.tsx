import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Platform,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FruitPreloader from '@/components/ui/FruitPreloader';

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
  const [showPreloader, setShowPreloader] = useState(true);

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
    const coordinates = formatCoordinates(latitude, longitude);
    const description = `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}\nPrecisión: ${getLocationAccuracy()}`;

    // Mostrar preloader mientras el mapa carga
    if (showPreloader) {
      return (
        <FruitPreloader 
          message="Cargando mapa..."
          showProgress={false}
          minDuration={3000}
          onComplete={() => {
            // console.log('✨ Preloader completado, mostrando mapa');
            setShowPreloader(false);
            setMapLoading(false);
          }}
        />
      );
    }

    // Importar el componente correcto según la plataforma
    // Metro bundler automáticamente elegirá la versión correcta (.web.tsx o .native.tsx)
    const NativeMapView = require('@/components/map/NativeMapView').default;
    
    return (
      <NativeMapView
        latitude={latitude}
        longitude={longitude}
        loading={false}
        title={marketName || "Tu ubicación actual"}
        description={description}
        loginTime={loginTime}
        onMapReady={() => {
          console.log('Mapa cargado correctamente');
          setMapLoading(false);
        }}
        onRegionChange={(region: any) => {
          console.log('Región del mapa cambió:', region);
        }}
        onUserLocationChange={(event: any) => {
          console.log('Ubicación del usuario cambió:', event.nativeEvent);
        }}
      />
    );
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
});
