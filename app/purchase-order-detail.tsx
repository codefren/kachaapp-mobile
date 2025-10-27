import BottomMenu from '@/components/navigation/BottomMenu';
import { useAuth } from '@/context/AuthContext';
import '@/global.css';
import { apiMiddleware } from '@/middleware/api';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StatusBar, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  
  // Estados para editar quantity_units de cada item
  const [editingQuantities, setEditingQuantities] = useState<{ [key: number]: number }>({});

  const fetchOrderDetail = useCallback(async (isRefresh = false) => {
    if (!token) {
      setError('No hay token de autenticación disponible');
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
        
        console.log('Orden de compra cargada:', orderDataResponse);
      } else {
        if (response.statusCode === 401) {
          setError('Sesión expirada. Por favor vuelve a iniciar sesión.');
        } else {
          setError(response.error || 'Error al cargar la orden de compra');
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Error al cargar la orden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, poId]);

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
    
    setEditingQuantities(prev => ({
      ...prev,
      [index]: newQuantity
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
        console.log('Orden actualizada exitosamente');
        // Recargar datos
        await fetchOrderDetail(true);
      } else {
        setError(response.error || 'Error al actualizar la orden');
      }
    } catch (e: any) {
      setError(e?.message || 'Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMoreProducts = () => {
    // Navegar de vuelta a la lista de productos
    router.push({
      pathname: '/products',
      params: {
        provider: providerId,
        provider_name: providerName,
        po_id: poId, // Pasamos el ID de la orden para que sepa que está editando
      },
    });
  };

  if (loading && !orderData) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View className="flex-1 items-center justify-center bg-slate-50 p-4">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="mt-3 text-gray-600 text-base">Cargando orden de compra...</Text>
        </View>
        <BottomMenu activeTab="tools" />
      </SafeAreaView>
    );
  }

  if (error && !orderData) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View className="flex-1 items-center justify-center bg-slate-50 p-4">
          <Text className="text-red-500 mb-3 font-semibold text-center">{error}</Text>
          
          <Pressable className="bg-emerald-500 rounded-xl px-4 py-2.5" onPress={() => fetchOrderDetail()}>
            <Text className="text-white font-bold">Reintentar</Text>
          </Pressable>
        </View>
        <BottomMenu activeTab="tools" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
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
                <Text className="text-xl font-bold text-gray-900">Orden de Compra</Text>
              </View>
              
              <View className="w-10" />
            </View>
            
            {/* Info del proveedor */}
            <View className="bg-slate-50 rounded-lg p-3 mt-2">
              <Text className="text-xs font-medium text-gray-600 mb-1">Proveedor</Text>
              <Text className="text-base font-semibold text-gray-900">
                {orderData?.provider_name || decodeURIComponent(providerName || 'Proveedor')}
              </Text>
            </View>
          </View>
        </View>
        
        <ScrollView 
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 200 }}
          showsVerticalScrollIndicator={true}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error && (
            <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <Text className="text-red-700 text-sm font-medium">{error}</Text>
            </View>
          )}
          
          {/* Tabla de productos */}
          <View className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-4">
            {/* Header de la tabla */}
            <View className="bg-gray-50 border-b border-gray-200 px-4 py-3 rounded-t-2xl">
              <Text className="text-sm font-bold text-gray-700">Productos en la Orden</Text>
            </View>
            
            {/* Rows de la tabla */}
            {orderData?.items && orderData.items.length > 0 ? (
              orderData.items.map((item, index) => (
                <View 
                  key={index}
                  className={`px-4 py-3 ${
                    index !== orderData.items.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  {/* Nombre del producto */}
                  <View className="mb-2">
                    <Text className="text-sm font-semibold text-gray-900">
                      {item.product_name || `Producto ID: ${item.product}`}
                    </Text>
                    {item.product_sku && (
                      <Text className="text-xs text-gray-500 mt-0.5">SKU: {item.product_sku}</Text>
                    )}
                  </View>
                  
                  {/* Campo de cantidad a pedir - Editable */}
                  <View className="">
                    <Text className="text-xs font-medium text-gray-600 mb-1">Cantidad a pedir</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg p-2 max-w-[200px]">
                      <Pressable 
                        className={`w-7 h-7 rounded items-center justify-center ${
                          (editingQuantities[index] || 0) > 0 ? 'bg-gray-600' : 'bg-gray-300'
                        }`}
                        onPress={() => updateQuantity(index, Math.max(0, (editingQuantities[index] || 0) - 1))}
                        disabled={(editingQuantities[index] || 0) === 0}
                      >
                        <Text className={`text-sm font-bold ${
                          (editingQuantities[index] || 0) > 0 ? 'text-white' : 'text-gray-500'
                        }`}>−</Text>
                      </Pressable>
                      
                      <TextInput
                        className="flex-1 text-center text-sm font-bold text-gray-900"
                        value={String(editingQuantities[index] || 0)}
                        onChangeText={(text) => {
                          const num = parseInt(text) || 0;
                          updateQuantity(index, num);
                        }}
                        keyboardType="numeric"
                      />
                      
                      <Pressable 
                        className="w-7 h-7 rounded items-center justify-center bg-gray-600"
                        onPress={() => updateQuantity(index, (editingQuantities[index] || 0) + 1)}
                      >
                        <Text className="text-sm font-bold text-white">+</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View className="px-4 py-8 items-center">
                <Text className="text-gray-500 text-sm">No hay productos en esta orden</Text>
              </View>
            )}
          </View>
          
          {/* Botón para agregar más productos */}
          <Pressable 
            className="bg-white border-2 border-emerald-500 rounded-xl py-3 mb-4 items-center"
            onPress={handleAddMoreProducts}
          >
            <Text className="text-emerald-600 font-bold text-base">+ Agregar más productos</Text>
          </Pressable>
          
          {/* Resumen */}
          <View className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-24">
            <Text className="text-sm font-bold text-gray-700 mb-3">Resumen</Text>
            
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm text-gray-600">Total de productos</Text>
              <Text className="text-sm font-semibold text-gray-900">
                {orderData?.items.length || 0}
              </Text>
            </View>
            
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-gray-600">Total unidades a pedir</Text>
              <Text className="text-base font-bold text-emerald-600">
                {Object.values(editingQuantities).reduce((sum, qty) => sum + qty, 0)}
              </Text>
            </View>
          </View>
        </ScrollView>
        
        {/* Botón flotante de guardar */}
        <View className="absolute bottom-32 left-0 right-0 px-6">
          <Pressable 
            className={`rounded-xl py-4 items-center shadow-lg ${
              saving ? 'bg-gray-400' : 'bg-emerald-600'
            }`}
            onPress={handleSaveOrder}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-lg">Guardar Cambios</Text>
            )}
          </Pressable>
        </View>
        
        <BottomMenu activeTab="tools" />
      </SafeAreaView>
  );
}
