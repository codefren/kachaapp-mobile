import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface WebMapViewProps {
  latitude: number;
  longitude: number;
  coordinates: string;
}

// En plataformas nativas, este componente no se usa
// pero lo mantenemos para compatibilidad
export default function WebMapView({ coordinates }: WebMapViewProps) {
  return (
    <View style={styles.fallbackContainer}>
      <Text style={styles.fallbackText}>
        🗺️ Mapa Web no disponible en plataforma nativa
      </Text>
      <Text style={styles.coordinatesText}>
        📍 {coordinates}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8fafc',
  },
  fallbackText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  coordinatesText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
});
