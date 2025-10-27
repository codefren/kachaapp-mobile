import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Coordinates } from '@/types/location';

// Importación condicional del mapa solo para plataformas nativas
let MapView: any, Marker: any, Circle: any;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Circle = Maps.Circle;
}

const { width, height } = Dimensions.get('window');
const SLIDE_THRESHOLD = width * 0.7; // 70% del ancho para confirmar

interface LocationConfirmModalProps {
  visible: boolean;
  location: Coordinates | null;
  marketName: string;
  loginTime: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LocationConfirmModal({
  visible,
  location,
  marketName,
  loginTime,
  onConfirm,
  onCancel,
}: LocationConfirmModalProps) {
  const [isSliding, setIsSliding] = useState(false);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const panRef = useRef<PanGestureHandler>(null);

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: slideAnimation } }],
    { useNativeDriver: false }
  );

  const handleStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX } = event.nativeEvent;
      
      if (translationX > SLIDE_THRESHOLD) {
        // Confirmar ubicación
        Animated.timing(slideAnimation, {
          toValue: width,
          duration: 300,
          useNativeDriver: false,
        }).start(() => {
          onConfirm();
          resetSlider();
        });
      } else {
        // Volver a la posición inicial
        Animated.spring(slideAnimation, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      }
      setIsSliding(false);
    }
  };

  const resetSlider = () => {
    slideAnimation.setValue(0);
    setIsSliding(false);
  };

  const getMapRegion = () => {
    if (!location) return undefined;
    
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.01, // Zoom cercano
      longitudeDelta: 0.01,
    };
  };

  // Componente de mapa para plataformas nativas
  const renderNativeMap = () => (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        region={getMapRegion()}
        showsUserLocation={true}
        showsMyLocationButton={false}
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {/* Marcador de ubicación actual */}
        <Marker
          coordinate={{
            latitude: location!.latitude,
            longitude: location!.longitude,
          }}
          title="Tu ubicación"
          description={`${marketName} - ${loginTime}`}
          pinColor="#3b82f6"
        />

        {/* Círculo de precisión */}
        <Circle
          center={{
            latitude: location!.latitude,
            longitude: location!.longitude,
          }}
          radius={location!.accuracy || 50}
          fillColor="rgba(59, 130, 246, 0.2)"
          strokeColor="rgba(59, 130, 246, 0.5)"
          strokeWidth={2}
        />

        {/* Círculo de área de mercado (500m) */}
        <Circle
          center={{
            latitude: location!.latitude,
            longitude: location!.longitude,
          }}
          radius={500}
          fillColor="rgba(34, 197, 94, 0.1)"
          strokeColor="rgba(34, 197, 94, 0.3)"
          strokeWidth={2}
        />
      </MapView>

      {/* Overlay de información */}
      <View style={styles.mapOverlay}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🎯 Ubicación Verificada</Text>
          <Text style={styles.infoText}>
            Precisión: ±{Math.round(location!.accuracy || 0)}m
          </Text>
          <Text style={styles.infoText}>
            Área de mercado: 500m de radio
          </Text>
        </View>
      </View>
    </View>
  );

  // Componente alternativo para web
  const renderWebLocation = () => (
    <View style={styles.mapContainer}>
      <View style={styles.webLocationContainer}>
        <View style={styles.locationIcon}>
          <Text style={styles.locationIconText}>📍</Text>
        </View>
        
        <View style={styles.locationDetails}>
          <Text style={styles.webLocationTitle}>Ubicación Verificada</Text>
          <Text style={styles.webLocationCoords}>
            📍 {location!.latitude.toFixed(6)}, {location!.longitude.toFixed(6)}
          </Text>
          <Text style={styles.webLocationAccuracy}>
            🎯 Precisión: ±{Math.round(location!.accuracy || 0)}m
          </Text>
          <Text style={styles.webLocationRadius}>
            🏪 Área de mercado: 500m de radio
          </Text>
        </View>

        <View style={styles.webLocationBackground}>
          <View style={styles.webLocationCircle} />
          <View style={styles.webLocationMarket} />
        </View>
      </View>
    </View>
  );

  if (!location) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>📍 Confirma tu Ubicación</Text>
          <Text style={styles.subtitle}>
            Estás en: <Text style={styles.marketName}>{marketName}</Text>
          </Text>
          <Text style={styles.loginTime}>Hora de acceso: {loginTime}</Text>
        </View>

        {/* Mapa o vista de ubicación según la plataforma */}
        {Platform.OS === 'web' ? renderWebLocation() : renderNativeMap()}

        {/* Slider de confirmación */}
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderText}>
            Desliza para confirmar tu ubicación en {marketName}
          </Text>
          
          <View style={styles.sliderTrack}>
            <PanGestureHandler
              ref={panRef}
              onGestureEvent={handleGestureEvent}
              onHandlerStateChange={handleStateChange}
              activeOffsetX={10}
            >
              <Animated.View
                style={[
                  styles.sliderThumb,
                  {
                    transform: [
                      {
                        translateX: slideAnimation.interpolate({
                          inputRange: [0, width],
                          outputRange: [0, width - 100],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.sliderThumbText}>👉</Text>
              </Animated.View>
            </PanGestureHandler>

            <Animated.View
              style={[
                styles.sliderProgress,
                {
                  width: slideAnimation.interpolate({
                    inputRange: [0, width],
                    outputRange: [0, width - 40],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            />

            <Text style={styles.sliderTrackText}>
              Desliza aquí para confirmar →
            </Text>
          </View>
        </View>

        {/* Botón de cancelar */}
        <View style={styles.footer}>
          <Text style={styles.cancelButton} onPress={onCancel}>
            ✕ Cancelar
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#3b82f6',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#dbeafe',
    marginBottom: 4,
  },
  marketName: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
  loginTime: {
    fontSize: 14,
    color: '#bfdbfe',
  },
  
  // Mapa
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  
  // Slider
  sliderContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  sliderText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  sliderTrack: {
    height: 60,
    backgroundColor: '#e5e7eb',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  sliderProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: '#34d399',
    borderRadius: 30,
  },
  sliderThumb: {
    position: 'absolute',
    left: 10,
    width: 50,
    height: 50,
    backgroundColor: '#ffffff',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  sliderThumbText: {
    fontSize: 20,
  },
  sliderTrackText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  
  // Footer
  footer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  cancelButton: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  
  // Estilos para la vista web
  webLocationContainer: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    padding: 20,
  },
  locationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  locationIconText: {
    fontSize: 32,
  },
  locationDetails: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    maxWidth: 300,
  },
  webLocationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  webLocationCoords: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  webLocationAccuracy: {
    fontSize: 14,
    color: '#059669',
    marginBottom: 8,
    textAlign: 'center',
  },
  webLocationRadius: {
    fontSize: 14,
    color: '#7c3aed',
    textAlign: 'center',
  },
  webLocationBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
  },
  webLocationCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    position: 'absolute',
  },
  webLocationMarket: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    borderStyle: 'dashed',
    position: 'absolute',
  },
});
