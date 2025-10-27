import BottomMenu from '@/components/navigation/BottomMenu';
import { apiMiddleware } from '@/middleware/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

export default function ReceptionInvoiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const receptionId = params.reception_id as string;
  const orderId = params.order_id as string;
  const providerName = params.provider_name as string;

  console.log('[ReceptionInvoice] 🚀 Iniciando con params:', { receptionId, orderId, providerName });

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [invoiceTime, setInvoiceTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [invoiceTotal, setInvoiceTotal] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso Requerido', 'Se necesita permiso para usar la cámara');
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso Requerido', 'Se necesita permiso para acceder a la galería');
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    console.log('[ReceptionInvoice] 📸 Iniciando captura de foto');
    
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('[ReceptionInvoice] 📸 Camera result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        console.log('[ReceptionInvoice] ✅ Foto capturada:', uri);
        setImageUri(uri);
      }
    } catch (error) {
      console.error('[ReceptionInvoice] ❌ Error al capturar foto:', error);
      Alert.alert('Error', 'No se pudo capturar la foto');
    }
  };

  const handlePickImage = async () => {
    console.log('[ReceptionInvoice] 🖼️ Iniciando selección de imagen');
    
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('[ReceptionInvoice] 🖼️ Library result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        console.log('[ReceptionInvoice] ✅ Imagen seleccionada:', uri);
        setImageUri(uri);
      }
    } catch (error) {
      console.error('[ReceptionInvoice] ❌ Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleSubmit = async () => {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('[ReceptionInvoice] 🚀 Iniciando envío de factura');
    console.log('═══════════════════════════════════════════════════════════════');

    // Validaciones
    if (!imageUri) {
      Alert.alert('Error', 'Debe capturar o seleccionar una imagen de la factura');
      return;
    }

    if (!invoiceTotal) {
      Alert.alert('Error', 'Debe completar el total de la factura');
      return;
    }

    // Validar formato de total (número decimal)
    const totalNumber = parseFloat(invoiceTotal);
    if (isNaN(totalNumber) || totalNumber <= 0) {
      Alert.alert('Error', 'El total de la factura debe ser un número válido mayor a 0');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Formatear fecha y hora desde Date objects
      const formattedDate = invoiceDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const hours = String(invoiceTime.getHours()).padStart(2, '0');
      const minutes = String(invoiceTime.getMinutes()).padStart(2, '0');
      const formattedTime = `${hours}:${minutes}:00`; // HH:MM:SS

      // Crear FormData
      const formData = new FormData();
      
      // Agregar la imagen
      const filename = imageUri.split('/').pop() || 'invoice.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('invoice_image', {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);

      // Agregar los otros campos
      formData.append('invoice_date', formattedDate);
      formData.append('invoice_time', formattedTime);
      formData.append('invoice_total', invoiceTotal);
      formData.append('status', 'COMPLETE');

      console.log('[ReceptionInvoice] 📤 FormData preparado:');
      console.log('  ├─ invoice_date:', formattedDate);
      console.log('  ├─ invoice_time:', formattedTime);
      console.log('  ├─ invoice_total:', invoiceTotal);
      console.log('  ├─ status: COMPLETE');
      console.log('  └─ invoice_image:', filename);

      // Obtener el token
      const token = apiMiddleware.getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Realizar la petición con fetch directamente (FormData no funciona bien con apiMiddleware)
      const response = await fetch(
        `${apiMiddleware.getBaseUrl()}/api/receptions/${receptionId}/upload-invoice/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      console.log('[ReceptionInvoice] 📡 Response status:', response.status);

      const responseData = await response.json();
      console.log('[ReceptionInvoice] 📦 Response data:', JSON.stringify(responseData, null, 2));

      if (response.ok) {
        console.log('[ReceptionInvoice] ✅ Factura cargada exitosamente');
        
        Alert.alert(
          'Éxito',
          'La recepción se ha completado correctamente',
          [
            {
              text: 'OK',
              onPress: () => {
                // Volver a la lista de recepción
                router.push('/reception');
              },
            },
          ]
        );
      } else {
        throw new Error(responseData.error || responseData.detail || 'Error al cargar la factura');
      }
    } catch (e: any) {
      console.error('[ReceptionInvoice] ❌ Error:', e);
      setError(e?.message || 'Error al cargar la factura');
      Alert.alert('Error', e?.message || 'Error al cargar la factura');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Cargar Factura</Text>
            <Text style={styles.headerSubtitle}>{providerName}</Text>
            <Text style={styles.headerOrderId}>Recepción #{receptionId}</Text>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Image Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Imagen de la Factura</Text>
            
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <Pressable style={styles.changeImageBtn} onPress={() => setImageUri(null)}>
                  <Ionicons name="close-circle" size={16} color="#ef4444" />
                  <Text style={styles.changeImageBtnText}>Cambiar imagen</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>Sin imagen</Text>
              </View>
            )}

            <View style={styles.buttonRow}>
              <Pressable style={[styles.actionButton, styles.cameraButton]} onPress={handleTakePhoto}>
                <Ionicons name="camera" size={20} color="#ffffff" />
                <Text style={styles.actionButtonText}>Tomar Foto</Text>
              </Pressable>

              <Pressable style={[styles.actionButton, styles.galleryButton]} onPress={handlePickImage}>
                <Ionicons name="images" size={20} color="#ffffff" />
                <Text style={styles.actionButtonText}>Galería</Text>
              </Pressable>
            </View>
          </View>

          {/* Invoice Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Datos de la Factura</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Fecha</Text>
              <Pressable 
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.datePickerButtonText}>
                  {invoiceDate.toLocaleDateString('es-ES', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  })}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Hora</Text>
              <Pressable 
                style={styles.datePickerButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.datePickerButtonText}>
                  {invoiceTime.toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
                <Ionicons name="time-outline" size={20} color="#6b7280" />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Total (€)</Text>
              <TextInput
                style={styles.input}
                value={invoiceTotal}
                onChangeText={setInvoiceTotal}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Date Picker Modal para iOS */}
          {Platform.OS === 'ios' && showDatePicker && (
            <Modal
              transparent={true}
              animationType="slide"
              visible={showDatePicker}
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Pressable onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.modalButtonText}>Cancelar</Text>
                    </Pressable>
                    <Text style={styles.modalTitle}>Seleccionar Fecha</Text>
                    <Pressable onPress={() => setShowDatePicker(false)}>
                      <Text style={[styles.modalButtonText, styles.modalButtonDone]}>Listo</Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={invoiceDate}
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        setInvoiceDate(selectedDate);
                      }
                    }}
                    textColor="#000000"
                  />
                </View>
              </View>
            </Modal>
          )}

          {/* Date Picker para Android */}
          {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker
              value={invoiceDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setInvoiceDate(selectedDate);
                }
              }}
            />
          )}

          {/* Time Picker Modal para iOS */}
          {Platform.OS === 'ios' && showTimePicker && (
            <Modal
              transparent={true}
              animationType="slide"
              visible={showTimePicker}
              onRequestClose={() => setShowTimePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Pressable onPress={() => setShowTimePicker(false)}>
                      <Text style={styles.modalButtonText}>Cancelar</Text>
                    </Pressable>
                    <Text style={styles.modalTitle}>Seleccionar Hora</Text>
                    <Pressable onPress={() => setShowTimePicker(false)}>
                      <Text style={[styles.modalButtonText, styles.modalButtonDone]}>Listo</Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={invoiceTime}
                    mode="time"
                    display="spinner"
                    onChange={(event, selectedTime) => {
                      if (selectedTime) {
                        setInvoiceTime(selectedTime);
                      }
                    }}
                    textColor="#000000"
                  />
                </View>
              </View>
            </Modal>
          )}

          {/* Time Picker para Android */}
          {Platform.OS === 'android' && showTimePicker && (
            <DateTimePicker
              value={invoiceTime}
              mode="time"
              display="default"
              onChange={(event, selectedTime) => {
                setShowTimePicker(false);
                if (selectedTime) {
                  setInvoiceTime(selectedTime);
                }
              }}
            />
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Botón flotante finalizar */}
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
                <Text style={styles.submitButtonText}>Finalizar ›</Text>
                <Text style={styles.submitButtonSubtext}>Recepción</Text>
              </View>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      
      <BottomMenu activeTab="tools" />
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
  scrollContent: {
    padding: 16,
    paddingBottom: 250, // Espacio para botón flotante + BottomMenu + espacio extra para teclado
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    resizeMode: 'cover',
  },
  changeImageBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  changeImageBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  imagePlaceholderText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  cameraButton: {
    backgroundColor: '#3b82f6',
  },
  galleryButton: {
    backgroundColor: '#8b5cf6',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  datePickerButton: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerButtonText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  modalButtonDone: {
    color: '#10b981',
    fontWeight: '600',
  },
});
