import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
const { width, height } = Dimensions.get('window');

interface NativeMapViewProps {
  latitude: number;
  longitude: number;
  loading?: boolean;
  title?: string;
  description?: string;
  loginTime?: string;
  onMapReady?: () => void;
  onRegionChange?: (region: any) => void;
  onUserLocationChange?: (event: any) => void;
}

export default function NativeMapView({
  latitude,
  longitude,
  onMapReady,
  onRegionChange,
  onUserLocationChange,
  title = "Tu ubicación actual",
  loginTime,
  loading = false,
}: NativeMapViewProps) {
  const [mapError, setMapError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

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

  useEffect(() => {
    if (!isValidCoordinate(latitude, longitude)) {
      console.error('❌ Coordenadas inválidas:', { latitude, longitude });
      setMapError('Coordenadas inválidas');
    } else {
      console.log('✅ Coordenadas válidas:', { latitude, longitude });
    }
  }, [latitude, longitude]);

  if (!isValidCoordinate(latitude, longitude)) {
    return (
      <View style={[styles.mapContainer, styles.errorContainer]}>
        <Text style={styles.errorText}>❌ Error: Coordenadas inválidas</Text>
        <Text style={styles.errorDetails}>Lat: {latitude}, Lng: {longitude}</Text>
      </View>
    );
  }

  if (mapError) {
    return (
      <View style={[styles.mapContainer, styles.errorContainer]}>
        <Text style={styles.errorText}>❌ Error al cargar el mapa</Text>
        <Text style={styles.errorDetails}>{mapError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      {/* Panel de información estilo Google Maps */}
      <View style={styles.infoPanel}>
        <View style={styles.infoPanelContent}>
          <Text style={styles.storeName}>{title}</Text>
          {loginTime && (
            <Text style={styles.loginTime}>Login: {loginTime}</Text>
          )}
        </View>
      </View>

      {loading && (
        <View style={styles.mapLoadingOverlay}>
          <Text style={styles.mapLoadingText}>Cargando mapa...</Text>
        </View>
      )}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: latitude,
          longitude: longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        pitchEnabled={true}
        rotateEnabled={true}
        zoomEnabled={true}
        scrollEnabled={true}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        followsUserLocation={false}
        mapType="standard"
        loadingEnabled={true}
        loadingIndicatorColor="#3b82f6"
        loadingBackgroundColor="#f8fafc"
        onMapReady={() => {
          console.log('✅ Mapa nativo listo');
          setIsReady(true);
          onMapReady?.();
        }}
        onUserLocationChange={(event) => {
          if (Math.random() < 0.1) {
            console.log('📍 Ubicación actualizada');
          }
          onUserLocationChange?.(event);
        }}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          title={title}
          description={loginTime ? `Login: ${loginTime}` : undefined}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
    width: width,
    height: height * 0.6,
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    alignItems: 'center',
    zIndex: 1000,
  },
  mapLoadingText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoPanel: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  infoPanelContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
    letterSpacing: 2,
  },
  loginTime: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 8,
  },
  errorDetails: {
    fontSize: 14,
    color: '#991b1b',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
