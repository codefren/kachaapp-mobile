import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface NativeMapViewProps {
  latitude: number;
  longitude: number;
  onMapReady?: () => void;
  onRegionChange?: (region: any) => void;
  onUserLocationChange?: (event: any) => void;
  title?: string;
  description?: string;
  loading?: boolean;
}

export default function NativeMapView({
  latitude,
  longitude,
  onMapReady,
  title = "Tu ubicación actual",
  description,
  loading = false
}: NativeMapViewProps) {
  // Para web, usar Google Maps embebido
  React.useEffect(() => {
    if (onMapReady) {
      // Simular carga del mapa
      setTimeout(() => {
        onMapReady();
      }, 1000);
    }
  }, [onMapReady]);

  const mapUrl = `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dOWTgHz-y931Pk&center=${latitude},${longitude}&zoom=15&maptype=roadmap`;
  
  return (
    <View style={styles.mapContainer}>
      {loading && (
        <View style={styles.mapLoadingOverlay}>
          <Text style={styles.mapLoadingText}>🗺️ Cargando mapa...</Text>
        </View>
      )}
      <iframe
        src={mapUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 0,
        }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={title}
      />
      <View style={styles.webMapOverlay}>
        <Text style={styles.webMapText}>
          📍 {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </Text>
        {description && (
          <Text style={styles.webMapDescription}>
            {description}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapLoadingOverlay: {
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
  mapLoadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  webMapOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 6,
    zIndex: 1000,
  },
  webMapText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  webMapDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
});
