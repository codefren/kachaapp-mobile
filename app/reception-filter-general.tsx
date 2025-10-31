import BottomMenu from "@/components/navigation/BottomMenu";
import { useAuth } from "@/context/AuthContext";
import { apiMiddleware } from "@/middleware/api";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
const FALLBACK_IMAGE = require("../assets/images/default.png");

import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
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
  data?: T;
  statusCode: number;
}

interface ReceivedOrder {
  status: "PLACED" | "DRAFT" | string;
  order_id: number;
}

interface detailInvoice {
  id: number;
  invoice_image_url: string;
  invoice_date: string;
  invoice_time: string;
  invoice_total: string;
  created_at: string;
  items: any[];
  market_id: number;
  purchase_order_id: number;
  status: string;
  error?: string;
}

interface InvoiceDetailsModalProps {
  visible: boolean;
  details: detailInvoice | null;
  isLoading: boolean;
  onClose: () => void;
  onZoom: () => void;
}

interface FullScreenImageViewerProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
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

// ---------------------------------------------------
// START: FullScreenImageViewer
// ---------------------------------------------------
const FullScreenImageViewer: React.FC<FullScreenImageViewerProps> = ({
  visible,
  imageUrl,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
      animationType="fade"
    >
      <Pressable style={styles.fullScreenOverlay} onPress={onClose}>
        {/* Botón de cerrar */}
        <Pressable
          style={styles.fullScreenCloseButton}
          onPress={onClose}
          hitSlop={20}
          aria-label="Cerrar visor"
        >
          <Text style={styles.fullScreenCloseText}>X</Text>
        </Pressable>

        <View style={styles.fullScreenImageContainer}>
          <Image
            source={imageUrl ? { uri: imageUrl } : FALLBACK_IMAGE}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
        </View>
      </Pressable>
    </Modal>
  );
};
// ---------------------------------------------------
// END: FullScreenImageViewer
// ---------------------------------------------------

