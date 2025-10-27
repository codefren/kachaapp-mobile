import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const menuItems = [
  { id: 1, icon: '📊', name: 'Reportes', color: '#3b82f6' },
  { id: 2, icon: '📦', name: 'Inventario', color: '#10b981' },
  { id: 3, icon: '💰', name: 'Ventas', color: '#f59e0b' },
  { id: 4, icon: '👥', name: 'Clientes', color: '#8b5cf6' },
  { id: 5, icon: '📋', name: 'Pedidos', color: '#ef4444' },
  { id: 6, icon: '⚙️', name: 'Configuración', color: '#6b7280' },
  { id: 7, icon: '📈', name: 'Analytics', color: '#06b6d4' },
  { id: 8, icon: '🔔', name: 'Notificaciones', color: '#f97316' },
  { id: 9, icon: '📱', name: 'Soporte', color: '#84cc16' },
  { id: 10, icon: '🏪', name: 'Mi Tienda', color: '#ec4899' },
  { id: 11, icon: '📄', name: 'Facturas', color: '#14b8a6' },
  { id: 12, icon: '🎯', name: 'Objetivos', color: '#f43f5e' },
];

export default function MenuScreen() {
  const router = useRouter();

  const handleMenuPress = (item: any) => {
    console.log(`Navegando a: ${item.name}`);
    // Aquí puedes agregar navegación específica para cada opción
  };

  return (
    <View style={styles.container}>
      {/* Menu Grid */}
      <ScrollView 
        style={styles.menuContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.menuItem, { borderColor: item.color }]}
              onPress={() => handleMenuPress(item)}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                <Text style={styles.icon}>{item.icon}</Text>
              </View>
              <Text style={styles.menuText}>{item.name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Back Button */}
      <View style={styles.bottomContainer}>
        <Pressable 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Volver al Mapa</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 100,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: (width - 60) / 3,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
  },
  menuText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  backButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
