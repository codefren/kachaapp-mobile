import BottomMenu from "@/components/navigation/BottomMenu";
import { useAuth } from "@/context/AuthContext";
import { apiMiddleware } from "@/middleware/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
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
  has_received_orders?: ReceivedOrder | null; // Nombre correcto según API
  order_available_dates?: string[]; // ["Martes 21/10/2025", "Jueves 23/10/2025"]
}

interface HistoricalOrderItem {
  id: number;
  product: number;
  product_name: string;
  product_image: string | null;
  quantity_units: number;
  purchase_unit: string;
  notes: string;
  amount_boxes: number;
}

interface HistoricalOrder {
  id: number;
  provider: number;
  provider_name: string;
  ordered_by: number;
  ordered_by_username: string;
  status: string;
  notes: string;
  market: number;
  items: HistoricalOrderItem[];
  created_at: string;
  updated_at: string;
}

export default function ProvidersScreen() {
  const router = useRouter();
  const { state } = useAuth();

  // Obtener token directamente del apiMiddleware (más confiable)
  const contextToken = state.accessToken;
  const middlewareToken = apiMiddleware.getAuthToken();
  const token = contextToken || middlewareToken;

  console.log("[ProvidersScreen] Renderizando con estado:", {
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

  // Estados para modal de historial
  const [historyModalVisible, setHistoryModalVisible] =
    useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [historicalOrders, setHistoricalOrders] = useState<HistoricalOrder[]>(
    []
  );
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  // Variables de tiempo removidas para simplificar

  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Función para parsear fechas en español
  const parseSpanishDate = useCallback((dateStr: string): Date | null => {
    try {
      // "Martes 21/10/2025" -> extraer "21/10/2025"
      const datePart = dateStr.split(" ")[1];
      if (!datePart) return null;

      const [day, month, year] = datePart.split("/");
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } catch {
      return null;
    }
  }, []);

  // Función para calcular proximidad de pedidos
  const calculateOrderProximity = useCallback(
    (orderDates: string[] | undefined) => {
      if (!orderDates || orderDates.length === 0) {
        return {
          daysUntil: null,
          status: "no_dates" as const,
          badge: "SIN FECHAS",
          color: "#6b7280",
          bgColor: "#f3f4f6",
          priority: 999,
        };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let closestDate: Date | null = null;
      let minDays = Infinity;

      // Encontrar la fecha más próxima
      for (const dateStr of orderDates) {
        const date = parseSpanishDate(dateStr);
        if (date) {
          const diffTime = date.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays >= 0 && diffDays < minDays) {
            minDays = diffDays;
            closestDate = date;
          }
        }
      }

      if (!closestDate || minDays === Infinity) {
        return {
          daysUntil: null,
          status: "no_dates" as const,
          badge: "SIN FECHAS",
          color: "#6b7280",
          bgColor: "#f3f4f6",
          priority: 999,
        };
      }

      // Determinar estado según proximidad
      if (minDays === 0) {
        return {
          daysUntil: 0,
          status: "today" as const,
          badge: "HOY",
          color: "#ffffff",
          bgColor: "#ef4444",
          priority: 1,
        };
      } else if (minDays === 1) {
        return {
          daysUntil: 1,
          status: "tomorrow" as const,
          badge: "MAÑANA",
          color: "#ffffff",
          bgColor: "#f97316",
          priority: 2,
        };
      } else if (minDays <= 3) {
        return {
          daysUntil: minDays,
          status: "soon" as const,
          badge: `${minDays} DÍAS`,
          color: "#92400e",
          bgColor: "#fbbf24",
          priority: 3,
        };
      } else if (minDays <= 7) {
        return {
          daysUntil: minDays,
          status: "week" as const,
          badge: `${minDays} DÍAS`,
          color: "#065f46",
          bgColor: "#10b981",
          priority: 4,
        };
      } else {
        return {
          daysUntil: minDays,
          status: "later" as const,
          badge: `${minDays} DÍAS`,
          color: "#374151",
          bgColor: "#9ca3af",
          priority: 5,
        };
      }
    },
    [parseSpanishDate]
  );

  // Función para ordenar proveedores por proximidad
  const sortProvidersByProximity = useCallback(
    (providers: ProviderItem[]) => {
      return [...providers].sort((a, b) => {
        const proximityA = calculateOrderProximity(a.order_available_dates);
        const proximityB = calculateOrderProximity(b.order_available_dates);

        // Primero por prioridad (menor número = más urgente)
        if (proximityA.priority !== proximityB.priority) {
          return proximityA.priority - proximityB.priority;
        }

        // Luego por nombre alfabéticamente
        return a.name.localeCompare(b.name);
      });
    },
    [calculateOrderProximity]
  );

  // Datos procesados con proximidad
  const processedData = useMemo(() => {
    if (!data) return null;

    return data.map((provider) => ({
      ...provider,
      proximity: calculateOrderProximity(provider.order_available_dates),
    }));
  }, [data, calculateOrderProximity]);

  // Los datos procesados ya no son necesarios para estadísticas
  // pero mantenemos la estructura por si se necesita en el futuro

  // Función para calcular tiempo hasta el próximo evento
  const getTimeContext = useCallback(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilTomorrow = tomorrow.getTime() - now.getTime();
    const hoursUntilTomorrow = Math.floor(msUntilTomorrow / (1000 * 60 * 60));
    const minutesUntilTomorrow = Math.floor(
      (msUntilTomorrow % (1000 * 60 * 60)) / (1000 * 60)
    );

    // Encontrar el próximo día con pedidos disponibles
    let nextOrderDay = null;
    let minDaysUntilOrder = Infinity;

    if (data) {
      for (const provider of data) {
        if (provider.order_available_dates) {
          for (const dateStr of provider.order_available_dates) {
            const date = parseSpanishDate(dateStr);
            if (date) {
              const diffTime = date.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays >= 0 && diffDays < minDaysUntilOrder) {
                minDaysUntilOrder = diffDays;
                nextOrderDay = date;
              }
            }
          }
        }
      }
    }

    return {
      hoursUntilTomorrow,
      minutesUntilTomorrow,
      nextOrderDay,
      daysUntilNextOrder:
        minDaysUntilOrder === Infinity ? null : minDaysUntilOrder,
    };
  }, [data, parseSpanishDate]);

  // Funciones de tiempo del header removidas para simplificar

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const fetchProviders = useCallback(async () => {
    console.log("[Providers] fetchProviders iniciado");

    // Obtener token fresco del middleware
    const currentToken = apiMiddleware.getAuthToken();
    console.log("[Providers] Token desde middleware:", !!currentToken);
    console.log(
      "[Providers] Token preview:",
      currentToken?.substring(0, 20) + "..."
    );

    if (!currentToken) {
      console.log("[Providers] No hay token, saltando fetch");
      setError("No hay token de autenticación");
      setLoading(false);
      return;
    }

    console.log("[Providers] Iniciando fetch con apiMiddleware...");
    setLoading(true);
    setError(null);

    try {
      // Usar apiMiddleware directamente
      const response = await apiMiddleware.get<ProviderItem[]>(
        "/api/providers/",
        true
      );

      console.log(
        "[Providers] Response completa desde apiMiddleware:",
        JSON.stringify(response, null, 2)
      );

      console.log("[Providers] Response desde apiMiddleware:", {
        success: response.success,
        statusCode: response.statusCode,
        hasData: !!response.data,
        dataLength: Array.isArray(response.data) ? response.data.length : 0,
      });

      if (response.success && response.data) {
        const providers = response.data;
        console.log(`[Providers] Loaded ${providers.length} providers`);

        if (Array.isArray(providers)) {
          providers.forEach((provider, index) => {
            console.log(`[Providers] Provider ${index}:`, {
              id: provider.id,
              name: provider.name,
              has_draft_reception: provider.has_draft_reception,
              has_received_orders: provider.has_received_orders,
            });
          });
        }

        // Ordenar proveedores por proximidad de pedidos
        const sortedProviders = sortProvidersByProximity(providers);
        setData(sortedProviders);
      } else {
        throw new Error(response.error || "Error al cargar proveedores");
      }
    } catch (e: any) {
      console.error("[Providers] Error en fetch:", e);
      setError(e?.message || "Error al cargar proveedores");
    } finally {
      setLoading(false);
      console.log("[Providers] Fetch completado");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log("[Providers] useFocusEffect ejecutado");
      fetchProviders();
    }, [fetchProviders])
  );

  useEffect(() => {
    startPulse();
  }, [startPulse]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProviders();
    setRefreshing(false);
  }, [fetchProviders]);

  // Función para buscar órdenes históricas
  const fetchHistoricalOrder = useCallback(async () => {
    console.log("[History] 🔍 Iniciando búsqueda...");
    console.log("[History] 📅 Selected Date:", selectedDate);
    console.log("[History] 🏪 Selected Provider:", selectedProvider);

    if (!selectedProvider || !selectedDate) {
      console.log("[History] ⚠️ Faltan datos: provider o fecha");
      alert("Selecciona un proveedor y una fecha");
      return;
    }

    setLoadingHistory(true);
    setHistoricalOrders([]);

    try {
      // Formatear fecha como YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const url = `/api/purchase-orders/?date=${dateStr}&provider=${selectedProvider}`;
      console.log("[History] 🌐 URL:", url);
      console.log("[History] 📤 Fecha formateada:", dateStr);

      const response = await apiMiddleware.get<HistoricalOrder[]>(url, true);

      console.log(
        "[History] 📥 Response completa:",
        JSON.stringify(response, null, 2)
      );
      console.log("[History] 📊 Response.success:", response.success);
      console.log("[History] 📊 Response.data:", response.data);
      console.log("[History] 📊 Response.error:", response.error);
      console.log("[History] 📊 Response.statusCode:", response.statusCode);

      if (response.success && response.data) {
        const orders = Array.isArray(response.data)
          ? response.data
          : [response.data];
        console.log("[History] ✅ Orders found:", orders.length);
        console.log("[History] 📦 Orders:", JSON.stringify(orders, null, 2));
        setHistoricalOrders(orders);

        if (orders.length === 0) {
          alert(
            `No se encontraron órdenes.\n\nFecha: ${dateStr}\nProveedor ID: ${selectedProvider}`
          );
        }
      } else {
        console.log("[History] ❌ No order found or error");
        console.log("[History] Error message:", response.error);
        alert(
          `No se encontró ninguna orden.\n\nFecha: ${dateStr}\nProveedor ID: ${selectedProvider}\nError: ${response.error || "Sin resultados"}`
        );
      }
    } catch (e: any) {
      console.error("[History] 💥 Exception caught:", e);
      console.error("[History] Exception message:", e?.message);
      console.error("[History] Exception stack:", e?.stack);
      alert(`Error al buscar la orden:\n${e?.message || "Error desconocido"}`);
    } finally {
      setLoadingHistory(false);
      console.log("[History] 🏁 Búsqueda finalizada");
    }
  }, [selectedProvider, selectedDate]);

  const getOrderInfo = (
    item: ProviderItem
  ): {
    inProgress: boolean;
    status: "PLACED" | "DRAFT" | null;
    poId: number | null;
  } => {
    if (item.has_received_orders && item.has_received_orders.order_id) {
      const status = (item.has_received_orders.status || "").toUpperCase() as
        | "PLACED"
        | "DRAFT";
      if (status === "PLACED" || status === "DRAFT") {
        return {
          inProgress: true,
          status,
          poId: item.has_received_orders.order_id,
        };
      }
    }
    if (item.has_draft_reception && item.draft_reception_order_id) {
      return {
        inProgress: true,
        status: "DRAFT",
        poId: item.draft_reception_order_id,
      };
    }
    return { inProgress: false, status: null, poId: null };
  };

  // Función para calcular tiempo restante de forma simple
  const getTimeRemaining = useCallback(
    (orderDates: string[] | undefined) => {
      if (!orderDates || orderDates.length === 0) {
        return { text: "Sin fechas", color: "#9ca3af", urgent: false };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let closestDays = Infinity;

      // Encontrar la fecha más próxima
      for (const dateStr of orderDates) {
        const date = parseSpanishDate(dateStr);
        if (date) {
          const diffTime = date.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < closestDays) {
            closestDays = diffDays;
          }
        }
      }

      if (closestDays === Infinity) {
        return { text: "Sin fechas", color: "#9ca3af", urgent: false };
      }

      // Calcular tiempo restante hasta medianoche si es HOY
      if (closestDays === 0) {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setDate(midnight.getDate() + 1);
        midnight.setHours(0, 0, 0, 0);

        const msRemaining = midnight.getTime() - now.getTime();
        const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
        const minutesRemaining = Math.floor(
          (msRemaining % (1000 * 60 * 60)) / (1000 * 60)
        );

        return {
          text: `${hoursRemaining}h ${minutesRemaining}m`,
          color: "#ef4444",
          urgent: true,
        };
      } else if (closestDays === 1) {
        return { text: "Mañana", color: "#f97316", urgent: true };
      } else if (closestDays <= 3) {
        return { text: `${closestDays} días`, color: "#fbbf24", urgent: false };
      } else {
        return { text: `${closestDays} días`, color: "#10b981", urgent: false };
      }
    },
    [parseSpanishDate]
  );

  const renderItem = ({ item }: { item: ProviderItem }) => {
    const info = getOrderInfo(item);
    const timeRemaining = getTimeRemaining(item.order_available_dates);

    const leftColor = info.inProgress
      ? info.status === "PLACED"
        ? "#10b981"
        : "#f59e0b"
      : timeRemaining.urgent
        ? timeRemaining.color
        : "#e5e7eb";

    const scale = pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.02],
    });
    const opacity = pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.7, 1],
    });

    return (
      <Pressable
        style={[
          styles.card,
          {
            borderLeftColor: leftColor,
            elevation: info.inProgress ? 4 : timeRemaining.urgent ? 3 : 2,
          },
        ]}
        onPress={() => {
          // Navegación según estado del proveedor
          const hasOrders = item.has_received_orders;
          const status = hasOrders?.status?.toUpperCase();
          const orderId = hasOrders?.order_id;

          if (orderId && (status === "DRAFT" || status === "PLACED")) {
            // Ir al detalle de la orden de compra en proceso
            console.log(
              "[Navigation] Navegando a Purchase Order Detail:",
              orderId
            );
            router.push({
              pathname: "/purchase-order-detail",
              params: {
                po_id: orderId,
                provider: item.id,
                provider_name: item.name,
              },
            });
          } else {
            // Si no hay órdenes DRAFT/PLACED, ir a lista de productos del proveedor
            console.log(
              "[Navigation] Navegando a productos del proveedor:",
              item.id
            );
            router.push(
              `/products?provider=${item.id}&provider_name=${encodeURIComponent(item.name)}` as any
            );
          }
        }}
      >
        <View style={styles.cardContent}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: `${leftColor}15`, borderColor: leftColor },
            ]}
          >
            <Text style={[styles.icon, { color: leftColor }]}>
              {info.status === "PLACED"
                ? "■"
                : info.status === "DRAFT"
                  ? "▣"
                  : "○"}
            </Text>
          </View>

          <View style={styles.texts}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.name}+"alfo"</Text>
              <View
                style={[
                  styles.timeChip,
                  { backgroundColor: `${timeRemaining.color}15` },
                ]}
              >
                <Text style={[styles.timeText, { color: timeRemaining.color }]}>
                  {timeRemaining.text}
                </Text>
              </View>
            </View>

            {info.inProgress ? (
              <View style={styles.badgeRow}>
                <Animated.View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        info.status === "PLACED" ? "#10b981" : "#f59e0b",
                      transform: [{ scale }],
                      opacity,
                    },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {info.status === "PLACED" ? "PEDIDO ACTIVO" : "BORRADOR"}
                  </Text>
                </Animated.View>
                <View
                  style={[styles.orderIdBadge, { backgroundColor: "#f3f4f6" }]}
                >
                  <Text style={styles.orderIdText}>#{info.poId}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.subtitle}>Próximo pedido disponible</Text>
            )}
          </View>

          <Text style={styles.chevron}>›</Text>
        </View>
      </Pressable>
    );
  };

  console.log("[Providers] Render - Estado actual:", {
    loading,
    hasData: !!data,
    dataLength: data?.length || 0,
    error,
    refreshing,
  });

  if (loading && !data) {
    console.log("[Providers] Mostrando loading");
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
    console.log("[Providers] Mostrando error:", error);
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

  console.log(
    "[Providers] Renderizando lista con",
    data?.length || 0,
    "proveedores"
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.container}>
        {/* Header mejorado */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Proveedores(1)</Text>
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
              {/* Botón de Historial */}
              <Pressable
                style={styles.historyButton}
                onPress={() => {
                  console.log("[History] 📜 Abriendo modal de historial");
                  setHistoryModalVisible(true);
                }}
              >
                <View style={styles.calendarIcon}>
                  <View style={styles.calendarTop} />
                  <View style={styles.calendarBody}>
                    <View style={styles.calendarDots}>
                      <View style={styles.calendarDot} />
                      <View style={styles.calendarDot} />
                      <View style={styles.calendarDot} />
                    </View>
                  </View>
                </View>
                <Text style={styles.historyButtonText}>Historial</Text>
              </Pressable>

              <View style={styles.countBadge}>
                <Text style={styles.countNumber}>{data?.length || 0}</Text>
                <Text style={styles.countLabel}>Total</Text>
              </View>
            </View>
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
                <Text style={styles.debugInfo}>
                  Token: {token ? "Disponible" : "No disponible"}
                </Text>
                <Text style={styles.debugInfo}>
                  Estado:{" "}
                  {state.isAuthenticated ? "Autenticado" : "No autenticado"}
                </Text>
              </View>
            ) : null
          }
        />
      </View>

      {/* Modal de Historial */}
      <Modal
        visible={historyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Historial de Órdenes</Text>
              <Pressable onPress={() => setHistoryModalVisible(false)}>
                <Text style={styles.modalCloseButton}>×</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Selector de Fecha */}
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Fecha</Text>
                <Pressable
                  style={styles.dateButton}
                  onPress={() => {
                    console.log("[History] 📅 Abriendo DatePicker...");
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={styles.dateButtonText}>
                    {selectedDate.toLocaleDateString("es-ES", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </Pressable>
              </View>

              {/* DateTimePicker - se muestra cuando showDatePicker es true */}
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    console.log("[History] 📅 DatePicker onChange:", {
                      event: event.type,
                      date,
                    });
                    setShowDatePicker(false);
                    if (date) {
                      console.log(
                        "[History] 📅 Nueva fecha seleccionada:",
                        date
                      );
                      setSelectedDate(date);
                    }
                  }}
                />
              )}

              {/* Selector de Proveedor */}
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Proveedor</Text>
                <View style={styles.providerSelectContainer}>
                  {data?.map((provider) => (
                    <Pressable
                      key={provider.id}
                      style={[
                        styles.providerOption,
                        selectedProvider === provider.id &&
                          styles.providerOptionSelected,
                      ]}
                      onPress={() => {
                        console.log(
                          "[History] 🏪 Proveedor seleccionado:",
                          provider.id,
                          "-",
                          provider.name
                        );
                        setSelectedProvider(provider.id);
                      }}
                    >
                      <View
                        style={[
                          styles.providerRadio,
                          selectedProvider === provider.id &&
                            styles.providerRadioSelected,
                        ]}
                      >
                        {selectedProvider === provider.id && (
                          <View style={styles.providerRadioDot} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.providerOptionText,
                          selectedProvider === provider.id &&
                            styles.providerOptionTextSelected,
                        ]}
                      >
                        {provider.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Botón de Búsqueda */}
              <Pressable
                style={[
                  styles.searchButton,
                  loadingHistory && styles.searchButtonDisabled,
                ]}
                onPress={() => {
                  console.log('[History] 🔎 Botón "Buscar Orden" presionado');
                  fetchHistoricalOrder();
                }}
                disabled={loadingHistory}
              >
                {loadingHistory ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.searchButtonText}>Buscar Orden</Text>
                )}
              </Pressable>

              {/* Resultados */}
              {historicalOrders.length > 0 && (
                <View>
                  <Text style={styles.resultTitle}>
                    Órdenes Encontradas ({historicalOrders.length})
                  </Text>
                  {historicalOrders.map((order, orderIndex) => (
                    <View key={order.id} style={styles.resultContainer}>
                      {/* Header de la orden */}
                      <View style={styles.orderHeader}>
                        <Text style={styles.historyOrderIdText}>
                          Orden #{order.id}
                        </Text>
                        <View
                          style={[
                            styles.statusChip,
                            {
                              backgroundColor:
                                order.status === "PLACED"
                                  ? "#10b981"
                                  : order.status === "SHIPPED"
                                    ? "#3b82f6"
                                    : "#f59e0b",
                            },
                          ]}
                        >
                          <Text style={styles.statusChipText}>
                            {order.status}
                          </Text>
                        </View>
                      </View>

                      {/* Información de la orden */}
                      <View style={styles.resultInfo}>
                        <View style={styles.resultRow}>
                          <Text style={styles.resultLabel}>Proveedor:</Text>
                          <Text style={styles.resultValue}>
                            {order.provider_name}
                          </Text>
                        </View>
                        <View style={styles.resultRow}>
                          <Text style={styles.resultLabel}>Ordenado por:</Text>
                          <Text style={styles.resultValue}>
                            {order.ordered_by_username}
                          </Text>
                        </View>
                        <View style={styles.resultRow}>
                          <Text style={styles.resultLabel}>
                            Fecha creación:
                          </Text>
                          <Text style={styles.resultValue}>
                            {new Date(order.created_at).toLocaleDateString(
                              "es-ES",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </Text>
                        </View>
                      </View>

                      {/* Lista de productos */}
                      <Text style={styles.itemsTitle}>
                        Productos ({order.items.length})
                      </Text>
                      {order.items.map(
                        (item: HistoricalOrderItem, index: number) => (
                          <View key={item.id} style={styles.itemCard}>
                            <View style={styles.itemHeader}>
                              <Text style={styles.itemProductName}>
                                {item.product_name}
                              </Text>
                            </View>
                            <View style={styles.itemRow}>
                              <Text style={styles.itemLabel}>Cantidad:</Text>
                              <Text style={styles.itemValue}>
                                {item.quantity_units} {item.purchase_unit}
                              </Text>
                            </View>
                            <View style={styles.itemRow}>
                              <Text style={styles.itemLabel}>Cajas:</Text>
                              <Text style={styles.itemValue}>
                                {item.amount_boxes}
                              </Text>
                            </View>
                            {item.notes && (
                              <View style={styles.itemRow}>
                                <Text style={styles.itemLabel}>Notas:</Text>
                                <Text style={styles.itemValue}>
                                  {item.notes}
                                </Text>
                              </View>
                            )}
                          </View>
                        )
                      )}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  timeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 60,
    alignItems: "center",
  },
  timeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
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
  muted: { fontSize: 12, color: "#6b7280" },
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
    fontSize: 28,
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
  // Estilos de tiempo y summary removidos para simplificar el diseño
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
  debugInfo: { fontSize: 12, color: "#9ca3af", marginTop: 4 },

  // Estilos del botón de historial
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    gap: 6,
  },
  historyButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },

  // Icono de calendario
  calendarIcon: {
    width: 20,
    height: 20,
    position: "relative",
  },
  calendarTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: "#10b981",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  calendarBody: {
    position: "absolute",
    top: 5,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#374151",
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    borderWidth: 1.5,
    borderColor: "#374151",
    borderTopWidth: 0,
  },
  calendarDots: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 3,
    marginTop: 4,
  },
  calendarDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#10b981",
  },

  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 500,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  modalCloseButton: {
    fontSize: 32,
    color: "#6b7280",
    lineHeight: 32,
  },
  modalContent: {
    padding: 20,
  },
  modalField: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },

  // Selector de fecha
  dateButton: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
  },
  dateButtonText: {
    fontSize: 14,
    color: "#111827",
    textTransform: "capitalize",
  },

  // Selector de proveedor
  providerSelectContainer: {
    gap: 8,
  },
  providerOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  providerOptionSelected: {
    backgroundColor: "#dbeafe",
    borderColor: "#3b82f6",
  },
  providerRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  providerRadioSelected: {
    borderColor: "#3b82f6",
  },
  providerRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3b82f6",
  },
  providerOptionText: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  providerOptionTextSelected: {
    fontWeight: "600",
    color: "#1e40af",
  },

  // Botón de búsqueda
  searchButton: {
    backgroundColor: "#10b981",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  searchButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  searchButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Resultados
  resultContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 24,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  historyOrderIdText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  resultInfo: {
    gap: 10,
    marginBottom: 16,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  resultValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusChipText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 8,
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  itemHeader: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  itemProductName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6b7280",
  },
  itemValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
});
