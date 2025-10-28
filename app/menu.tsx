import BottomMenu from "@/components/navigation/BottomMenu";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const menuItems = [
  // Operaciones Principales
  { id: 1, name: "Proveedores", color: "#3b82f6", category: "operations" },
  {
    id: 2,
    name: "Recepción de Proveedores",
    color: "#10b981",
    category: "operations",
  },
  {
    id: 3,
    name: "Control de Temperaturas",
    color: "#06b6d4",
    category: "operations",
  },
  { id: 4, name: "Producción", color: "#f59e0b", category: "operations" },
  { id: 5, name: "Tareas", color: "#10b981", category: "operations" },
  { id: 6, name: "Delivery", color: "#ef4444", category: "operations" },

  // Gestión Comercial
  { id: 7, name: "Clientes", color: "#8b5cf6", category: "commercial" },
  { id: 8, name: "Cierres", color: "#374151", category: "commercial" },
  { id: 9, name: "Objetivos", color: "#f43f5e", category: "commercial" },
  { id: 10, name: "Premios", color: "#f59e0b", category: "commercial" },
  { id: 11, name: "Chat", color: "#84cc16", category: "commercial" },
  {
    id: 12,
    name: "Catálogo de Venta",
    color: "#ec4899",
    category: "commercial",
  },

  // Soporte y Gestión
  { id: 13, name: "Averías", color: "#ef4444", category: "support" },
  { id: 14, name: "Capacitación", color: "#6366f1", category: "support" },
  { id: 15, name: "Protocolos", color: "#6b7280", category: "support" },
  { id: 16, name: "Concursos", color: "#f97316", category: "support" },
  { id: 17, name: "Distribución", color: "#14b8a6", category: "support" },
  { id: 18, name: "Dashboard Tienda", color: "#3b82f6", category: "support" },
];

export default function MenuScreen() {
  const router = useRouter();

  const handleMenuPress = (item: any) => {
    console.log(`[Menu] Navegando a: "${item.name}"`);
    console.log(`[Menu] Item completo:`, item);

    // Navegación específica para cada opción
    switch (item.name) {
      case "Proveedores":
        console.log(
          "[Menu] Caso Proveedores detectado, navegando a /providers"
        );
        router.push("/providers");
        break;
      case "Recepción de Proveedores":
        console.log(
          "[Menu] Caso Recepción de Proveedores detectado, navegando a /reception"
        );
        router.push("/reception");
        break;
      case "Dashboard Tienda":
        console.log(
          "[Menu] Caso Dashboard Tienda detectado, navegando a /dashboard"
        );
        router.push("/dashboard");
        break;
      case "Tareas":
        console.log("[Menu] Caso Tareas detectado");
        // router.push('/tareas');
        break;
      case "Clientes":
        console.log("[Menu] Caso Clientes detectado");
        // router.push('/clientes');
        break;
      case "Chat":
        console.log("[Menu] Caso Chat detectado");
        // router.push('/chat');
        break;
      default:
        console.log(
          `[Menu] Función "${item.name}" en desarrollo - no hay caso específico`
        );
        break;
    }
  };

  const getIcon = (name: string) => {
    const icons: { [key: string]: string } = {
      Proveedores: "■",
      "Recepción de Proveedores": "□",
      "Control de Temperaturas": "◆",
      Producción: "●",
      Tareas: "✓",
      Delivery: "▶",
      Clientes: "○",
      Cierres: "▬",
      Objetivos: "◉",
      Premios: "★",
      Chat: "◈",
      "Catálogo de Venta": "◐",
      Averías: "⚠",
      Capacitación: "◑",
      Protocolos: "▣",
      Concursos: "☆",
      Distribución: "▢",
      "Dashboard Tienda": "■",
    };
    return icons[name] || "●";
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.menuContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.mainTitle}>Menú Principal</Text>

        {/* Menú Lineal */}
        <View style={styles.linearMenu}>
          {menuItems.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.menuItem, { borderLeftColor: item.color }]}
              onPress={() => handleMenuPress(item)}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${item.color}15` },
                ]}
              >
                <Text style={[styles.icon, { color: item.color }]}>
                  {getIcon(item.name)}
                </Text>
              </View>
              <Text style={styles.menuText}>{item.name}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* Espaciado para el menú inferior */}
        <View style={styles.bottomMenuSpacer} />
      </ScrollView>

      <BottomMenu activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 100,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 30,
  },
  linearMenu: {
    paddingHorizontal: 0,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  icon: {
    fontSize: 18,
    fontWeight: "bold",
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  menuArrow: {
    fontSize: 20,
    color: "#9ca3af",
    fontWeight: "bold",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
  },
  backButton: {
    backgroundColor: "#10b981",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  // Estilos del Menú Inferior
  bottomMenuSpacer: {
    height: 85,
  },
  bottomMenu: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 85,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  menuItemActive: {
    backgroundColor: "transparent",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuItemBottom: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: 56,
  },
  iconContainerActive: {
    transform: [{ scale: 1.05 }],
  },
  iconContainerBottom: {
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  iconCircleActive: {
    backgroundColor: "#10b981",
    borderColor: "#059669",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  iconCircleBottom: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  menuIcon: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "bold",
  },
  menuIconActive: {
    color: "#ffffff",
    fontSize: 18,
  },
  menuIconBottom: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "bold",
  },
  menuLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6b7280",
    textAlign: "center",
    marginTop: 2,
    lineHeight: 14,
  },
  menuLabelActive: {
    color: "#10b981",
    fontWeight: "600",
    fontSize: 12,
  },
  menuLabelBottom: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6b7280",
    textAlign: "center",
    marginTop: 2,
    lineHeight: 14,
  },
});
