import BottomMenu from "@/components/navigation/BottomMenu";
import { useAuth } from "@/context/AuthContext";
import { apiMiddleware } from "@/middleware/api";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";

import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ProviderItem {
  id: number;
  invoice_image_url: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T; // La propiedad 'data' puede ser undefined si 'success' es false o si no hay resultados
  statusCode: number;
}

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
const screenWidth = Dimensions.get("window").width;

export default function ReceptionHistoricalGeneral() {
  const router = useRouter();
  const { state } = useAuth();

  const contextToken = state.accessToken;
  const middlewareToken = apiMiddleware.getAuthToken();
  const token = contextToken || middlewareToken;

  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  console.log("[ReceptionScreen] 🔄 Renderizando con estado:", {
    isAuthenticated: state.isAuthenticated,
    hasContextToken: !!contextToken,
    hasMiddlewareToken: !!middlewareToken,
    hasToken: !!token,
    tokenLength: token?.length || 0,
    user: state.user?.username,
    marketName: state.marketName,
  });

  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [hasSelectedDate, setHasSelectedDate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [invoices, setInvoices] = useState<ProviderItem[]>([]);

  const [data, setData] = useState<ProviderItem[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const DateInputTrigger: React.FC<{ date: Date; onPress: () => void }> = ({
    date,
    onPress,
  }) => {
    const formattedDate = date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    return (
      <Pressable style={styles.dateInputContainer} onPress={onPress}>
        <Text style={styles.dateInputText}>{formattedDate}</Text>
        <Text style={styles.dateInputIcon}>📅</Text>
      </Pressable>
    );
  };

  const togglePicker = () => {
    setShowPicker((prev) => !prev);
  };

  const handleSearchByDate = () => {
    setInvoices([]);
    setFilterDate("");
    // Implementa aquí la lógica para buscar los datos históricos
    const dateToSearch = date.toLocaleDateString("en-CA"); // Ejemplo de formato yyyy-mm-dd
    console.log(`[Busqueda] Iniciando búsqueda para la fecha: ${dateToSearch}`);
    // fetchProviders(dateToSearch);
    // Por ahora, solo simulamos la acción:
    alert(`Buscando facturas recibidas para la fecha: ${dateToSearch}`);
    setFilterDate(dateToSearch);
    fetchFilterInvoices();
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    // Es necesario ocultar el picker inmediatamente después de la selección en iOS/Android
    setShowPicker(false);

    if (selectedDate) {
      setDate(selectedDate);
      setHasSelectedDate(true); // Indica que ya se seleccionó una fecha
      console.log("Fecha seleccionada:", selectedDate.toLocaleDateString());
    }
  };

  const fetchFilterInvoices = useCallback(async () => {
    console.log(
      "═══════════════════════════════════════════════════════════════"
    );
    console.log("[fetchFilterInvoices] 🚀 fetchFilterInvoices INICIADO");
    console.log(
      "═══════════════════════════════════════════════════════════════"
    );

    const currentToken = apiMiddleware.getAuthToken();
    console.log(
      "[fetchFilterInvoices] 🔑 Token desde middleware:",
      !!currentToken
    );
    console.log(
      "[fetchFilterInvoices] 🔑 Token preview:",
      currentToken?.substring(0, 20) + "..."
    );

    if (!currentToken) {
      console.log("[fetchFilterInvoices] ❌ No hay token, saltando fetch");
      setError("No hay token de autenticación");
      setLoading(false);
      return;
    }

    console.log(
      "[fetchFilterInvoices] 📡 Iniciando fetchFilterInvoices con apiMiddleware..."
    );
    console.log(
      "[fetchFilterInvoices] 🎯 Endpoint: /api/receptions/completed/?date=${date}"
    );
    setLoading(true);
    setError(null);

    try {
      const response = await apiMiddleware.get<ProviderItem[]>(
        `/api/receptions/completed/?date=${filterDate}`,
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
        "[fetchFilterInvoices] 📦 Response completa:",
        JSON.stringify(response, null, 2)
      );
      console.log(`Fecha de busqueda:: ${filterDate}`);

      console.log(
        "┌─────────────────────────────────────────────────────────────┐"
      );
      console.log(
        "│ RESUMEN DE LA RESPUESTA                                     │"
      );
      console.log(
        "└─────────────────────────────────────────────────────────────┘"
      );
      console.log("[fetchFilterInvoices] ✅ Success:", response.success);
      console.log("[fetchFilterInvoices] 📊 Status Code:", response.statusCode);
      console.log("[fetchFilterInvoices] 📋 Has Data:", !!response.data);
      console.log(
        "[fetchFilterInvoices] 🔢 Data Length:",
        Array.isArray(response.data) ? response.data.length : 0
      );

      if (response.success && response.data) {
        if (response.data.length > 0) {
          setInvoices(response.data);
        } else {
          // Caso 1: La llamada fue exitosa, pero el arreglo está vacío.
          setError("No se encontraron facturas para la fecha seleccionada.");
        }
      } else {
        // Caso 2: La llamada fue un fracaso (success: false)
        setError("Error en la solicitud de facturas. Intente de nuevo.");
      }
      //     console.log(
      //       `[ReceptionScreen] ✅ Loaded ${providers.length} providers`
      //     );
      //     console.log("");

      //     if (Array.isArray(providers)) {
      //       console.log(
      //         "┌─────────────────────────────────────────────────────────────┐"
      //       );
      //       console.log(
      //         "│ DETALLE DE CADA PROVEEDOR                                   │"
      //       );
      //       console.log(
      //         "└─────────────────────────────────────────────────────────────┘"
      //       );
      //       providers.forEach((provider, index) => {
      //         console.log(
      //           `\n[ReceptionScreen] 👤 Provider ${index + 1}/${providers.length}:`
      //         );
      //         console.log("  ├─ ID:", provider.id);
      //         console.log("  ├─ Name:", provider.name);
      //         console.log(
      //           "  ├─ has_draft_reception:",
      //           provider.has_draft_reception
      //         );
      //         console.log(
      //           "  ├─ draft_reception_order_id:",
      //           provider.draft_reception_order_id
      //         );
      //         console.log(
      //           "  ├─ last_shipped_order_id:",
      //           provider.last_shipped_order_id
      //         );
      //         console.log(
      //           "  ├─ has_received_orders:",
      //           JSON.stringify(provider.has_received_orders, null, 2)
      //         );
      //         console.log(
      //           "  └─ order_available_dates:",
      //           JSON.stringify(provider.order_available_dates, null, 2)
      //         );
      //       });
      //       console.log(
      //         "\n═══════════════════════════════════════════════════════════════"
      //       );
      //       console.log("[ReceptionScreen] 🎉 FETCH COMPLETADO CON ÉXITO");
      //       console.log(
      //         "═══════════════════════════════════════════════════════════════\n"
      //       );
      //     }

      //     // Filtrar solo proveedores con last_shipped_order_id
      //     const providersWithShippedOrders = providers.filter(
      //       (p) => p.last_shipped_order_id
      //     );
      //     console.log(
      //       `[ReceptionScreen] 📦 Proveedores filtrados con pedidos enviados: ${providersWithShippedOrders.length}`
      //     );
      //     setData(providersWithShippedOrders);
      //   } else {
      //     throw new Error(response.error || "Error al cargar proveedores");
      // }
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
  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Facturas Recibidas</Text>
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
          </View>
        </View>

        {/* 1. SECCIÓN DE FILTRO */}
        <View style={styles.filterContainer}>
          <Text style={styles.sectionHeader}>Filtrar facturas por Fecha</Text>

          {/* Input que dispara el Picker */}
          <DateInputTrigger date={date} onPress={togglePicker} />

          {/* DateTimePicker (solo visible cuando showPicker es true) */}
          {showPicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
            />
          )}

          {/* Botón Buscar por Fecha */}
          {(showPicker || hasSelectedDate) && (
            <Pressable style={styles.searchButton} onPress={handleSearchByDate}>
              <Text style={styles.searchButtonText}>Buscar por Fecha</Text>
            </Pressable>
          )}
        </View>

        {/* 2. SECCIÓN DE RESULTADOS DE FACTURAS */}
        <View style={styles.resultsContainer}>
          <Text style={styles.sectionHeader}>Facturas Recibidas</Text>

          {/* Indicador de carga */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loadingText}>Cargando facturas...</Text>
            </View>
          )}

          {/* Mensaje de error */}
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Renderizado de Facturas en Cuadrícula (Grid) */}
          {invoices.length > 0 && (
            // NOTA: No necesitamos un ScrollView interno aquí, ya que el contenedor principal ya lo tiene.
            <View style={styles.invoiceList}>
              {invoices.map((invoice) => (
                <View key={invoice.id} style={styles.invoiceCard}>
                  <Text style={styles.invoiceText}>Factura #{invoice.id}</Text>
                  <Image
                    source={{ uri: invoice.invoice_image_url }}
                    style={styles.invoiceImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </View>
          )}

          {/* Mensaje por defecto si no hay resultados */}
          {!isLoading && !error && invoices.length === 0 && (
            <View style={styles.cardContent}>
              <View style={styles.texts}>
                <Text style={styles.name}>
                  Usa el filtro para encontrar facturas por fecha.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomMenu activeTab="tools" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    // Necesario para que el ScrollView se estire si el contenido es menor que la pantalla
    flexGrow: 1,
    paddingBottom: 20, // Espacio al final del contenido desplazable
  },
  headerText: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    color: "#1a1a40",
    textAlign: "center",
  },
  searchButtonPressed: {
    backgroundColor: "#4338CA",
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
  invoiceImage: {
    width: "100%",
    height: screenWidth * 0.45, // Altura ajustada para que se vea bien en la mitad de la pantalla
    borderRadius: 6,
    backgroundColor: "#D1D5DB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
  invoiceCard: {
    width: "50%", // Cada tarjeta ocupa exactamente la mitad del ancho del contenedor
    paddingHorizontal: 8, // Espacio horizontal entre las tarjetas
    marginBottom: 16, // Espacio vertical entre las filas
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
  resultsContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  invoiceText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
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
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    marginBottom: 10,
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
  invoiceList: {
    flexDirection: "row", // Organizar elementos en una fila
    flexWrap: "wrap", // Permitir que los elementos salten a la siguiente fila
    marginHorizontal: -8, // Contrarrestar el margen lateral de las tarjetas
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
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 10,
  },
  dateInputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  dateInputText: {
    fontSize: 16,
    color: "#111827",
  },
  dateInputIcon: {
    fontSize: 18,
    color: "#6b7280",
  },
  searchButton: {
    backgroundColor: "#10b981",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  searchButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
