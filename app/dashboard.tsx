import MapLayer from '@/components/map/MapLayer';
import FruitPreloader from '@/components/ui/FruitPreloader';
import BottomMenu from '@/components/navigation/BottomMenu';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/hooks/useLocation';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { state, logout } = useAuth();
  const location = useLocation();
  const router = useRouter();
  const [slideAnim] = useState(new Animated.Value(0));
  const [showDashboard, setShowDashboard] = useState(false);
  
  // Datos simulados del dashboard
  const [dashboardData] = useState({
    isWorking: true,
    dailyTasksCompleted: 7,
    totalDailyTasks: 12,
    workerRank: 3,
    totalWorkers: 25,
    pendingTasks: 2,
    hasBreakdowns: true,
    breakdownsCount: 1,
    points: 1250,
    level: 'Experto',
    todayEarnings: 85.50
  });

  // Debug: Log del estado actual
  useEffect(() => {
    console.log('📊 Dashboard: Estado actual:', {
      isAuthenticated: state.isAuthenticated,
      hasLocation: !!state.lastLocation,
      marketName: state.marketName,
      loginTime: state.loginTime,
      user: state.user?.username
    });
  }, [state.isAuthenticated, state.lastLocation, state.marketName, state.loginTime, state.user]);

  // Obtener ubicación automáticamente al iniciar
  useEffect(() => {
    if (state.isAuthenticated && !state.lastLocation) {
      console.log('⚠️ Dashboard: Obteniendo ubicación inicial...');
      const getLocation = async () => {
        const coords = await location.getCurrentLocation();
        if (coords) {
          console.log('✅ Dashboard: Ubicación obtenida:', coords);
        } else {
          console.log('❌ Dashboard: No se pudo obtener ubicación');
        }
      };
      getLocation();
    }
  }, [state.isAuthenticated, state.lastLocation]);

  const handleSlideComplete = () => {
    console.log('✅ Ubicación confirmada');
    setShowDashboard(true);
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      const newValue = Math.max(0, Math.min(gestureState.dx, width - 120));
      slideAnim.setValue(newValue);
    },
    onPanResponderRelease: (evt, gestureState) => {
      const threshold = (width - 120) * 0.7;
      
      if (gestureState.dx > threshold) {
        // Completar el slide
        Animated.timing(slideAnim, {
          toValue: width - 120,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          // Vibración suave al completar
          Vibration.vibrate(100);
          handleSlideComplete();
          // Reset después de navegar
          slideAnim.setValue(0);
        });
      } else {
        // Volver al inicio
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  if (!state.isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No autenticado</Text>
        <Text style={styles.subtitle}>Por favor inicia sesión</Text>
      </View>
    );
  }

  if (!state.lastLocation) {
    return (
      <FruitPreloader 
        message="Obteniendo tu ubicación..."
        showProgress={true}
        minDuration={3000}
      />
    );
  }

  if (showDashboard) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header del Dashboard Mejorado */}
        <View style={styles.dashboardHeader}>
          {/* Saludo Principal */}
          <View style={styles.greetingSection}>
            <Text style={styles.greetingText}>¡Hola!</Text>
            <View style={styles.userNameContainer}>
              <Text style={styles.userName}>{state.user?.username || 'Usuario'}</Text>
              <View style={styles.userBadge}>
                <View style={[styles.statusDot, { backgroundColor: dashboardData.isWorking ? '#10b981' : '#ef4444' }]} />
                <Text style={styles.statusText}>{dashboardData.isWorking ? 'Trabajando' : 'Inactivo'}</Text>
              </View>
            </View>
          </View>
          
          {/* Información de Ubicación */}
          <View style={styles.locationSection}>
            <View style={styles.locationHeader}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationTitle}>Ubicación Actual</Text>
            </View>
            <Text style={styles.marketName}>{state.marketName || 'Mercado Central'}</Text>
            <Text style={styles.loginTime}>Conectado desde: {state.loginTime || 'Ahora'}</Text>
          </View>
          
          {/* Progreso diario integrado en el header */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Tareas Diarias</Text>
              <Text style={styles.progressPercentage}>{Math.round((dashboardData.dailyTasksCompleted / dashboardData.totalDailyTasks) * 100)}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <Animated.View 
                  style={[
                    styles.progressFill, 
                    { width: `${(dashboardData.dailyTasksCompleted / dashboardData.totalDailyTasks) * 100}%` }
                  ]} 
                />
                <View style={styles.progressGlow} />
              </View>
              <View style={styles.progressMarkers}>
                {Array.from({ length: dashboardData.totalDailyTasks }, (_, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.progressMarker,
                      i < dashboardData.dailyTasksCompleted && styles.progressMarkerCompleted
                    ]} 
                  />
                ))}
              </View>
            </View>
            <View style={styles.progressFooter}>
              <Text style={styles.progressText}>
                <Text style={styles.progressCompleted}>{dashboardData.dailyTasksCompleted}</Text>
                <Text style={styles.progressSeparator}> de </Text>
                <Text style={styles.progressTotal}>{dashboardData.totalDailyTasks}</Text>
                <Text style={styles.progressLabel}> tareas completadas</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Botón de Acción Principal */}
        <View style={styles.actionContainer}>
          <View style={styles.buttonAuraOuter}>
            <View style={styles.buttonAura}>
              <Pressable style={styles.primaryButton} onPress={() => router.push('/menu')}>
                <View style={styles.buttonInnerGlow}>
                  <Text style={styles.primaryButtonText}>Empezar</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
        
        {/* Espaciado para el footer y menú inferior */}
        <View style={styles.bottomContentSpacer} />
        </ScrollView>
        
        {/* Footer con Resumen del Día */}
        <View style={styles.footerContainer}>
          <View style={styles.summaryContainer}>
            <Text style={styles.sectionTitle}>Resumen de Hoy</Text>
            
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>€{dashboardData.todayEarnings.toFixed(2)}</Text>
                <Text style={styles.summaryLabel}>Ganado Hoy</Text>
              </View>
              
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{dashboardData.dailyTasksCompleted}</Text>
                <Text style={styles.summaryLabel}>Tareas Hechas</Text>
              </View>
              
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{Math.round((dashboardData.dailyTasksCompleted / dashboardData.totalDailyTasks) * 100)}%</Text>
                <Text style={styles.summaryLabel}>Eficiencia</Text>
              </View>
            </View>
          </View>
        </View>
        
        <BottomMenu activeTab="profile" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mapa */}
      <View style={styles.mapContainer}>
        <MapLayer
          latitude={state.lastLocation.latitude}
          longitude={state.lastLocation.longitude}
          accuracy={state.lastLocation.accuracy}
          timestamp={state.lastLocation.timestamp}
          marketName={state.marketName || 'Ubicación actual'}
          loginTime={state.loginTime}
          onClose={() => logout()}
          onUpdateLocation={() => location.getCurrentLocation()}
        />
      </View>

      {/* Slide Button de Confirmar */}
      <View style={styles.slideContainer}>
        <View style={styles.slideTrack}>
          <Text style={styles.slideText}>Desliza para confirmar ubicación</Text>
          <Animated.View
            style={[
              styles.slideButton,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <Text style={styles.slideButtonText}>→</Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
  },
  slideContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    zIndex: 1000,
    opacity: 0.9,
  },
  slideTrack: {
    height: 70,
    backgroundColor: '#ffffff',
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#10b981',
    position: 'relative',
    justifyContent: 'center',
    paddingLeft: 80,
    paddingRight: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  slideText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  slideButton: {
    position: 'absolute',
    left: 5,
    top: '50%',
    marginTop: -30,
    width: 60,
    height: 60,
    backgroundColor: '#10b981',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 12,
  },
  slideButtonText: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  // Estilos del Dashboard
  dashboardHeader: {
    backgroundColor: '#ffffff',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  greetingSection: {
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  locationSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  marketName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  loginTime: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerActionIcon: {
    fontSize: 20,
  },
  // Estilos antiguos mantenidos para compatibilidad
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  marketText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  progressContainer: {
    marginBottom: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    borderWidth: 0,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 6,
    position: 'relative',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  progressGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
  },
  progressMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  progressMarker: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    borderWidth: 1,
    borderColor: '#94a3b8',
  },
  progressMarkerCompleted: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 2,
    elevation: 2,
  },
  progressFooter: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
  },
  progressCompleted: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  progressSeparator: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  progressLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  rankContainer: {
    alignItems: 'center',
  },
  rankTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  rankNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  rankTotal: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 4,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  shortcutsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  shortcutCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  shortcutAlert: {
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  shortcutWarning: {
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  shortcutIcon: {
    position: 'relative',
    marginBottom: 12,
  },
  shortcutEmoji: {
    fontSize: 32,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeWarning: {
    backgroundColor: '#f59e0b',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  shortcutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  shortcutSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  actionContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  buttonAuraOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 6,
  },
  buttonAura: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
  },
  primaryButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 12,
  },
  buttonInnerGlow: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Estilos del Footer y Menú Inferior
  bottomContentSpacer: {
    height: 170, // Espacio para footer + menú (85 + 85)
  },
  footerContainer: {
    position: 'absolute',
    bottom: 85, // Justo encima del menú
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomMenu: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 85,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  menuItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: 56,
  },
  menuItemActive: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconContainer: {
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    transform: [{ scale: 1.05 }],
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  iconCircleActive: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  menuIcon: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
  },
  menuIconActive: {
    color: '#ffffff',
    fontSize: 18,
  },
  menuLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 14,
  },
  menuLabelActive: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 12,
  },
});
