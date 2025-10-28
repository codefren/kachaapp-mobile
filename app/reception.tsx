import BottomMenu from "@/components/navigation/BottomMenu";
import { useAuth } from "@/context/AuthContext";
import { apiMiddleware } from "@/middleware/api";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ReceivedOrder {
  status: "PLACED" | "DRAFT" | string;
  order_id: number;
}

interface ProviderItem {
  id: number;
  name: string;
  has_draft_reception?: boolean;
  draft_reception_order_id?: number | null;
  last_shipped_order_id?: number | null;
  has_received_orders?: ReceivedOrder | null;
  order_available_dates?: string[];
}

export default function ReceptionScreen() {
  const router = useRouter();
  const { state } = useAuth();

  const contextToken = state.accessToken;
  const middlewareToken = apiMiddleware.getAuthToken();
  const token = contextToken || middlewareToken;

  console.log("[ReceptionScreen] 🔄 Renderizando con estado:", {
    isAuthenticated: state.isAuthenticated,
    hasContextToken: !!contextToken,
    hasMiddlewareToken: !!middlewareToken,
    hasToken: !!token,
    tokenLength: token?.length || 0,
    user: state.user?.username,
    marketName: state.marketName,
  });

  const [data, setData] = useState<ProviderItem[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchProviders = useCallback(async () => {
    console.log(
      "═══════════════════════════════════════════════════════════════"
    );
    console.log("[ReceptionScreen] 🚀 fetchProviders INICIADO");
    console.log(
      "═══════════════════════════════════════════════════════════════"
    );

    const currentToken = apiMiddleware.getAuthToken();
    console.log("[ReceptionScreen] 🔑 Token desde middleware:", !!currentToken);
    console.log("[ReceptionScreen] 🔑 Token preview:", currentToken);

    if (!currentToken) {
      console.log("[ReceptionScreen] ❌ No hay token, saltando fetch");
      setError("No hay token de autenticación");
      setLoading(false);
      return;
    }

    console.log("[ReceptionScreen] 📡 Iniciando fetch con apiMiddleware...");
    console.log("[ReceptionScreen] 🎯 Endpoint: /api/providers/");
    setLoading(true);
    setError(null);

    try {
      const response = await apiMiddleware.get<ProviderItem[]>(
        "/api/providers/",
        true
      );

      console.log(
        "┌─────────────────────────────────────────────────────────────┐"
      );
      console.log(
        "│ RESPONSE COMPLETA DEL ENDPOINT                              │"
      );
      console.log(
        "└─────────────────────────────────────────────────────────────┘"
      );
      console.log(
        "[ReceptionScreen] 📦 Response completa:",
        JSON.stringify(response, null, 2)
      );
      console.log("");

      console.log(
        "┌─────────────────────────────────────────────────────────────┐"
      );
      console.log(
        "│ RESUMEN DE LA RESPUESTA                                     │"
      );
      console.log(
        "└─────────────────────────────────────────────────────────────┘"
      );
      console.log("[ReceptionScreen] ✅ Success:", response.success);
      console.log("[ReceptionScreen] 📊 Status Code:", response.statusCode);
      console.log("[ReceptionScreen] 📋 Has Data:", !!response.data);
      console.log(
        "[ReceptionScreen] 🔢 Data Length:",
        Array.isArray(response.data) ? response.data.length : 0
      );
      console.log("");

      if (response.success && response.data) {
        const providers = response.data;
        console.log(
          `[ReceptionScreen] ✅ Loaded ${providers.length} providers`
        );
        console.log("");

        if (Array.isArray(providers)) {
          console.log(
            "┌─────────────────────────────────────────────────────────────┐"
          );
          console.log(
            "│ DETALLE DE CADA PROVEEDOR                                   │"
          );
          console.log(
            "└─────────────────────────────────────────────────────────────┘"
          );
          providers.forEach((provider, index) => {
            console.log(
              `\n[ReceptionScreen] 👤 Provider ${index + 1}/${providers.length}:`
            );
            console.log("  ├─ ID:", provider.id);
            console.log("  ├─ Name:", provider.name);
            console.log(
              "  ├─ has_draft_reception:",
              provider.has_draft_reception
            );
            console.log(
              "  ├─ draft_reception_order_id:",
              provider.draft_reception_order_id
            );
            console.log(
              "  ├─ last_shipped_order_id:",
              provider.last_shipped_order_id
            );
            console.log(
              "  ├─ has_received_orders:",
              JSON.stringify(provider.has_received_orders, null, 2)
            );
            console.log(
              "  └─ order_available_dates:",
              JSON.stringify(provider.order_available_dates, null, 2)
            );
          });
          console.log(
            "\n═══════════════════════════════════════════════════════════════"
          );
          console.log("[ReceptionScreen] 🎉 FETCH COMPLETADO CON ÉXITO");
          console.log(
            "═══════════════════════════════════════════════════════════════\n"
          );
        }

        // Filtrar solo proveedores con last_shipped_order_id
        const providersWithShippedOrders = providers.filter(
          (p) => p.last_shipped_order_id
        );
        console.log(
          `[ReceptionScreen] 📦 Proveedores filtrados con pedidos enviados: ${providersWithShippedOrders.length}`
        );
        setData(providersWithShippedOrders);
      } else {
        throw new Error(response.error || "Error al cargar proveedores");
      }
    } catch (e: any) {
      console.error(
        "═══════════════════════════════════════════════════════════════"
      );
      console.error("[ReceptionScreen] ❌ ERROR EN FETCH:", e);
      console.error(
        "═══════════════════════════════════════════════════════════════"
      );
      setError(e?.message || "Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log("[ReceptionScreen] 🔄 useFocusEffect ejecutado");
      fetchProviders();
    }, [fetchProviders])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProviders();
    setRefreshing(false);
  }, [fetchProviders]);

  const handleProviderPress = (item: ProviderItem) => {
    console.log("[ReceptionScreen] 👆 Provider seleccionado:", {
      id: item.id,
      name: item.name,
      last_shipped_order_id: item.last_shipped_order_id,
    });

    if (!item.last_shipped_order_id) {
      alert("Este proveedor no tiene pedidos enviados para recepcionar");
      return;
    }

    // Navegar a la pantalla de recepción de productos
    router.push({
      pathname: "/reception-products",
      params: {
        order_id: item.last_shipped_order_id,
        provider_id: item.id,
        provider_name: item.name,
      },
    });
  };

  const renderItem = ({ item }: { item: ProviderItem }) => {
    const hasReceivedOrders = item.has_received_orders;
    const leftColor = hasReceivedOrders ? "#10b981" : "#e5e7eb";

    return (
      <Pressable
        style={[styles.card, { borderLeftColor: leftColor }]}
        onPress={() => handleProviderPress(item)}
      >
        <View style={styles.cardContent}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: `${leftColor}15`, borderColor: leftColor },
            ]}
          >
            <Text style={[styles.icon, { color: leftColor }]}>
              {hasReceivedOrders ? "■" : "○"}
            </Text>
          </View>

          <View style={styles.texts}>
            <Text style={styles.name}>{item.name}</Text>
            {hasReceivedOrders ? (
              <View style={styles.badgeRow}>
                <View
                  style={[styles.statusBadge, { backgroundColor: "#10b981" }]}
                >
                  <Text style={styles.statusText}>ORDEN RECIBIDA</Text>
                </View>
                <View
                  style={[styles.orderIdBadge, { backgroundColor: "#f3f4f6" }]}
                >
                  <Text style={styles.orderIdText}>
                    #{hasReceivedOrders.order_id}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.subtitle}>Sin órdenes recibidas</Text>
            )}
          </View>

          <Text style={styles.chevron}>›</Text>
        </View>
      </Pressable>
    );
  };

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.center}>
          <ActivityIndicator color="#10b981" size="large" />
          <Text style={styles.loadingText}>Cargando proveedores...</Text>
        </View>
        <BottomMenu activeTab="tools" />
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchProviders}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
        <BottomMenu activeTab="tools" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Recepción de Proveedores</Text>
              <View style={styles.headerStatusBadge}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: token ? "#10b981" : "#ef4444" },
                  ]}
                />
                <Text style={styles.headerStatusText}>
                  {token ? "Conectado" : "Sin conexión"}
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <View style={styles.countBadge}>
                <Text style={styles.countNumber}>{data?.length || 0}</Text>
                <Text style={styles.countLabel}>Total</Text>
              </View>
            </View>
          </View>

          <View style={styles.filterBottom}>
            <Button
              title="Histórico General"
              color="#10b981"
              onPress={() =>
                router.push({
                  pathname: "/reception-filter-general",
                  params: {
                    providerId: 2,
                  },
                })
              }
            />
          </View>
        </View>

        <FlatList
          data={data || []}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.mutedEmpty}>No hay proveedores</Text>
              </View>
            ) : null
          }
        />
      </View>
      <BottomMenu activeTab="tools" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: { flex: 1, backgroundColor: "#f8fafc" },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  cardContent: { flexDirection: "row", alignItems: "center" },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  icon: { fontSize: 16, fontWeight: "bold", color: "#374151" },
  texts: { flex: 1, marginLeft: 12 },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  orderIdBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  orderIdText: {
    color: "#374151",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
  },
  mutedEmpty: { textAlign: "center", color: "#6b7280", marginTop: 24 },
  chevron: {
    fontSize: 20,
    color: "#9ca3af",
    fontWeight: "bold",
    marginLeft: 8,
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  headerStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  headerStatusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
  },
  countBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 60,
  },
  countNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    lineHeight: 24,
  },
  countLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6b7280",
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    padding: 16,
  },
  loadingText: { marginTop: 12, color: "#6b7280", fontSize: 16 },
  errorText: {
    color: "#ef4444",
    marginBottom: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: "#10b981",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: { color: "#fff", fontWeight: "700" },
  emptyContainer: { alignItems: "center", padding: 32 },
  filterBottom: {
    flexDirection: "row",
  },
});
