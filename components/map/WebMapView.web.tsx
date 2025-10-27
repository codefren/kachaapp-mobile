import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface WebMapViewProps {
  latitude: number;
  longitude: number;
  coordinates: string;
}

export default function WebMapView({ latitude, longitude, coordinates }: WebMapViewProps) {
  // Usar una API key pública de Google Maps (en producción usar una propia)
  const mapUrl = `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dOWTgHz-y931Pk&center=${latitude},${longitude}&zoom=15&maptype=roadmap`;
  
  return (
    <View style={styles.webMapContainer}>
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
      />
      <View style={styles.webMapOverlay}>
        <Text style={styles.webMapText}>
          📍 {coordinates}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webMapContainer: {
    flex: 1,
    position: 'relative',
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
});
