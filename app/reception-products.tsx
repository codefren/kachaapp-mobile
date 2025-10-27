import BottomMenu from '@/components/navigation/BottomMenu';
import { useAuth } from '@/context/AuthContext';
import { apiMiddleware } from '@/middleware/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Modal, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ProductItem {
  id: number;
  product: number;
  product_name: string;
  product_image: string | null;
  quantity_units: number;
  purchase_unit: string;
  notes: string;
  amount_boxes: number;
}

interface PurchaseOrderDetail {
  id: number;
  provider: number;
  provider_name: string;
  status: string;
  items: ProductItem[];
}

export default function ReceptionProductsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { state } = useAuth();
  
  const orderId = params.order_id as string;
  const providerId = params.provider_id as string;
  const providerName = params.provider_name as string;

  console.log('[ReceptionProducts] 🚀 Iniciando con params:', { orderId, providerId, providerName });

  const [orderData, setOrderData] = useState<PurchaseOrderDetail | null>(null);
  const [originalItems, setOriginalItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  // Estado para las cantidades recibidas de cada producto
  const [receivedQuantities, setReceivedQuantities] = useState<{ [productId: number]: number }>({});
  
  // Estados para cámara de scanner
  const [cameraVisible, setCameraVisible] = useState<boolean>(false);
  const [scannedData, setScannedData] = useState<string>('');
  const [permission, requestPermission] = useCameraPermissions();
  
  // Estados para animación de producto escaneado
  const [scannedProductId, setScannedProductId] = useState<number | null>(null);
  const [scannerLoading, setScannerLoading] = useState<boolean>(false);
  const colorAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  
  // Estados para formulario de producto extra
  const [extraProductFormVisible, setExtraProductFormVisible] = useState<boolean>(false);
  const [extraProductBarcode, setExtraProductBarcode] = useState<string>('');
  const [extraQuantity, setExtraQuantity] = useState<string>('1');
  const [extraIsDamaged, setExtraIsDamaged] = useState<boolean>(false);
  const [extraNotes, setExtraNotes] = useState<string>('');
  const [extraReason, setExtraReason] = useState<'PROMOTIONAL' | 'SUBSTITUTE' | 'ERROR' | 'OTHER'>('ERROR');

  const fetchOrderDetails = useCallback(async () => {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('[ReceptionProducts] 📡 Fetching order details for ID:', orderId);
    console.log('═══════════════════════════════════════════════════════════════');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiMiddleware.get<PurchaseOrderDetail>(
        `/api/purchase-orders/${orderId}/`, 
        true
      );
      
      console.log('[ReceptionProducts] 📦 Response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log('[ReceptionProducts] ✅ Order loaded successfully');
        console.log('[ReceptionProducts] 📋 Items count:', response.data.items?.length || 0);
        
        setOrderData(response.data);
        
        // Guardar items originales para cálculo correcto de totales
        setOriginalItems(response.data.items || []);
        
        // Inicializar cantidades recibidas con las cantidades esperadas
        const initialQuantities: { [productId: number]: number } = {};
        response.data.items?.forEach(item => {
          initialQuantities[item.product] = item.quantity_units;
        });
        setReceivedQuantities(initialQuantities);
        
        console.log('[ReceptionProducts] 📊 Initial quantities:', initialQuantities);
      } else {
        throw new Error(response.error || 'Error al cargar la orden');
      }
    } catch (e: any) {
      console.error('[ReceptionProducts] ❌ Error:', e);
      setError(e?.message || 'Error al cargar la orden');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrderDetails();
    setRefreshing(false);
  }, [fetchOrderDetails]);

  const updateReceivedQuantity = (productId: number, delta: number) => {
    setReceivedQuantities(prev => {
      const current = prev[productId] || 0;
      const newValue = Math.max(0, current + delta);
      return { ...prev, [productId]: newValue };
    });
  };

  // Función para abrir la cámara
  const openCamera = useCallback(async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        setError('Se requiere permiso de cámara para escanear códigos');
        return;
      }
    }
    setCameraVisible(true);
    setScannedData('');
  }, [permission, requestPermission]);

  // Función para cerrar la cámara
  const closeCamera = useCallback(() => {
    setCameraVisible(false);
    setScannedData('');
  }, []);

  // Función para animar producto escaneado
  const animateScannedProduct = useCallback((productId: number) => {
    setScannedProductId(productId);
    colorAnim.setValue(0);
    
    Animated.sequence([
      Animated.timing(colorAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(colorAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: false,
      }),
    ]).start();

    setTimeout(() => {
      setScannedProductId(null);
      colorAnim.setValue(0);
    }, 2000);
  }, [colorAnim]);

  // Función para registrar producto extra (no está en el pedido)
  const registerExtraProduct = useCallback(async (
    barcode: string,
    quantityReceived: number,
    isDamaged: boolean,
    notes: string,
    reason: 'PROMOTIONAL' | 'SUBSTITUTE' | 'ERROR' | 'OTHER'
  ) => {
    try {
      setSubmitting(true);
      const url = `/api/received-products/${orderId}/received-extra/`;
      console.log('[ReceptionProducts] 🆕 Registrando producto extra:', url);
      
      const payload = {
        barcode,
        quantity_received: quantityReceived,
        is_damaged: isDamaged,
        notes,
        reason
      };
      
      console.log('[ReceptionProducts] 📦 Payload:', JSON.stringify(payload, null, 2));
      
      const response = await apiMiddleware.post(url, payload, true);
      console.log('[ReceptionProducts] 📦 Response completa:', JSON.stringify(response, null, 2));
      console.log('[ReceptionProducts] 🔍 Response type:', typeof response);
      console.log('[ReceptionProducts] 🔍 Response keys:', Object.keys(response));
      console.log('[ReceptionProducts] 🔍 StatusCode:', response.statusCode);
      
      if (response.success && response.data) {
        const data = response.data as any;
        console.log('[ReceptionProducts] ✅ Producto extra registrado:', data);
        
        // Mapear la respuesta del servidor a ProductItem
        const newProduct: ProductItem = {
          id: data.product_id || 0,
          product: data.product_id,
          product_name: data.product_name,
          product_image: null,
          quantity_units: quantityReceived,
          purchase_unit: data.purchase_unit || 'units',
          notes: notes,
          amount_boxes: data.amount_boxes || 0
        };
        
        console.log('[ReceptionProducts] 🔄 Producto mapeado:', newProduct);
        
        // Agregar el nuevo producto al inicio de la lista
        setOrderData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            items: [newProduct, ...prev.items]
          };
        });
        
        // Inicializar cantidad recibida
        setReceivedQuantities(prev => ({
          ...prev,
          [newProduct.product]: quantityReceived
        }));
        
        // Cerrar formulario
        setExtraProductFormVisible(false);
        
        // Scroll al inicio y animar
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          animateScannedProduct(newProduct.product);
        }, 300);
        
        Alert.alert('✅ Producto Extra Registrado', `${newProduct.product_name} agregado a la recepción`);
      } else {
        console.error('[ReceptionProducts] ❌ Error al registrar extra:', response.error);
        
        let errorMessage = response.error || 'Error al registrar producto extra';
        
        // Mensaje más específico para error 500
        if (response.statusCode === 500) {
          errorMessage = `Error del servidor (500).\n\nPosibles causas:\n- El producto con código ${barcode} no existe en la base de datos\n- Error en el procesamiento del servidor\n\nContacta al administrador.`;
        } else if (response.statusCode === 400) {
          errorMessage = `Código de barras inválido: ${barcode}\n\nVerifica que el código sea correcto.`;
        }
        
        Alert.alert('Error al Registrar Producto Extra', errorMessage);
      }
    } catch (e: any) {
      console.error('[ReceptionProducts] ❌ Error al registrar producto extra:', e);
      Alert.alert('Error', e?.message || 'Error al registrar producto extra');
    } finally {
      setSubmitting(false);
    }
  }, [orderId, animateScannedProduct]);

  // Función para manejar el escaneo de códigos
  const handleBarcodeScanned = useCallback(async (data: string) => {
    if (!data || data === scannedData) return;
    
    // Validar que sea un código EAN-13 válido (13 dígitos)
    const ean13Regex = /^\d{13}$/;
    if (!ean13Regex.test(data)) {
      console.log('[ReceptionProducts] ⚠️ Código inválido (no es EAN-13):', data);
      Alert.alert(
        'Código inválido',
        `El código "${data}" no es un EAN-13 válido.\n\nSolo se aceptan códigos de 13 dígitos numéricos.`
      );
      setScannedData('');
      return;
    }
    
    setScannedData(data);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('[ReceptionProducts] 📷 Código EAN-13 escaneado:', data);
    console.log('═══════════════════════════════════════════════════════════════');
    
    try {
      setScannerLoading(true);
      const url = `/api/received-products/${orderId}/by-barcode/?barcode=${encodeURIComponent(data)}`;
      console.log('[ReceptionProducts] 📡 Consultando URL:', url);
      
      const response = await apiMiddleware.get(url, true);
      console.log('[ReceptionProducts] 📦 Response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        const foundProduct = response.data as ProductItem;
        console.log('[ReceptionProducts] ✅ Producto encontrado:', foundProduct);
        
        closeCamera();
        
        // Incrementar cantidad recibida
        setReceivedQuantities(prev => {
          const current = prev[foundProduct.product] || 0;
          return { ...prev, [foundProduct.product]: current + 1 };
        });
        
        // Reordenar lista: poner el producto escaneado de primero
        setOrderData(prev => {
          if (!prev) return prev;
          
          const productIndex = prev.items.findIndex(item => item.product === foundProduct.product);
          if (productIndex === -1) return prev;
          
          const reorderedItems = [...prev.items];
          const [movedProduct] = reorderedItems.splice(productIndex, 1);
          reorderedItems.unshift(movedProduct);
          
          return {
            ...prev,
            items: reorderedItems
          };
        });
        
        // Scroll al inicio y animar
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          animateScannedProduct(foundProduct.product);
        }, 300);
        
        console.log('[ReceptionProducts] 📊 Cantidad actualizada y reordenado para producto ID:', foundProduct.product);
      } else {
        // Producto no encontrado en el pedido - mostrar formulario
        console.log('[ReceptionProducts] ⚠️ Producto no encontrado en pedido:', data);
        setScannerLoading(false);
        closeCamera();
        
        // Configurar datos del formulario
        setExtraProductBarcode(data);
        setExtraQuantity('1');
        setExtraIsDamaged(false);
        setExtraNotes('');
        setExtraReason('ERROR');
        
        // Mostrar formulario
        setExtraProductFormVisible(true);
        return;
      }
    } catch (e: any) {
      console.error('[ReceptionProducts] ❌ Error al buscar producto:', e);
      Alert.alert('Error', e?.message || 'Error al buscar producto por código de barras');
    } finally {
      setScannerLoading(false);
    }
  }, [scannedData, orderId, closeCamera, animateScannedProduct, registerExtraProduct]);

  const handleSubmit = async () => {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('[ReceptionProducts] 🚀 Iniciando envío de recepción');
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Validar que al menos un producto tenga cantidad > 0
    const hasProducts = Object.values(receivedQuantities).some(qty => qty > 0);
    if (!hasProducts) {
      Alert.alert('Error', 'Debe ingresar al menos un producto recibido');
      return;
    }

    // Construir el payload SOLO con productos originales (no productos extra)
    // Los productos extra ya fueron registrados con el endpoint /received-extra/
    const originalProductIds = new Set(originalItems.map(item => item.product));
    
    const items = Object.entries(receivedQuantities)
      .filter(([productId, qty]) => {
        const id = parseInt(productId);
        return qty > 0 && originalProductIds.has(id);
      })
      .map(([productId, quantity]) => ({
        product_id: parseInt(productId),
        quantity_received: quantity
      }));

    const payload = { items };
    
    console.log('[ReceptionProducts] 🔑 Original product IDs:', Array.from(originalProductIds));
    console.log('[ReceptionProducts] 📦 Todos los receivedQuantities:', receivedQuantities);
    
    console.log('[ReceptionProducts] 📤 Payload:', JSON.stringify(payload, null, 2));
    
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await apiMiddleware.post<{ reception_id: number }>(
        `/api/received-products/${orderId}/received/`,
        payload,
        true
      );
      
      console.log('[ReceptionProducts] 📦 Response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        const receptionId = response.data.reception_id;
        console.log('[ReceptionProducts] ✅ Recepción creada exitosamente, ID:', receptionId);
        
        // Navegar a la pantalla de carga de factura
        router.push({
          pathname: '/reception-invoice',
          params: {
            reception_id: receptionId,
            order_id: orderId,
            provider_name: providerName,
          },
        });
      } else {
        throw new Error(response.error || 'Error al registrar la recepción');
      }
    } catch (e: any) {
      console.error('[ReceptionProducts] ❌ Error:', e);
      setError(e?.message || 'Error al registrar la recepción');
      Alert.alert('Error', e?.message || 'Error al registrar la recepción');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: ProductItem }) => {
    const expectedQty = item.quantity_units;
    const receivedQty = receivedQuantities[item.product] || 0;
    
    // Determinar el estado: igual, por debajo o por arriba
    let status: 'equal' | 'below' | 'above' = 'equal';
    let statusColor = '#10b981'; // verde
    let statusBg = '#d1fae5';
    let statusText = '✓ Correcto';
    
    if (receivedQty < expectedQty) {
      status = 'below';
      statusColor = '#ef4444'; // rojo
      statusBg = '#fee2e2';
      statusText = '⚠ Faltante';
    } else if (receivedQty > expectedQty) {
      status = 'above';
      statusColor = '#f59e0b'; // amarillo/naranja
      statusBg = '#fef3c7';
      statusText = '⚡ Excedente';
    }
    
    // Determinar si este producto es el que se escaneó
    const isScannedProduct = scannedProductId === item.product;
    
    // Interpolación de color para la animación
    const animatedBackgroundColor = isScannedProduct ? colorAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['#ffffff', '#dbeafe'], // blanco a azul muy claro
    }) : '#ffffff';
    
    const animatedBorderColor = isScannedProduct ? colorAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [statusColor, '#3b82f6'], // color de estado a azul para el borde durante la animación
    }) : statusColor;

    return (
      <Animated.View 
        style={[
          styles.productCard, 
          { 
            borderLeftColor: animatedBorderColor,
            backgroundColor: animatedBackgroundColor,
          }
        ]}
      >
        <View style={styles.productHeader}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.product_name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
        </View>
        
        <View style={styles.quantityRow}>
          <View style={styles.expectedBox}>
            <Text style={styles.quantityLabel}>Esperado</Text>
            <Text style={styles.expectedValue}>{expectedQty}</Text>
          </View>
          
          <View style={styles.controlsBox}>
            <Text style={styles.quantityLabel}>Recibido</Text>
            <View style={styles.controls}>
              <Pressable
                style={styles.controlBtn}
                onPress={() => updateReceivedQuantity(item.product, -1)}
              >
                <Text style={styles.controlBtnText}>-</Text>
              </Pressable>
              
              <View style={[styles.valueBox, { 
                borderColor: statusColor,
                backgroundColor: receivedQty === 0 ? '#f3f4f6' : '#fff'
              }]}>
                <Text style={[styles.valueText, { 
                  color: receivedQty === 0 ? '#9ca3af' : statusColor,
                  fontWeight: 'bold'
                }]}>
                  {receivedQty}
                </Text>
              </View>
              
              <Pressable
                style={styles.controlBtn}
                onPress={() => updateReceivedQuantity(item.product, 1)}
              >
                <Text style={styles.controlBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>
        
        {status !== 'equal' && (
          <View style={styles.differenceRow}>
            <Text style={[styles.differenceText, { color: statusColor }]}>
              Diferencia: {receivedQty > expectedQty ? '+' : ''}{receivedQty - expectedQty} unidades
            </Text>
          </View>
        )}
      </Animated.View>
    );
  };

  if (loading && !orderData) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.center}>
          <ActivityIndicator color="#10b981" size="large" />
          <Text style={styles.loadingText}>Cargando orden...</Text>
        </View>
        <BottomMenu activeTab="tools" />
      </SafeAreaView>
    );
  }

  if (error && !orderData) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchOrderDetails}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
        <BottomMenu activeTab="tools" />
      </SafeAreaView>
    );
  }

  // Calcular totales SOLO de items originales (no productos extra)
  const totalExpected = originalItems.reduce((sum, item) => sum + item.quantity_units, 0);
  const totalReceived = originalItems.reduce((sum, item) => {
    return sum + (receivedQuantities[item.product] || 0);
  }, 0);
  // Contar productos en la lista (originales + extras agregados) con cantidad > 0
  const totalProductsCount = orderData?.items?.filter(item => (receivedQuantities[item.product] || 0) > 0).length || 0;
  const allMatch = originalItems.every(item => receivedQuantities[item.product] === item.quantity_units);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Recepción de Productos</Text>
            <Text style={styles.headerSubtitle}>{providerName}</Text>
            <Text style={styles.headerOrderId}>Pedido #{orderId}</Text>
          </View>
          
          {/* Icono de Scanner */}
          <Pressable 
            style={[
              styles.scannerButton,
              scannerLoading && styles.scannerButtonLoading
            ]}
            onPress={openCamera}
            disabled={scannerLoading}
          >
            {scannerLoading ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <View style={styles.scannerIcon}>
                <View style={styles.scannerFrame}>
                  <View style={[styles.scannerCorner, styles.scannerCornerTL]} />
                  <View style={[styles.scannerCorner, styles.scannerCornerTR]} />
                  <View style={[styles.scannerCorner, styles.scannerCornerBL]} />
                  <View style={[styles.scannerCorner, styles.scannerCornerBR]} />
                  <View style={styles.scannerLine} />
                </View>
              </View>
            )}
          </Pressable>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Esperado</Text>
            <Text style={styles.summaryValue}>{totalExpected}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Recibido</Text>
            <Text style={[styles.summaryValue, { 
              color: totalReceived === totalExpected ? '#10b981' : totalReceived < totalExpected ? '#ef4444' : '#f59e0b' 
            }]}>
              {totalReceived}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Estado</Text>
            <Text style={[styles.summaryValue, { 
              fontSize: 14,
              color: allMatch ? '#10b981' : '#f59e0b' 
            }]}>
              {allMatch ? '✓' : '⚠'}
            </Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={orderData?.items || []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hay productos en esta orden</Text>
              </View>
            ) : null
          }
        />

        {/* Botón flotante siguiente */}
        <View style={styles.bottomContainer}>
          <Pressable
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <View style={styles.submitButtonContent}>
                <Text style={styles.submitButtonText}>Siguiente ›</Text>
                <Text style={styles.submitButtonSubtext}>
                  {totalProductsCount} {totalProductsCount === 1 ? 'producto' : 'productos'}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
      
      <BottomMenu activeTab="tools" />
      
      {/* Modal de Cámara */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={cameraVisible}
        onRequestClose={closeCamera}
      >
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          {permission?.granted ? (
            <>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['ean13']
                }}
                onBarcodeScanned={({ data }) => {
                  if (data) {
                    handleBarcodeScanned(data);
                  }
                }}
              />
              
              {/* Overlay */}
              <View style={{ position: 'absolute', top: 48, left: 16, right: 16, zIndex: 10 }}>
                <Pressable 
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 }}
                  onPress={closeCamera}
                >
                  <Text style={{ textAlign: 'center', fontWeight: '600', color: '#111827' }}>✕ Cerrar Cámara</Text>
                </Pressable>
                
                {scannedData && (
                  <View style={{ backgroundColor: '#10b981', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
                    <Text style={{ color: '#ffffff', fontWeight: '600', textAlign: 'center' }}>
                      Código escaneado: {scannedData}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Guía de escaneo */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 256, height: 256, borderWidth: 2, borderColor: '#ffffff', borderRadius: 16 }}>
                  <View style={{ position: 'absolute', top: 0, left: 0, width: 32, height: 32, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#94a3b8', borderTopLeftRadius: 16 }} />
                  <View style={{ position: 'absolute', top: 0, right: 0, width: 32, height: 32, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#94a3b8', borderTopRightRadius: 16 }} />
                  <View style={{ position: 'absolute', bottom: 0, left: 0, width: 32, height: 32, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#94a3b8', borderBottomLeftRadius: 16 }} />
                  <View style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#94a3b8', borderBottomRightRadius: 16 }} />
                </View>
              </View>
              
              {/* Instrucciones */}
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                <SafeAreaView>
                  <View style={{ padding: 24 }}>
                    <View style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', borderRadius: 12, padding: 16 }}>
                      <Text style={{ color: '#ffffff', textAlign: 'center', fontWeight: '600', marginBottom: 8 }}>
                        Escanear código EAN-13
                      </Text>
                      <Text style={{ color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center', fontSize: 14 }}>
                        Solo se aceptan códigos de barras EAN-13 (13 dígitos)
                      </Text>
                    </View>
                  </View>
                </SafeAreaView>
              </View>
            </>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <Text style={{ color: '#ffffff', fontSize: 18, marginBottom: 16, textAlign: 'center' }}>
                Se requiere permiso de cámara para escanear códigos de barras
              </Text>
              <Pressable 
                style={{ backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginBottom: 16 }}
                onPress={async () => {
                  const { granted } = await requestPermission();
                  if (!granted) {
                    setError('Permiso de cámara denegado');
                    closeCamera();
                  }
                }}
              >
                <Text style={{ color: '#111827', fontWeight: '600' }}>Solicitar Permiso</Text>
              </Pressable>
              <Pressable 
                style={{ backgroundColor: '#4b5563', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
                onPress={closeCamera}
              >
                <Text style={{ color: '#ffffff', fontWeight: '600' }}>Cancelar</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
      
      {/* Modal de Formulario Producto Extra */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={extraProductFormVisible}
        onRequestClose={() => setExtraProductFormVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', paddingHorizontal: 16 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 24, maxHeight: '80%' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Título */}
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
                📦 Registrar Producto Extra
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
                Este producto no está en el pedido original
              </Text>
              
              {/* Código de barras */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Código de Barras
                </Text>
                <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, padding: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                    {extraProductBarcode}
                  </Text>
                </View>
              </View>
              
              {/* Cantidad */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Cantidad Recibida *
                </Text>
                <TextInput
                  style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 }}
                  value={extraQuantity}
                  onChangeText={setExtraQuantity}
                  keyboardType="number-pad"
                  placeholder="Ej: 5"
                />
              </View>
              
              {/* Razón */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Razón *
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Pressable
                    style={{ flex: 1, minWidth: '45%', backgroundColor: extraReason === 'ERROR' ? '#ef4444' : '#f3f4f6', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
                    onPress={() => setExtraReason('ERROR')}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: extraReason === 'ERROR' ? '#ffffff' : '#6b7280' }}>
                      Error
                    </Text>
                  </Pressable>
                  <Pressable
                    style={{ flex: 1, minWidth: '45%', backgroundColor: extraReason === 'SUBSTITUTE' ? '#8b5cf6' : '#f3f4f6', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
                    onPress={() => setExtraReason('SUBSTITUTE')}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: extraReason === 'SUBSTITUTE' ? '#ffffff' : '#6b7280' }}>
                      Sustitución
                    </Text>
                  </Pressable>
                  <Pressable
                    style={{ flex: 1, minWidth: '45%', backgroundColor: extraReason === 'PROMOTIONAL' ? '#10b981' : '#f3f4f6', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
                    onPress={() => setExtraReason('PROMOTIONAL')}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: extraReason === 'PROMOTIONAL' ? '#ffffff' : '#6b7280' }}>
                      Promoción
                    </Text>
                  </Pressable>
                  <Pressable
                    style={{ flex: 1, minWidth: '45%', backgroundColor: extraReason === 'OTHER' ? '#6b7280' : '#f3f4f6', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
                    onPress={() => setExtraReason('OTHER')}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: extraReason === 'OTHER' ? '#ffffff' : '#6b7280' }}>
                      Otro
                    </Text>
                  </Pressable>
                </View>
              </View>
              
              {/* Producto dañado */}
              <Pressable
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: '#f9fafb', borderRadius: 8, padding: 12 }}
                onPress={() => setExtraIsDamaged(!extraIsDamaged)}
              >
                <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: extraIsDamaged ? '#3b82f6' : '#d1d5db', backgroundColor: extraIsDamaged ? '#3b82f6' : '#ffffff', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  {extraIsDamaged && <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>✓</Text>}
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>
                  Producto dañado
                </Text>
              </Pressable>
              
              {/* Notas */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  Notas (opcional)
                </Text>
                <TextInput
                  style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 80, textAlignVertical: 'top' }}
                  value={extraNotes}
                  onChangeText={setExtraNotes}
                  placeholder="Agrega notas sobre este producto..."
                  multiline
                  numberOfLines={3}
                />
              </View>
              
              {/* Botones */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8, paddingVertical: 14, alignItems: 'center' }}
                  onPress={() => setExtraProductFormVisible(false)}
                  disabled={submitting}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#6b7280' }}>
                    Cancelar
                  </Text>
                </Pressable>
                <Pressable
                  style={{ flex: 1, backgroundColor: '#10b981', borderRadius: 8, paddingVertical: 14, alignItems: 'center' }}
                  onPress={() => {
                    const qty = parseInt(extraQuantity);
                    if (!qty || qty < 1) {
                      Alert.alert('Error', 'Ingrese una cantidad válida');
                      return;
                    }
                    registerExtraProduct(
                      extraProductBarcode,
                      qty,
                      extraIsDamaged,
                      extraNotes,
                      extraReason
                    );
                  }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
                      Registrar Producto
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: -2,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  headerOrderId: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  summary: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 200, // Espacio para botón flotante (128px) + BottomMenu (85px) + margen
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  quantityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  expectedBox: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  controlsBox: {
    flex: 2,
  },
  quantityLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
    textAlign: 'center',
  },
  expectedValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  valueBox: {
    minWidth: 50,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  valueText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  differenceRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  differenceText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 100, // Más cerca del BottomMenu
    right: 24,
  },
  submitButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 112,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonContent: {
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 24,
    marginBottom: 4,
  },
  submitButtonSubtext: {
    color: '#d1fae5',
    fontSize: 14,
    fontWeight: '500',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
  },
  // Estilos del scanner
  scannerButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  scannerButtonLoading: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  scannerIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#4b5563',
    borderRadius: 2,
    position: 'relative',
  },
  scannerCorner: {
    position: 'absolute',
    width: 6,
    height: 6,
  },
  scannerCornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#374151',
  },
  scannerCornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#374151',
  },
  scannerCornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#374151',
  },
  scannerCornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: '#374151',
  },
  scannerLine: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#4b5563',
  },
});
