import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
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
        style={styles.map}
        initialCamera={{
          center: { latitude, longitude },
          pitch: 60, // Inclinación de 60 grados
          heading: 0,
          altitude: 400,
          zoom: 19,
        }}
        pitchEnabled={true}
        rotateEnabled={true}
        zoomEnabled={true}
        scrollEnabled={true}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        followsUserLocation={true}
        userLocationUpdateInterval={2000}
        mapType="standard"
        loadingEnabled={true}
        loadingIndicatorColor="#3b82f6"
        loadingBackgroundColor="#f8fafc"
        onMapReady={onMapReady}
        onUserLocationChange={(event) => {
          // Reducir logs de ubicación para evitar spam
          if (Math.random() < 0.1) { // Solo log 10% de las veces
            console.log('Ubicación del usuario actualizada');
          }
          onUserLocationChange?.(event);
        }}
      >
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
});
