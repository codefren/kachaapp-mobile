import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { apiMiddleware } from '@/middleware/api';
import BottomMenu from '@/components/navigation/BottomMenu';

interface PurchaseOrderItem {
  id: number;
  product: number;
  product_name: string;
  product_image?: string | null;
  quantity_units: number;
  purchase_unit: string;
  amount_boxes: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface PurchaseOrderDetail {
  id: number;
  provider: number;
  provider_name: string;
  market: number;
  status: string;
  ordered_by: number;
  ordered_by_username: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItem[];
}

export default function PurchaseOrderDetailScreen() {
  const { po_units_id } = useLocalSearchParams<{ po_units_id: string }>();
  const { state } = useAuth();
  
  // Obtener token del middleware como fallback
  const contextToken = state.accessToken;
  const middlewareToken = apiMiddleware.getAuthToken();
  const token = contextToken || middlewareToken;

  const [data, setData] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchDetail = useCallback(async () => {
    console.log('[PurchaseOrder] fetchDetail iniciado');
    console.log('[PurchaseOrder] po_units_id:', po_units_id);
    
    // Obtener token fresco del middleware
    const currentToken = apiMiddleware.getAuthToken();
    console.log('[PurchaseOrder] Token disponible:', !!currentToken);
    
    if (!currentToken || !po_units_id) {
      console.log('[PurchaseOrder] Faltan datos - token:', !!currentToken, 'po_units_id:', po_units_id);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('[PurchaseOrder] Fetching con apiMiddleware...');
      
      const response = await apiMiddleware.get<PurchaseOrderDetail>(`/api/purchase-orders/${po_units_id}/`, true);
      
      console.log('[PurchaseOrder] Response:', {
        success: response.success,
        statusCode: response.statusCode,
        hasData: !!response.data
      });
      
      if (response.success && response.data) {
        console.log('[PurchaseOrder] Data loaded:', response.data);
        setData(response.data);
      } else {
        throw new Error(response.error || 'Error al cargar el pedido');
      }
    } catch (e: any) {
      console.error('[PurchaseOrder] Error:', e);
      setError(e?.message || 'Error al cargar el pedido');
    } finally {
      setLoading(false);
    }
  }, [po_units_id]);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDetail();
    setRefreshing(false);
  }, [fetchDetail]);

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
        <BottomMenu activeTab="tools" />
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.center}>
          <Text style={styles.error}>Error: {error}</Text>
        </View>
        <BottomMenu activeTab="tools" />
      </SafeAreaView>
    );
  }

  // Función para obtener el estilo del badge según el estado
  const getStatusBadgeStyle = (status?: string) => {
    switch (status) {
      case 'PLACED':
        return styles.badgeBlue;
      case 'SHIPPED':
        return styles.badgeGreen;
      case 'DRAFT':
        return styles.badgeAmber;
      case 'CANCELLED':
        return styles.badgeRed;
      default:
        return styles.badgeGray;
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.container}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.title}>Pedido #{data?.id}</Text>
          <View style={styles.meta}>
            <Text style={styles.metaText}>Proveedor: <Text style={styles.metaStrong}>{data?.provider_name || '-'}</Text></Text>
            <Text style={styles.metaText}>Estado: <Text style={[styles.badge, getStatusBadgeStyle(data?.status)]}>{data?.status || '-'}</Text></Text>
            <Text style={styles.metaText}>Ítems: <Text style={styles.metaStrong}>{data?.items?.length ?? 0}</Text></Text>
            <Text style={styles.metaText}>Pedido por: <Text style={styles.metaStrong}>{data?.ordered_by_username || '-'}</Text></Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Productos</Text>
            {data?.items?.length ? (
              data.items.map((item) => (
                <View key={item.id} style={styles.line}>
                  <View style={styles.lineLeft}>
                    <Text style={styles.lineName}>{item.product_name}</Text>
                    <Text style={styles.lineSub}>Producto ID: {item.product}</Text>
                    {item.notes && <Text style={styles.lineNotes}>Notas: {item.notes}</Text>}
                  </View>
                  <View style={styles.lineRight}>
                    <Text style={styles.lineQty}>{item.quantity_units} {item.purchase_unit}</Text>
                    {item.amount_boxes > 0 && (
                      <Text style={styles.lineBoxes}>{item.amount_boxes} cajas</Text>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.muted}>No hay productos para mostrar.</Text>
            )}
          </View>
          
          {data?.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notas del Pedido</Text>
              <Text style={styles.notesText}>{data.notes}</Text>
            </View>
          )}
        </ScrollView>
      </View>
      
      <BottomMenu activeTab="tools" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { 
    flex: 1, 
    backgroundColor: '#ffffff',
  },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 10 },
  meta: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  metaText: { color: '#374151', marginBottom: 6 },
  metaStrong: { fontWeight: '700', color: '#111827' },
  badge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 9999, overflow: 'hidden', color: '#fff', fontWeight: '800' },
  badgeGreen: { backgroundColor: '#10b981' },
  badgeAmber: { backgroundColor: '#f59e0b' },
  badgeBlue: { backgroundColor: '#3b82f6' },
  badgeRed: { backgroundColor: '#ef4444' },
  badgeGray: { backgroundColor: '#6b7280' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  lineLeft: { flex: 1, paddingRight: 12 },
  lineName: { fontWeight: '600', color: '#111827' },
  lineSub: { color: '#6b7280', marginTop: 2, fontSize: 12 },
  lineQty: { fontWeight: '700', color: '#111827' },
  lineRight: {
    alignItems: 'flex-end',
  },
  lineBoxes: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  lineNotes: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 2,
  },
  notesText: {
    color: '#374151',
    lineHeight: 20,
  },
  muted: { color: '#6b7280', fontStyle: 'italic' },
  error: { color: '#ef4444', fontWeight: '600' },
});