// ---------------------------------------------------
// START: InvoiceDetailsModal
// ---------------------------------------------------
const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  visible,
  details,
  isLoading,
  onClose,
  onZoom,
}) => {
  const statusColor =
    details?.status === "COMPLETED" ? styles.statusGreen : styles.statusYellow;

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
      animationType="slide"
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={styles.modalContent}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Botón de cerrar */}
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={20}
            aria-label="Cerrar detalles"
          >
            <Text style={styles.closeButtonText}>X</Text>
          </Pressable>

          {isLoading && (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.loadingTextModal}>Buscando detalles...</Text>
            </View>
          )}

          {/* Contenido de los detalles */}
          {!isLoading && details && (
            <ScrollView contentContainerStyle={styles.detailsScrollView}>
              <Text style={styles.detailsTitleRN}>
                Detalle de Factura #{details.id}
              </Text>

              {/* Contenedor de la Imagen con Lupa */}
              <View style={styles.imageZoomContainer}>
                <Image
                  source={
                    details.invoice_image_url
                      ? { uri: details.invoice_image_url }
                      : FALLBACK_IMAGE
                  }
                  style={styles.detailsImageRN}
                  resizeMode="cover"
                />
                {/* Botón de Lupa/Zoom */}
                <Pressable
                  onPress={onZoom}
                  style={styles.zoomButton}
                  hitSlop={10}
                  aria-label="Ver imagen en pantalla completa"
                >
                  <Text style={styles.zoomIcon}>🔍</Text>
                </Pressable>
              </View>

              {/* Tabla del detalle */}
              <View style={styles.infoTableContainer}>
                {/* Fila 1 */}
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Fecha de Factura:</Text>
                  <Text style={styles.detailsValue}>
                    {details.invoice_date}
                  </Text>
                </View>
                {/* Fila 2 */}
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Total:</Text>
                  <Text style={styles.detailsTotalValue}>
                    €{details.invoice_total}
                  </Text>
                </View>
                {/* Fila 3 */}
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Hora:</Text>
                  <Text style={styles.detailsValue}>
                    {details.invoice_time}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}

          {/* Mensaje de Error */}
          {!isLoading && details?.error && (
            <View style={styles.errorContainerModal}>
              <Text style={styles.errorTextModal}>{details.error}</Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};
// ---------------------------------------------------
// END: InvoiceDetailsModal
// ---------------------------------------------------

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

  // --- Estados para la funcionalidad del modal ---
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [selectedDetails, setSelectedDetails] = useState<detailInvoice | null>(
    null
  );
  const [isFetchingDetails, setIsFetchingDetails] = React.useState(false);

  const [showImageFullScreen, setShowImageFullScreen] = useState(false);

  const [selectedInvoiceUrl, setSelectedInvoiceUrl] = useState("");

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

    const dateToSearch = date.toLocaleDateString("en-CA");
    console.log(`[Busqueda] Iniciando búsqueda para la fecha: ${dateToSearch}`);

    setFilterDate(dateToSearch);
    fetchFilterInvoices(dateToSearch);
  };

  const handleCloseZoom = () => {
    setShowImageFullScreen(false);
    setShowDetailsModal(true);
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    setShowPicker(false);

    if (selectedDate) {
      setDate(selectedDate);
      setHasSelectedDate(true);
      console.log("Fecha seleccionada:", selectedDate.toLocaleDateString());
    }
  };

  const fetchInvoiceDetails = async (invoiceId: Number, imageUrl: string) => {
    // 1. Mostrar el modal en estado de carga
    // setSelectedDetails(null);
    setIsFetchingDetails(true);
    setShowDetailsModal(true);
    setSelectedInvoiceUrl(imageUrl);

    try {
      const response = await apiMiddleware.get<detailInvoice>(
        `/api/receptions/${invoiceId}`,
        true
      );

      if (response && response.data) {
        setSelectedInvoiceUrl(response.data.invoice_image_url || imageUrl);
        setSelectedDetails(response.data);
      }
      // 2. Actualizar estado con los datos obtenidos
    } catch (err) {
      console.error("Error fetching invoice details:", err);
      setSelectedDetails({
        error: "No se pudieron cargar los detalles de la factura.",
      } as detailInvoice);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleZoom = () => {
    setShowDetailsModal(false);
    setShowImageFullScreen(true);
  };

  const fetchFilterInvoices = useCallback(async (searchDate: string) => {
    const dateToUse = searchDate || filterDate;

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
        `/api/receptions/completed/?date=${dateToUse}`,
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
      console.log(`Fecha de busqueda:: ${dateToUse}`);

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
          setError("No se encontraron facturas para la fecha seleccionada.");
        }
      } else {
        setError("Error en la solicitud de facturas. Intente de nuevo.");
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
  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.mainLayout}>
        {/* Header (ESTÁTICO) */}
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

        {/* 1. SECCIÓN DE FILTRO (ESTÁTICA) */}
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

        {/* 2. RESULTADOS DE FACTURAS */}
        <ScrollView
          style={styles.resultsScroll}
          contentContainerStyle={styles.scrollContent}
        >
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
              <View style={styles.invoiceList}>
                {invoices.map((invoice) => (
                  <Pressable
                    key={invoice.id}
                    style={styles.invoiceCard}
                    onPress={() =>
                      fetchInvoiceDetails(invoice.id, invoice.invoice_image_url)
                    }
                  >
                    <Text style={styles.invoiceText}>
                      Factura #{invoice.id}
                    </Text>
                    <Image
                      source={{ uri: invoice.invoice_image_url }}
                      style={styles.invoiceImage}
                      resizeMode="contain"
                    />
                  </Pressable>
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
      </View>

      {/* Menú Inferior (ESTÁTICO) */}
      <BottomMenu activeTab="tools" />

      {/* MODALES DE DETALLES */}
      <InvoiceDetailsModal
        visible={showDetailsModal}
        details={selectedDetails}
        isLoading={isFetchingDetails}
        onClose={() => setShowDetailsModal(false)}
        onZoom={handleZoom}
      />

      <FullScreenImageViewer
        visible={showImageFullScreen}
        imageUrl={selectedInvoiceUrl}
        onClose={handleCloseZoom}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  mainLayout: {
    flex: 1,
  },
  resultsScroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalLoading: {
    padding: 40,
    alignItems: "center",
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
    height: screenWidth * 0.45,
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
    width: "50%",
    paddingHorizontal: 8,
    marginBottom: 16,
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 20,
    marginBottom: 10,
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
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
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
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  detailsRowNoBorder: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 8,
  },
  detailsLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  detailsValue: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "600",
  },
  detailsTotalValue: {
    fontSize: 16,
    color: "#10b981",
    fontWeight: "bold",
  },
  statusGreen: {
    color: "#10b981",
  },
  statusYellow: {
    color: "#F59E0B",
  },
  statusBold: {
    fontWeight: "bold",
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "90%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    position: "relative",
  },
  detailsScrollView: {
    padding: 20,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 10,
    zIndex: 10,
    backgroundColor: "transparent",
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#374151",
  },
  detailsTitleRN: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
    textAlign: "center",
  },
  imageZoomContainer: {
    position: "relative",
    width: "100%",
    height: 250,
    marginBottom: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsImageRN: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  zoomButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#10b981",
    padding: 10,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  zoomIcon: {
    fontSize: 18,
    color: "#ffffff",
  },
  infoTableContainer: {
    paddingBottom: 10,
  },
  loadingTextModal: {
    marginTop: 12,
    color: "black",
    fontWeight: "600",
    fontSize: 16,
  },
  errorContainerModal: {
    padding: 40,
    alignItems: "center",
  },
  errorTextModal: {
    color: "#ef4444",
    fontWeight: "600",
    textAlign: "center",
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  fullScreenCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 10,
  },
  fullScreenCloseText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  fullScreenImageContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  fullScreenImage: {
    width: "100%",
    height: "100%",
  },
});
