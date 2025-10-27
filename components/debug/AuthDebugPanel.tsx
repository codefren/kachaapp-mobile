import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/hooks/useLocation';

export default function AuthDebugPanel() {
  const { state, logout, getCurrentLocation, getRefreshInfo } = useAuth();
  const location = useLocation();

  const refreshInfo = getRefreshInfo();

  const handleGetLocation = async () => {
    const coords = await getCurrentLocation();
    console.log('Current location:', coords);
  };

  const formatLocation = (coords: any) => {
    if (!coords) return 'No disponible';
    return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔐 Auth Debug Panel</Text>
      
      {/* Estado de Autenticación */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estado de Autenticación</Text>
        <Text style={styles.item}>✅ Autenticado: {state.isAuthenticated ? 'Sí' : 'No'}</Text>
        <Text style={styles.item}>⏳ Cargando: {state.isLoading ? 'Sí' : 'No'}</Text>
        <Text style={styles.item}>🔄 Refresh Activo: {state.isRefreshActive ? 'Sí' : 'No'}</Text>
        <Text style={styles.item}>⏱️ Intervalo: {state.refreshInterval / 1000}s</Text>
      </View>

      {/* Información del Usuario */}
      {state.user && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usuario</Text>
          <Text style={styles.item}>👤 ID: {state.user.id}</Text>
          <Text style={styles.item}>📝 Username: {state.user.username}</Text>
          <Text style={styles.item}>🏷️ Nombre: {state.user.name || 'N/A'}</Text>
          <Text style={styles.item}>🔑 Permisos: {state.user.permissions?.length || 0}</Text>
        </View>
      )}

      {/* Token Information */}
      {state.bearerToken && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Token</Text>
          <Text style={styles.item}>🎫 Token: {state.bearerToken.substring(0, 20)}...</Text>
          <Text style={styles.item}>🔄 Refresh Info:</Text>
          <Text style={styles.subItem}>  • Intervalo: {refreshInfo.interval / 1000}s</Text>
          <Text style={styles.subItem}>  • Activo: {refreshInfo.isActive ? 'Sí' : 'No'}</Text>
        </View>
      )}

      {/* Información de Ubicación */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Geolocalización</Text>
        <Text style={styles.item}>📍 Ubicación Actual: {formatLocation(state.lastLocation)}</Text>
        <Text style={styles.item}>🕐 Última Actualización: {formatTime(state.lastLocation?.timestamp)}</Text>
        <Text style={styles.item}>🎯 Precisión: {state.lastLocation?.accuracy?.toFixed(2) || 'N/A'}m</Text>
        
        <Text style={styles.item}>📱 Estado del Hook:</Text>
        <Text style={styles.subItem}>  • Permisos: {location.hasPermission ? 'Concedidos' : 'Denegados'}</Text>
        <Text style={styles.subItem}>  • Servicios: {location.isLocationEnabled ? 'Habilitados' : 'Deshabilitados'}</Text>
        <Text style={styles.subItem}>  • Cargando: {location.isLoading ? 'Sí' : 'No'}</Text>
        <Text style={styles.subItem}>  • Error: {location.error || 'Ninguno'}</Text>
      </View>

      {/* Acciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones</Text>
        
        <Pressable style={styles.button} onPress={handleGetLocation}>
          <Text style={styles.buttonText}>📍 Obtener Ubicación</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={() => location.requestPermissions()}>
          <Text style={styles.buttonText}>🔐 Solicitar Permisos</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={() => location.startWatching()}>
          <Text style={styles.buttonText}>👁️ Iniciar Monitoreo</Text>
        </Pressable>

        <Pressable style={styles.button} onPress={() => location.stopWatching()}>
          <Text style={styles.buttonText}>⏹️ Detener Monitoreo</Text>
        </Pressable>

        {state.isAuthenticated && (
          <Pressable style={[styles.button, styles.logoutButton]} onPress={logout}>
            <Text style={styles.buttonText}>🚪 Cerrar Sesión</Text>
          </Pressable>
        )}
      </View>

      {/* Logs en tiempo real */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estado en Tiempo Real</Text>
        <Text style={styles.item}>🔄 Última actualización: {new Date().toLocaleTimeString()}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1e293b',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#374151',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
  },
  item: {
    fontSize: 14,
    marginBottom: 8,
    color: '#4b5563',
    fontFamily: 'monospace',
  },
  subItem: {
    fontSize: 12,
    marginBottom: 4,
    color: '#6b7280',
    fontFamily: 'monospace',
    marginLeft: 8,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
