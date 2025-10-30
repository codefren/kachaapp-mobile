import BottomMenu from "@/components/navigation/BottomMenu";
import { useAuth } from "@/context/AuthContext";
import "@/global.css";
import { apiMiddleware } from "@/middleware/api";
import WheelPicker, {
  withVirtualized,
} from "@quidone/react-native-wheel-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const VirtualizedWheelPicker = withVirtualized(WheelPicker);

interface PurchaseOrderItem {
  id?: number;
  product: number;
  product_name?: string;
  product_sku?: string;
  quantity_units: number;
  unit_type: string;
  amount_boxes: number;
}

interface PurchaseOrder {
  id: number;
  provider: number;
  provider_name?: string;
  ordered_by?: number;
  status: string;
  notes?: string;
  items: PurchaseOrderItem[];
  created_at?: string;
  updated_at?: string;
}

export default function PurchaseOrderDetailScreen() {
  const router = useRouter();
  const { state } = useAuth();
  const params = useLocalSearchParams();

  const poId = params.po_id as string;
  const providerId = params.provider as string;
  const providerName = params.provider_name as string;

  const contextToken = state.accessToken;
  const middlewareToken = apiMiddleware.getAuthToken();
  const token = contextToken || middlewareToken;

  const [orderData, setOrderData] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const [sections, setSections] = useState<
    { title: string; data: (PurchaseOrderItem & { originalIndex: number })[] }[]
  >([]);
  const sectionListRef =
    useRef<SectionList<PurchaseOrderItem & { originalIndex: number }>>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [currentEditingIndex, setCurrentEditingIndex] = useState<number | null>(
    null
  );

  const data = useMemo(
    () =>
      Array.from({ length: 1000 }, (_, i) => ({
        label: String(i + 1),
        value: i + 1,
      })),
    []
  );

  useEffect(() => {
    if (orderData?.items) {
      const itemsWithOriginalIndex = orderData.items.map((item, index) => ({
        ...item,
        originalIndex: index,
      }));

      const sortedItems = [...itemsWithOriginalIndex].sort((a, b) =>
        (a.product_name || "").localeCompare(b.product_name || "")
      );

      const grouped = sortedItems.reduce(
        (acc, item) => {
          const firstLetter = (item.product_name || "#")[0].toUpperCase();
          if (!acc[firstLetter]) {
            acc[firstLetter] = [];
          }
          acc[firstLetter].push(item);
          return acc;
        },
        {} as {
          [key: string]: (PurchaseOrderItem & { originalIndex: number })[];
        }
      );

      const sectionsData = Object.keys(grouped)
        .sort()
        .map((key) => ({
          title: key,
          data: grouped[key],
        }));

      setSections(sectionsData);
    }
  }, [orderData]);

  // Estados para editar quantity_units de cada item
  const [editingQuantities, setEditingQuantities] = useState<{
    [key: number]: number;
  }>({});

  const fetchOrderDetail = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        setError("No hay token de autenticación disponible");
        return;
      }

      try {
        setLoading(!isRefresh);
        setError(null);

        const url = `/api/purchase-orders/${poId}/`;
        const response = await apiMiddleware.get(url, true);

        if (response.success && response.data) {
          const orderDataResponse = response.data as PurchaseOrder;
          setOrderData(orderDataResponse);

          // Inicializar quantities editables
          const initialQuantities: { [key: number]: number } = {};
          orderDataResponse.items.forEach((item, index) => {
            initialQuantities[index] = item.quantity_units;
          });
          setEditingQuantities(initialQuantities);

          console.log("Orden de compra cargada:", orderDataResponse);
        } else {
          if (response.statusCode === 401) {
            setError("Sesión expirada. Por favor vuelve a iniciar sesión.");
          } else {
            setError(response.error || "Error al cargar la orden de compra");
          }
        }
      } catch (e: any) {
        setError(e?.message || "Error al cargar la orden");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, poId]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrderDetail(true);
  }, [fetchOrderDetail]);

  useFocusEffect(
    useCallback(() => {
      fetchOrderDetail();
    }, [fetchOrderDetail])
  );

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 0) return;

    setEditingQuantities((prev) => ({
      ...prev,
      [index]: newQuantity,
    }));
  };

  const handleSaveOrder = async () => {
    if (!orderData) return;

    try {
      setSaving(true);
      setError(null);

      // Construir payload con las cantidades actualizadas
      const updatedItems = orderData.items.map((item, index) => ({
        product: item.product,
        quantity_units: editingQuantities[index] || 0,
        amount_boxes: item.amount_boxes,
      }));

      const payload = {
        items: updatedItems,
      };

      const url = `/api/purchase-orders/${poId}/`;
      const response = await apiMiddleware.patch(url, payload, true);

      if (response.success) {
        console.log("Orden actualizada exitosamente");
        // Recargar datos
        await fetchOrderDetail(true);
      } else {
        setError(response.error || "Error al actualizar la orden");
      }
    } catch (e: any) {
      setError(e?.message || "Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMoreProducts = () => {
    // Navegar de vuelta a la lista de productos
    router.push({
      pathname: "/products",
      params: {
        provider: providerId,
        provider_name: providerName,
        po_id: poId, // Pasamos el ID de la orden para que sepa que está editando
      },
    });
  };

  if (loading && !orderData) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View className="flex-1 items-center justify-center bg-slate-50 p-4">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="mt-3 text-gray-600 text-base">
            Cargando orden de compra...
          </Text>
        </View>
        <BottomMenu activeTab="tools" />
      </SafeAreaView>
    );
  }

  if (error && !orderData) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View className="flex-1 items-center justify-center bg-slate-50 p-4">
          <Text className="text-red-500 mb-3 font-semibold text-center">
            {error}
          </Text>

          <Pressable
            className="bg-emerald-500 rounded-xl px-4 py-2.5"
            onPress={() => fetchOrderDetail()}
          >
            <Text className="text-white font-bold">Reintentar</Text>
          </Pressable>
        </View>
        <BottomMenu activeTab="tools" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      {/* Header */}
      <View className="bg-white border-b border-gray-100 shadow-sm">
        <View className="px-5 py-4">
          <View className="flex-row items-center justify-between mb-2">
            <Pressable
              className="w-10 h-10 rounded-lg bg-gray-100 items-center justify-center"
              onPress={() => router.back()}
            >
              <Text className="text-gray-700 text-lg font-bold">‹</Text>
            </Pressable>

            <View className="flex-1 items-center mx-4">
              <Text className="text-xl font-bold text-gray-900">
                Orden de Compra
              </Text>
            </View>

            <View className="w-10" />
          </View>

          {/* Info del proveedor */}
          <View className="bg-slate-50 rounded-lg p-3 mt-2">
            <Text className="text-xs font-medium text-gray-600 mb-1">
              Proveedor
            </Text>
            <Text className="text-base font-semibold text-gray-900">
              {orderData?.provider_name ||
                decodeURIComponent(providerName || "Proveedor")}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-1 flex-row">
        <SectionList
          ref={sectionListRef}
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 220, paddingRight: 30 }}
          sections={sections}
          keyExtractor={(item, index) =>
            item.product.toString() + index.toString()
          }
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderSectionHeader={({ section: { title } }) => (
            <View className="bg-gray-50 rounded-lg -mx-1">
              <Text className="text-base font-bold text-emerald-600 px-4 py-2">
                {title}
              </Text>
            </View>
          )}
          renderItem={({ item, index, section }) => (
            <View
              className={`px-4 py-3 ${
                index !== section.data.length - 1
                  ? "border-b border-gray-100"
                  : ""
              } bg-white ${index === 0 ? "rounded-t-2xl" : ""} ${
                index === section.data.length - 1 ? "rounded-b-2xl" : ""
              }`}
            >
              {/* Nombre del producto */}
              <View className="mb-2">
                <Text className="text-sm font-semibold text-gray-900">
                  {item.product_name || `Producto ID: ${item.product}`}
                </Text>
                {item.product_sku && (
                  <Text className="text-xs text-gray-500 mt-0.5">
                    SKU: {item.product_sku}
                  </Text>
                )}
              </View>

              {/* Campo de cantidad a pedir - Editable */}
              <View>
                <Text className="text-xs font-medium text-gray-600 mb-1">
                  Cantidad a pedir
                </Text>
                <Pressable
                  className="bg-gray-50 border border-gray-200 rounded-lg p-2 max-w-[200px] items-center"
                  onPress={() => {
                    console.log("Pressed, index:", item.originalIndex);
                    setCurrentEditingIndex(item.originalIndex);
                    setModalVisible(true);
                  }}
                >
                  <Text className="text-sm font-bold text-gray-900">
                    {editingQuantities[item.originalIndex] || 0}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          ListHeaderComponent={
            <>
              {error && (
                <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <Text className="text-red-700 text-sm font-medium">
                    {error}
                  </Text>
                </View>
              )}
              <View className="bg-gray-50 border-b border-gray-200 px-4 py-3 rounded-t-2xl mb-2">
                <Text className="text-sm font-bold text-gray-700">
                  Productos en la Orden
                </Text>
              </View>
            </>
          }
          ListFooterComponent={
            <View className="mt-4">
              {/* Botón para agregar más productos */}
              <Pressable
                className="bg-white border-2 border-emerald-500 rounded-xl py-3 mb-4 items-center"
                onPress={handleAddMoreProducts}
              >
                <Text className="text-emerald-600 font-bold text-base">
                  + Agregar más productos
                </Text>
              </Pressable>

              {/* Resumen */}
              <View className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4">
                <Text className="text-sm font-bold text-gray-700 mb-3">
                  Resumen
                </Text>

                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-sm text-gray-600">
                    Total de productos
                  </Text>
                  <Text className="text-sm font-semibold text-gray-900">
                    {orderData?.items.length || 0}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-gray-600">
                    Total unidades a pedir
                  </Text>
                  <Text className="text-base font-bold text-emerald-600">
                    {Object.values(editingQuantities).reduce(
                      (sum, qty) => sum + qty,
                      0
                    )}
                  </Text>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View className="px-4 py-8 items-center bg-white rounded-b-2xl">
              <Text className="text-gray-500 text-sm">
                No hay productos en esta orden
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View className="h-2 bg-gray-50" />}
        />
        {/* Abecedario */}
        <ScrollView
          className="absolute right-0 top-0 bottom-24 w-10"
          contentContainerStyle={{
            justifyContent: "center",
            alignItems: "center",
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        >
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => {
            const sectionIndex = sections.findIndex(
              (section) => section.title === letter
            );
            const hasSection = sectionIndex !== -1;

            return (
              <TouchableOpacity
                key={letter}
                disabled={!hasSection}
                onPress={() => {
                  if (hasSection) {
                    sectionListRef.current?.scrollToLocation({
                      sectionIndex,
                      itemIndex: 0,
                      animated: false,
                    });
                  }
                }}
                className="py-2 px-1"
              >
                <Text
                  className={`text-sm font-bold ${
                    hasSection ? "text-emerald-600" : "text-gray-300"
                  }`}
                >
                  {letter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Botón flotante de guardar */}
      <View className="absolute bottom-32 left-0 right-0 px-6">
        <Pressable
          className={`rounded-xl py-4 items-center shadow-lg w-48 mx-auto ${
            saving ? "bg-gray-400" : "bg-emerald-600"
          }`}
          onPress={handleSaveOrder}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-white font-bold text-lg">Guardar</Text>
          )}
        </Pressable>
      </View>

      <Modal
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        animationType="slide"
        transparent={true}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              padding: 16,
              width: "80%",
              maxWidth: 400,
              borderRadius: 10,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 16,
              }}
            >
              Seleccionar cantidad
            </Text>

            <VirtualizedWheelPicker
              data={data}
              value={editingQuantities[currentEditingIndex!] || 1}
              onValueChanged={(event: any) =>
                setEditingQuantities((prev) => ({
                  ...prev,
                  [currentEditingIndex!]: event.item.value,
                }))
              }
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 16,
              }}
            >
              <Pressable
                onPress={() => setModalVisible(false)}
                style={{
                  backgroundColor: "#ccc",
                  padding: 12,
                  borderRadius: 8,
                  flex: 1,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: "#333", textAlign: "center" }}>
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setModalVisible(false)}
                style={{
                  backgroundColor: "#10b981",
                  padding: 12,
                  borderRadius: 8,
                  flex: 1,
                  marginLeft: 8,
                }}
              >
                <Text style={{ color: "white", textAlign: "center" }}>
                  Confirmar
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <BottomMenu activeTab="tools" />
    </SafeAreaView>
  );
}
