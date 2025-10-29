import BottomMenu from '@/components/navigation/BottomMenu';
import { useAuth } from '@/context/AuthContext';
import '@/global.css';
import { apiMiddleware } from '@/middleware/api';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Image, Modal, Pressable, StatusBar, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Product {
  id: number;
  name: string;
  sku?: string;
  units_per_box?: number;
  image?: string | null;
  providers: Array<{ id: number; name: string }>;
  barcodes: Array<{ id: number; code: string; type: string; is_primary: boolean }>;
  current_user_favorite: boolean;
  amount_boxes?: number;
  required?: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

interface ModifiedProduct {
  product: number;
  quantity_units: number;
  amount_boxes: number;
}

export default function ProductsScreen() {
  const router = useRouter();
  const { state } = useAuth();
  const params = useLocalSearchParams();
  
  const providerId = params.provider as string;
  const providerName = params.provider_name as string;
  const poId = params.po_id as string; // ID de la orden si está editando
  
  // Obtener token directamente del apiMiddleware
  const contextToken = state.accessToken;
  const middlewareToken = apiMiddleware.getAuthToken();
  const token = contextToken || middlewareToken;

  const [data, setData] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<boolean>(false);
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({});
  const [stockQuantities, setStockQuantities] = useState<{ [key: number]: number }>({});
  const [expandedDetails, setExpandedDetails] = useState<{ [key: number]: boolean }>({});
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [modifiedProducts, setModifiedProducts] = useState<ModifiedProduct[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  // Estados para paginación alfabética
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [loadedLetters, setLoadedLetters] = useState<string[]>([]);
  const [isAlphabeticalMode, setIsAlphabeticalMode] = useState<boolean>(true);
  const [showLetterToast, setShowLetterToast] = useState<boolean>(false);
  
  // Estados para pre-carga progresiva
  const [isPreloading, setIsPreloading] = useState<boolean>(false);
  const [preloadProgress, setPreloadProgress] = useState<number>(0); // 0-100
  const [letterIndexMap, setLetterIndexMap] = useState<Map<string, number>>(new Map()); // Letra -> índice en data
  
  // Estados para cámara
  const [cameraVisible, setCameraVisible] = useState<boolean>(false);
  const [scannedData, setScannedData] = useState<string>('');
  const [permission, requestPermission] = useCameraPermissions();
  
  // Estados para animación de producto escaneado
  const [scannedProductId, setScannedProductId] = useState<number | null>(null);
  const [scannerLoading, setScannerLoading] = useState<boolean>(false);
  const colorAnim = useRef(new Animated.Value(0)).current;
  
  // Usar refs para evitar dependencias en useCallback
  const nextUrlRef = useRef<string | null>(null);
  const dataRef = useRef<Product[] | null>(null);
  const isLoadingMoreRef = useRef<boolean>(false);
  const isAlphabeticalModeRef = useRef<boolean>(true);
  const isFetchingRef = useRef<boolean>(false); // Prevenir llamadas simultáneas
  const flatListRef = useRef<any>(null); // Ref para scroll programático
  
  // Refs para onViewableItemsChanged (deben ser estables)
  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100,
  });
  
  // Inicializar con función vacía para evitar error de nullability
  const onViewableItemsChangedRef = useRef<any>(({ viewableItems }: any) => {
    // Esta función se actualizará en el useEffect
  });
  
  // Actualizar refs cuando cambien los estados
  React.useEffect(() => {
    nextUrlRef.current = nextUrl;
  }, [nextUrl]);
  
  React.useEffect(() => {
    dataRef.current = data;
  }, [data]);
  React.useEffect(() => {
    isLoadingMoreRef.current = loadingMore;
  }, [loadingMore]);
  
  React.useEffect(() => {
    isAlphabeticalModeRef.current = isAlphabeticalMode;
  }, [isAlphabeticalMode]);

  // Log para verificar el estado de productos modificados
  React.useEffect(() => {
    if (modifiedProducts.length > 0) {
      console.log('Productos modificados:', JSON.stringify(modifiedProducts, null, 2));
    }
  }, [modifiedProducts]);

  // Cleanup del timeout cuando el componente se desmonte
  React.useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const fetchProducts = useCallback(async (
    isRefresh = false, 
    loadMore = false, 
    searchName = '', 
    letterStartsWith: string | null = null
  ) => {
    console.log('\n📥 === fetchProducts LLAMADO ===');
    console.log('Parámetros:', { isRefresh, loadMore, searchName, letterStartsWith });
    console.log('Estado actual:', { 
      currentLetter,
      loadedLetters,
      isAlphabeticalMode,
      hasNextPage,
      dataLength: data?.length || 0
    });
    
    // Prevenir llamadas simultáneas (excepto loadMore o isRefresh)
    if (isFetchingRef.current && !loadMore && !isRefresh) {
      console.warn('⚠️ fetchProducts ya en ejecución, ignorando llamada');
      console.log('❌ === fetchProducts BLOQUEADO ===\n');
      return;
    }
    
    // Si es isRefresh (click del usuario), forzar liberación del lock anterior
    if (isRefresh && isFetchingRef.current) {
      console.log('🔄 isRefresh=true, forzando liberación del lock anterior');
      isFetchingRef.current = false;
    }
    
    if (!token) {
      console.error('❌ No hay token disponible');
      setError('No hay token de autenticación disponible');
      return;
    }

    if (loadMore && !nextUrlRef.current) {
      return;
    }
    
    if (loadMore && isLoadingMoreRef.current) {
      return;
    }

    // Activar lock
    if (!loadMore) {
      isFetchingRef.current = true;
      console.log('🔒 Lock activado (isFetchingRef = true)');
    }

    try {
      if (!loadMore) {
        setLoading(!isRefresh);
        setError(null);
      } else {
        setLoadingMore(true);
        isLoadingMoreRef.current = true;
      }

      let url;
      if (loadMore && nextUrlRef.current) {
        // Convertir URL completa a ruta relativa
        const nextUrl = nextUrlRef.current;
        if (nextUrl.startsWith('http')) {
          // Extraer solo la parte de la ruta y query parameters
          const urlObj = new URL(nextUrl);
          url = urlObj.pathname + urlObj.search;
        } else {
          url = nextUrl;
        }
      } else {
        // Construir URL base con provider y ordering
        let baseUrl = `/api/products/?provider=${providerId}&ordering=name&page_size=200`;
        
        // Agregar parámetro de búsqueda si existe
        if (searchName.trim()) {
          baseUrl += `&name=${encodeURIComponent(searchName.trim())}`;
        }
        
        // Agregar filtro por letra inicial si existe
        if (letterStartsWith) {
          baseUrl += `&starts_with=${encodeURIComponent(letterStartsWith)}`;
          console.log('🔤 Añadido filtro starts_with:', letterStartsWith);
        }
        
        url = baseUrl;
        console.log('🌐 URL construida:', url);
      }


      const response = await apiMiddleware.get(url, true); // requiresAuth = true
      
      console.log('📦 Respuesta recibida:', {
        success: response.success,
        statusCode: response.statusCode,
        hasData: !!response.data
      });
      
      if (response.success && response.data) {
        const productsData = response.data as ProductsResponse;
        
        console.log('📊 Datos del backend:', {
          count: productsData.count,
          results_length: productsData.results.length,
          next: productsData.next,
          first_product: productsData.results[0]?.name
        });

        if (loadMore && dataRef.current) {
          console.log('⬇️ APPEND: Agregando', productsData.results.length, 'productos al final');
          // Evitar duplicados al concatenar
          const existingIds = new Set(dataRef.current.map(item => item.id));
          const newProducts = productsData.results.filter(item => !existingIds.has(item.id));
          setData([...dataRef.current, ...newProducts]);
        } else {
          setData(productsData.results);
        }
        
        // Registrar letra cargada si estamos en modo alfabético
        // Usar ref para evitar problemas de closure
        const currentIsAlphabeticalMode = isAlphabeticalModeRef.current;
        console.log('🔍 Verificando si registrar letra:', {
          letterStartsWith,
          isAlphabeticalMode: currentIsAlphabeticalMode
        });
        
        if (letterStartsWith && currentIsAlphabeticalMode) {
          console.log('🅰️ Registrando letra cargada:', letterStartsWith);
          setLoadedLetters(prev => {
            if (!prev.includes(letterStartsWith)) {
              const newLoadedLetters = [...prev, letterStartsWith].sort();
              console.log('✅ loadedLetters actualizado:', prev, '→', newLoadedLetters);
              return newLoadedLetters;
            }
            console.log('⚠️ Letra', letterStartsWith, 'ya estaba en loadedLetters:', prev);
            return prev;
          });
        } else if (letterStartsWith && !currentIsAlphabeticalMode) {
          console.log('⚠️ NO registra letra (modo no alfabético):', letterStartsWith);
        }
        
        setHasNextPage(!!productsData.next);
        setNextUrl(productsData.next);
        
        // Limpiar errores si la carga fue exitosa
        if (error) {
          setError(null);
        }
        if (networkError) {
          setNetworkError(false);
        }
      } else {
        // Si es error de autenticación
        if (response.statusCode === 401 || response.error?.includes('autorizado') || response.error?.includes('Unauthorized')) {
          setError('Sesión expirada. Por favor vuelve a la pantalla anterior e intenta de nuevo.');
          return;
        } else {
          const errorMessage = response.error || `Error ${response.statusCode || 'desconocido'} al cargar productos`;
          
          // Si es un error de red y estamos cargando más, no mostrar error global
          if (loadMore && (response.error?.includes('Network') || response.error?.includes('fetch'))) {
            setNetworkError(true);
            return;
          }
          
          setError(errorMessage);
          return; // No lanzar excepción, solo mostrar error
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Error al cargar productos');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      isLoadingMoreRef.current = false;
      
      // Liberar lock
      if (!loadMore) {
        isFetchingRef.current = false;
        console.log('🔓 Lock liberado (isFetchingRef = false)');
      }
      
      console.log('✅ === fetchProducts FINALIZADO ===\n');
    }
  }, [token, providerId]); // Solo dependencias esenciales

  // Función para obtener letras disponibles de TODO el catálogo
  const fetchAvailableLetters = useCallback(async () => {
    if (!token) return;

    try {
      const letters = new Set<string>();
      let hasMore = true;
      let page = 1;
      const pageSize = 200;
      
      // Obtener todas las páginas para encontrar todas las letras
      while (hasMore) {
        const url = `/api/products/?provider=${providerId}&ordering=name&page_size=${pageSize}&page=${page}`;
        const response = await apiMiddleware.get(url, true);
        
        if (response.success && response.data) {
          const productsData = response.data as ProductsResponse;
          
          // Extraer primeras letras únicas
          productsData.results.forEach(product => {
            const firstLetter = product.name.charAt(0).toUpperCase();
            if (/[A-Z]/.test(firstLetter)) {
              letters.add(firstLetter);
            }
          });
          
          // Si ya tenemos las 26 letras, no necesitamos seguir
          if (letters.size === 26) {
            hasMore = false;
          } else if (!productsData.next) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }
      
      setAvailableLetters(Array.from(letters).sort());
    } catch (e) {
      console.error('Error al obtener letras disponibles:', e);
    }
  }, [token, providerId]);

  // Función para pre-cargar TODOS los productos progresivamente
  const preloadAllProducts = useCallback(async () => {
    if (!token || isPreloading) return;
    
    console.log('\n📦 === INICIANDO PRE-CARGA DE TODOS LOS PRODUCTOS ===');
    setIsPreloading(true);
    setPreloadProgress(0);
    
    try {
      const allProducts: Product[] = [];
      const letterIndex = new Map<string, number>();
      let page = 1;
      let hasMore = true;
      let totalCount = 0;
      
      while (hasMore) {
        const url = `/api/products/?provider=${providerId}&ordering=name&page_size=200&page=${page}`;
        console.log(`📄 Cargando página ${page}...`);
        
        const response = await apiMiddleware.get(url, true);
        
        if (response.success && response.data) {
          const productsData = response.data as ProductsResponse;
          
          // Procesar productos y construir índice de letras
          productsData.results.forEach((product, localIndex) => {
            const globalIndex = allProducts.length;
            const firstLetter = product.name.charAt(0).toUpperCase();
            
            // Registrar primer producto de cada letra
            if (/[A-Z]/.test(firstLetter) && !letterIndex.has(firstLetter)) {
              letterIndex.set(firstLetter, globalIndex);
              console.log(`🅰️ Letra ${firstLetter} comienza en índice ${globalIndex}`);
            }
            
            allProducts.push(product);
          });
          
          // Actualizar progreso
          if (totalCount === 0 && productsData.count) {
            totalCount = productsData.count;
          }
          
          const progress = totalCount > 0 
            ? Math.round((allProducts.length / totalCount) * 100)
            : 0;
          
          setPreloadProgress(progress);
          console.log(`📊 Progreso: ${allProducts.length}/${totalCount} (${progress}%)`);
          
          // Actualizar datos parcialmente cada página para UX fluida
          setData([...allProducts]);
          
          // Verificar si hay más páginas
          if (productsData.next) {
            page++;
            // Pequeño delay para no saturar el backend
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      
      // Guardar datos completos y mapa de índices
      setData(allProducts);
      setLetterIndexMap(letterIndex);
      setAvailableLetters(Array.from(letterIndex.keys()).sort());
      
      console.log('✅ Pre-carga completada:', {
        totalProducts: allProducts.length,
        letters: Array.from(letterIndex.keys()).sort()
      });
      
      // Detectar letra inicial
      if (allProducts.length > 0) {
        const firstLetter = allProducts[0].name.charAt(0).toUpperCase();
        setCurrentLetter(firstLetter);
      }
      
    } catch (error) {
      console.error('❌ Error en pre-carga:', error);
      setError('Error al cargar el catálogo completo');
    } finally {
      setIsPreloading(false);
      setPreloadProgress(100);
      console.log('✅ === PRE-CARGA FINALIZADA ===\n');
    }
  }, [token, providerId, isPreloading]);

  // Función para obtener la siguiente letra disponible
  const getNextLetter = useCallback(() => {
    if (!isAlphabeticalMode || availableLetters.length === 0) return null;
    
    // Encontrar la próxima letra que no se ha cargado
    for (const letter of availableLetters) {
      if (!loadedLetters.includes(letter)) {
        return letter;
      }
    }
    
    return null; // Todas las letras han sido cargadas
  }, [isAlphabeticalMode, availableLetters, loadedLetters]);

  const onRefresh = useCallback(() => {
    console.log('\n🔄 onRefresh: Reiniciando pre-carga completa');
    setRefreshing(true);
    setData([]);
    setLetterIndexMap(new Map());
    setAvailableLetters([]);
    setCurrentLetter(null);
    
    // Reiniciar pre-carga
    preloadAllProducts().finally(() => {
      setRefreshing(false);
    });
  }, [preloadAllProducts]);

  const loadMoreProducts = useCallback(() => {
    console.log('\n📦 === loadMoreProducts LLAMADO ===');
    console.log('Estado:', {
      hasNextPage,
      loadingMore,
      loading,
      isAlphabeticalMode,
      currentLetter,
      loadedLetters,
      nextUrl: nextUrlRef.current
    });
    
    // Si hay más páginas de la letra actual, cargarlas
    if (hasNextPage && !loadingMore && !loading && nextUrlRef.current) {
      console.log('📄 Hay más páginas de la letra actual, cargando siguiente página');
      fetchProducts(false, true);
      console.log('✅ === loadMoreProducts FINALIZADO (loadMore) ===\n');
      return;
    }
    
    // Si estamos en modo alfabético y no hay más páginas, cargar siguiente letra
    if (isAlphabeticalMode && !hasNextPage && !loadingMore && !loading) {
      const nextLetter = getNextLetter();
      
      console.log('🅰️ Modo alfabético: terminada letra actual');
      console.log('Siguiente letra disponible:', nextLetter);
      
      if (nextLetter) {
        console.log(`⬇️ Cargando siguiente letra: ${nextLetter}`);
        setCurrentLetter(nextLetter);
        
        // Mostrar toast de la nueva letra
        setShowLetterToast(true);
        setTimeout(() => {
          setShowLetterToast(false);
        }, 800);
        
        // Cargar productos de la siguiente letra
        fetchProducts(false, false, '', nextLetter);
        console.log('✅ === loadMoreProducts FINALIZADO (nueva letra) ===\n');
      } else {
        console.log('✅ Todas las letras han sido cargadas');
        console.log('✅ === loadMoreProducts FINALIZADO (fin) ===\n');
      }
    } else {
      console.log('❌ No se cumplen condiciones para cargar más');
      console.log('✅ === loadMoreProducts FINALIZADO (sin acción) ===\n');
    }
  }, [hasNextPage, loadingMore, loading, isAlphabeticalMode, fetchProducts, getNextLetter]);

  // Función para búsqueda de productos
  const searchProducts = useCallback(async (query: string) => {
    if (isSearching) return;
    
    setIsSearching(true);
    setNextUrl(null);
    setCurrentLetter(null);
    setIsAlphabeticalMode(false); // Desactivar modo alfabético al buscar
    setLoadedLetters([]);
    
    try {
      await fetchProducts(false, false, query);
    } finally {
      setIsSearching(false);
    }
  }, [fetchProducts, isSearching]);

  // Función para limpiar búsqueda y volver a la lista original
  const clearSearch = useCallback(() => {
    // Limpiar timeout si existe
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
    
    setSearchQuery('');
    setNextUrl(null);
    setIsSearching(false);
    fetchProducts(true); // Refresh para obtener página 1 de la lista original
  }, [fetchProducts, searchTimeout]);

  // Función para manejar presión de letra en el índice alfabético
  const handleLetterPress = useCallback((letter: string) => {
    console.log('\n🔤 === handleLetterPress (SCROLL) LLAMADO ===');
    console.log('Letra presionada:', letter);
    console.log('currentLetter actual:', currentLetter);
    
    // Obtener índice de la letra
    const index = letterIndexMap.get(letter);
    
    if (index !== undefined && flatListRef.current && data) {
      console.log(`⬇️ Haciendo scroll a letra ${letter}, índice ${index}`);
      
      // Actualizar letra actual
      setCurrentLetter(letter);
      
      // Mostrar toast
      setShowLetterToast(true);
      setTimeout(() => {
        setShowLetterToast(false);
      }, 800);
      
      // Scroll a la posición
      try {
        flatListRef.current.scrollToIndex({
          index: index,
          animated: true,
          viewPosition: 0, // Arriba de la pantalla
        });
        console.log('✅ Scroll ejecutado correctamente');
      } catch (error) {
        console.warn('⚠️ Error en scrollToIndex, usando scrollToOffset:', error);
        // Fallback: calcular offset aproximado
        const estimatedOffset = index * 100; // Altura estimada por item
        flatListRef.current.scrollToOffset({
          offset: estimatedOffset,
          animated: true,
        });
      }
    } else {
      console.warn('⚠️ No se puede hacer scroll:', {
        hasIndex: index !== undefined,
        hasFlatListRef: !!flatListRef.current,
        hasData: !!data,
        dataLength: data?.length || 0
      });
      
      // Si aún no se han cargado todos los datos, mostrar mensaje
      if (isPreloading) {
        console.log('📊 Carga aún en progreso:', preloadProgress + '%');
      }
    }
    
    console.log('✅ === handleLetterPress FINALIZADO ===\n');
  }, [currentLetter, letterIndexMap, flatListRef, data, isPreloading, preloadProgress]);

  // Función para manejar cambios en el search query con debounce
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    
    // Limpiar timeout anterior si existe
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Si el texto está vacío, limpiar búsqueda inmediatamente
    if (text.trim() === '') {
      setNextUrl(null);
      setIsSearching(false);
      fetchProducts(true); // Volver a página 1 de lista original
      return;
    }
    
    // Configurar nuevo timeout para búsqueda
    const newTimeout = setTimeout(() => {
      searchProducts(text);
    }, 500) as any; // 500ms de delay
    
    setSearchTimeout(newTimeout);
  }, [searchTimeout, searchProducts, fetchProducts]);

  useFocusEffect(
    useCallback(() => {
      console.log('\n🔍 useFocusEffect disparado');
      console.log('Estado actual:', {
        dataLength: data?.length || 0,
        isPreloading,
        preloadProgress
      });
      
      // Solo cargar si NO hay datos y NO está pre-cargando
      if ((!data || data.length === 0) && !isPreloading) {
        console.log('✅ No hay datos, iniciando pre-carga completa...');
        preloadAllProducts();
      } else if (isPreloading) {
        console.log('📊 Pre-carga en progreso:', preloadProgress + '%');
      } else {
        console.log('✅ Datos ya cargados:', data?.length, 'productos');
      }
    }, [data, isPreloading, preloadProgress, preloadAllProducts])
  );
  
  // Efecto para iniciar con la primera letra cuando se cargan las letras disponibles
  // YA NO ES NECESARIO: preloadAllProducts maneja todo
  // React.useEffect(() => {
  //   ...
  // }, [availableLetters]);

  // Efecto para actualizar onViewableItemsChanged
  React.useEffect(() => {
    onViewableItemsChangedRef.current = ({ viewableItems }: any) => {
      // Usar ref para evitar problemas de closure
      const currentIsAlphabeticalMode = isAlphabeticalModeRef.current;
      
      console.log('\n👁️ onViewableItemsChanged disparado');
      console.log('isAlphabeticalMode (ref):', currentIsAlphabeticalMode);
      console.log('viewableItems.length:', viewableItems.length);
      
      if (!currentIsAlphabeticalMode || viewableItems.length === 0) {
        console.log('❌ Saliendo: modo no alfabético o sin items visibles');
        return;
      }
      
      const firstVisibleItem = viewableItems[0]?.item;
      console.log('Primer item visible:', firstVisibleItem?.name);
      
      if (firstVisibleItem && firstVisibleItem.name) {
        const firstLetter = firstVisibleItem.name.charAt(0).toUpperCase();
        console.log('Primera letra detectada:', firstLetter);
        console.log('currentLetter actual:', currentLetter);
        
        // Solo actualizar currentLetter si la letra es válida y diferente
        // NO recargar datos, solo actualizar el visual del sidebar
        if (/[A-Z]/.test(firstLetter) && firstLetter !== currentLetter) {
          console.log('✅ Actualizando currentLetter de', currentLetter, 'a', firstLetter);
          console.log('⚠️ IMPORTANTE: Solo actualiza visual, NO recarga datos');
          setCurrentLetter(firstLetter);
        } else {
          console.log('❌ No actualiza: letra inválida o igual a actual');
        }
      }
      console.log('👁️ onViewableItemsChanged finalizado\n');
    };
  }, [currentLetter]); // isAlphabeticalMode se usa via ref

  // Función para toggle de detalles expandidos
  const toggleDetails = (productId: number) => {
    setExpandedDetails(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  // Funciones auxiliares para manejar productos modificados
  const updateModifiedProduct = useCallback((productId: number, quantityUnits: number, amountBoxes: number) => {
    setModifiedProducts(prev => {
      const existingIndex = prev.findIndex(p => p.product === productId);
      
      // Si ambos valores son 0, remover del array
      if (quantityUnits === 0 && amountBoxes === 0) {
        if (existingIndex >= 0) {
          return prev.filter(p => p.product !== productId);
        }
        return prev;
      }
      
      const newProduct: ModifiedProduct = {
        product: productId,
        quantity_units: quantityUnits,
        amount_boxes: amountBoxes
      };
      
      if (existingIndex >= 0) {
        // Actualizar existente
        const updated = [...prev];
        updated[existingIndex] = newProduct;
        return updated;
      } else {
        // Agregar nuevo
        return [...prev, newProduct];
      }
    });
  }, []);

  // Función para obtener valores de un producto modificado
  const getModifiedProductValues = useCallback((productId: number) => {
    const modified = modifiedProducts.find(p => p.product === productId);
    return {
      quantityUnits: modified?.quantity_units || 0,
      amountBoxes: modified?.amount_boxes || 0
    };
  }, [modifiedProducts]);

  // Función para cargar datos de orden existente
  const loadExistingOrderData = useCallback(async () => {
    if (!poId || !token) return;

    try {
      console.log('Cargando datos de orden existente:', poId);
      const url = `/api/purchase-orders/${poId}/`;
      const response = await apiMiddleware.get(url, true);
      
      if (response.success && response.data) {
        const orderData = response.data as any;
        
        // Cargar items existentes en modifiedProducts
        if (orderData.items && orderData.items.length > 0) {
          const loadedProducts: ModifiedProduct[] = orderData.items.map((item: any) => ({
            product: item.product,
            quantity_units: item.quantity_units || 0,
            amount_boxes: item.amount_boxes || 0,
          }));
          
          setModifiedProducts(loadedProducts);
          
          // También actualizar estados locales
          const quantities: { [key: number]: number } = {};
          const stocks: { [key: number]: number } = {};
          loadedProducts.forEach(item => {
            quantities[item.product] = item.quantity_units;
            stocks[item.product] = item.amount_boxes;
          });
          setQuantities(quantities);
          setStockQuantities(stocks);
          
          console.log('Datos de orden cargados:', loadedProducts);
        }
      } else {
        console.error('Error al cargar orden:', response.error);
      }
    } catch (e: any) {
      console.error('Error al cargar datos de orden:', e);
    }
  }, [poId, token]);

  // Cargar datos de orden existente al montar el componente
  React.useEffect(() => {
    if (poId) {
      loadExistingOrderData();
    }
  }, [loadExistingOrderData]);

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
    
    // Resetear valor inicial
    colorAnim.setValue(0);
    
    // Animación de color: 0 = normal, 1 = amarillo
    Animated.sequence([
      Animated.timing(colorAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false, // No se puede usar nativeDriver para colores
      }),
      Animated.timing(colorAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: false,
      }),
    ]).start();

    // Limpiar después de la animación
    setTimeout(() => {
      setScannedProductId(null);
      colorAnim.setValue(0);
    }, 1200);
  }, [colorAnim]);

  // Función para manejar el escaneo de códigos
  const handleBarcodeScanned = useCallback(async (data: string) => {
    if (!data || data === scannedData) return;
    
    // Validar que sea un código EAN-13 válido (13 dígitos)
    const ean13Regex = /^\d{13}$/;
    if (!ean13Regex.test(data)) {
      console.log('[Products] ⚠️ Código inválido (no es EAN-13):', data);
      Alert.alert(
        'Código inválido',
        `El código "${data}" no es un EAN-13 válido.\n\nSolo se aceptan códigos de 13 dígitos numéricos.`
      );
      setScannedData('');
      return;
    }
    
    setScannedData(data);
    console.log('[Products] 📷 Código EAN-13 escaneado:', data);
    
    // Buscar producto por código de barras
    try {
      setScannerLoading(true);
      const url = `/api/products/?provider=${providerId}&barcode=${encodeURIComponent(data)}`;
      const response = await apiMiddleware.get(url, true);
      
      if (response.success && response.data) {
        const productsData = response.data as ProductsResponse;
        
        if (productsData.results.length > 0) {
          // Producto encontrado
          const foundProduct = productsData.results[0];
          
          // Cerrar cámara primero
          closeCamera();
          
          // Limpiar búsqueda si existe para mostrar lista completa
          if (searchQuery.trim()) {
            setSearchQuery('');
            if (searchTimeout) {
              clearTimeout(searchTimeout);
              setSearchTimeout(null);
            }
          }
          
          // Si ya hay productos, agregar el nuevo a la lista existente
          setData(prevData => {
            if (prevData && prevData.length > 0) {
              // Verificar si el producto ya existe en la lista
              const existingProduct = prevData.find(p => p.id === foundProduct.id);
              if (!existingProduct) {
                return [foundProduct, ...prevData];
              } else {
                // Si ya existe, moverlo al inicio y activar animación
                const filteredData = prevData.filter(p => p.id !== foundProduct.id);
                return [foundProduct, ...filteredData];
              }
            } else {
              // Si no hay productos, establecer solo el encontrado
              return [foundProduct];
            }
          });
          
          // Activar animación para el producto encontrado con más delay
          setTimeout(() => {
            animateScannedProduct(foundProduct.id);
          }, 300); // Más delay para asegurar que se renderice
          
          console.log('Producto encontrado:', foundProduct);
        } else {
          setError(`No se encontró producto con código: ${data}`);
        }
      } else {
        setError('Error al buscar producto por código de barras');
      }
    } catch (e: any) {
      setError(e?.message || 'Error al buscar producto');
    } finally {
      setScannerLoading(false);
    }
  }, [scannedData, providerId, closeCamera, animateScannedProduct]);

  // Funciones para manejar cantidades (cantidad a pedir)
  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    const currentValues = getModifiedProductValues(productId);
    updateModifiedProduct(productId, newQuantity, currentValues.amountBoxes);
    
    // Mantener el estado local para compatibilidad
    setQuantities(prev => {
      const updated = { ...prev };
      if (newQuantity === 0) {
        delete updated[productId];
      } else {
        updated[productId] = newQuantity;
      }
      return updated;
    });
  };

  const incrementQuantity = (productId: number) => {
    const currentQuantity = quantities[productId] || 0;
    updateQuantity(productId, currentQuantity + 1);
  };

  const decrementQuantity = (productId: number) => {
    const currentQuantity = quantities[productId] || 0;
    updateQuantity(productId, Math.max(0, currentQuantity - 1));
  };

  // Funciones para manejar stock actual
  const updateStockQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    const currentValues = getModifiedProductValues(productId);
    updateModifiedProduct(productId, currentValues.quantityUnits, newQuantity);
    
    // Mantener el estado local para compatibilidad
    setStockQuantities(prev => {
      const updated = { ...prev };
      if (newQuantity === 0) {
        delete updated[productId];
      } else {
        updated[productId] = newQuantity;
      }
      return updated;
    });
  };

  const incrementStock = (productId: number) => {
    const currentStock = stockQuantities[productId] || 0;
    updateStockQuantity(productId, currentStock + 1);
  };

  const decrementStock = (productId: number) => {
    const currentStock = stockQuantities[productId] || 0;
    updateStockQuantity(productId, Math.max(0, currentStock - 1));
  };

  // Función para enviar orden de compra
  const handleSubmitOrder = async () => {
    if (!token) {
      setError('No hay token de autenticación disponible');
      return;
    }

    if (modifiedProducts.length === 0) {
      setError('No hay productos para enviar');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Construir items para la orden
      const items = modifiedProducts.map(item => ({
        product: item.product,
        quantity_units: item.quantity_units,
        unit_type: 'boxes',
        amount_boxes: item.amount_boxes,
      }));

      let response;
      let orderIdToNavigate;

      if (poId) {
        // Actualizar orden existente (PATCH)
        const patchPayload = {
          items: items,
        };
        console.log('Actualizando orden de compra:', JSON.stringify(patchPayload, null, 2));
        response = await apiMiddleware.patch(`/api/purchase-orders/${poId}/`, patchPayload, true);
        orderIdToNavigate = poId;
      } else {
        // Crear nueva orden (POST)
        const postPayload = {
          provider: parseInt(providerId),
          status: 'PLACED',
          items: items,
        };
        console.log('Creando nueva orden de compra:', JSON.stringify(postPayload, null, 2));
        response = await apiMiddleware.post('/api/purchase-orders/', postPayload, true);
        
        if (response.success && response.data) {
          const createdOrder = response.data as any;
          orderIdToNavigate = createdOrder.id;
        }
      }

      if (response.success) {
        console.log('Orden procesada exitosamente');

        // Navegar a la pantalla de detalle de la orden
        router.push({
          pathname: '/purchase-order-detail',
          params: {
            po_id: orderIdToNavigate,
            provider: providerId,
            provider_name: providerName,
          },
        });

        // Limpiar productos modificados
        setModifiedProducts([]);
        setQuantities({});
        setStockQuantities({});
      } else {
        setError(response.error || `Error al ${poId ? 'actualizar' : 'crear'} la orden de compra`);
      }
    } catch (e: any) {
      setError(e?.message || 'Error al enviar la orden');
    } finally {
      setSubmitting(false);
    }
  };


  const renderProduct = ({ item }: { item: Product }) => {
    const primaryBarcode = item.barcodes?.find(b => b.is_primary)?.code || 
                          item.barcodes?.[0]?.code || 
                          item.sku || 
                          'Sin código';
    
    // Obtener valores reales de productos modificados
    const modifiedValues = getModifiedProductValues(item.id);
    const currentQuantity = modifiedValues.quantityUnits;
    const hasQuantity = currentQuantity > 0;
    const currentStock = modifiedValues.amountBoxes;
    const hasStockQuantity = currentStock > 0;
    
    // Un producto se considera sin stock solo si:
    // 1. amount_boxes es 0 Y
    // 2. No hay cantidad a pedir >= 1 Y
    // 3. No hay stock actual ingresado >= 1
    const isOutOfStock = (item.amount_boxes ?? 0) === 0 && currentQuantity < 1 && currentStock < 1;
    const isLowStock = (item.amount_boxes ?? 0) > 0 && (item.amount_boxes ?? 0) <= 5;
    const isExpanded = expandedDetails[item.id] || false;
    
    // Log para verificar valores de stock de cada producto
    // console.log(`Producto: ${item.name} | amount_boxes: ${item.amount_boxes} | isOutOfStock: ${isOutOfStock}`);
    // console.log('Item completo:', JSON.stringify(item, null, 2));
    

    // Determinar si este producto es el que se escaneó
    const isScannedProduct = scannedProductId === item.id;
    
    // Interpolación de color para la animación
    const animatedBackgroundColor = isScannedProduct ? colorAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['#ffffff', '#fefce8'], // blanco a amarillo muy claro
    }) : '#ffffff';
    
    const animatedBorderColor = isScannedProduct ? colorAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [
        hasQuantity || hasStockQuantity ? '#10b981' : 
        isOutOfStock ? '#fca5a5' : '#e5e7eb',
        '#fbbf24' // amarillo para el borde durante la animación
      ],
    }) : (
      hasQuantity || hasStockQuantity ? '#10b981' : 
      isOutOfStock ? '#fca5a5' : '#e5e7eb'
    );

    return (
      <Animated.View 
        className={`rounded-2xl mb-4 border shadow-lg overflow-hidden relative ${
          isOutOfStock ? 'bg-red-50/30' : ''
        }`}
        style={{
          backgroundColor: animatedBackgroundColor,
          borderColor: animatedBorderColor,
          borderWidth: 1,
        }}
      >
        
        {/* Indicador de Sin Stock - Punto con aura en esquina superior izquierda */}
        {isOutOfStock && (
          <View className="absolute top-2 left-2 z-20">
            {/* Aura externa */}
            <View className="w-8 h-8 rounded-full bg-red-100 items-center justify-center border-2 border-red-200">
              {/* Punto central */}
              <View className="w-4 h-4 rounded-full bg-red-500" />
            </View>
          </View>
        )}
        
        {/* Badge de Requerido en esquina superior derecha */}
        {item.required && (
          <View className="absolute top-2 right-2 z-10">
            <View className="bg-red-500 px-2 py-1 rounded-md shadow-sm">
              <Text className="text-white text-xs font-bold">REQUERIDO</Text>
            </View>
          </View>
        )}
        
        
        {/* FILA 1: Grid - Imagen + Nombre */}
        <View className="p-3 pb-2">
          <View className="flex-row gap-3">
            {/* Columna 1: Imagen */}
            <View className="relative">
              {item.image ? (
                <View className="relative">
                  <Image 
                    source={{ uri: item.image }} 
                    className="w-14 h-14 rounded-xl bg-gray-100"
                    style={{ opacity: isOutOfStock ? 0.4 : 1 }}
                  />
                  {/* Overlay para productos sin stock */}
                  {isOutOfStock && (
                    <View className="absolute inset-0 bg-red-500/10 rounded-xl border border-red-200" />
                  )}
                </View>
              ) : (
                <View className="w-14 h-14 rounded-xl bg-gray-100 items-center justify-center border-2 border-dashed border-gray-300 relative"
                      style={{ opacity: isOutOfStock ? 0.4 : 1 }}>
                  <Text className="text-xl">📦</Text>
                  {/* Overlay para productos sin stock */}
                  {isOutOfStock && (
                    <View className="absolute inset-0 bg-red-500/10 rounded-xl border border-red-200" />
                  )}
                </View>
              )}
            </View>
            
            {/* Columna 2: Nombre + Indicador seleccionado */}
            <View className="flex-1">
              {/* Nombre del producto */}
              <View className="pr-10 mb-2">
                <Text className={`text-sm font-bold leading-4 ${
                  isOutOfStock ? 'text-gray-500' : 'text-gray-900'
                }`}>
                  {item.name}
                </Text>
                {/* Indicador de Sin Stock debajo del nombre */}
              </View>
            </View>
          </View>
        </View>
        
        {/* FILA 2: Controles de Cantidad optimizados */}
        <View className="flex-row px-4 pb-3 gap-3">
          {/* Cantidad a pedir */}
          <View className="flex-1">
            <Text className="text-xs font-semibold text-gray-700 mb-2">Cantidad a pedir</Text>
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg p-2">
              <Pressable 
                className={`w-8 h-8 rounded items-center justify-center ${
                  hasQuantity ? 'bg-gray-600' : 'bg-gray-300'
                }`}
                onPress={() => decrementQuantity(item.id)}
                disabled={!hasQuantity}
              >
                <Text className={`text-sm font-bold ${
                  hasQuantity ? 'text-white' : 'text-gray-500'
                }`}>−</Text>
              </Pressable>
              
              <View className="flex-1 px-2 items-center">
                <Text className="text-lg font-bold text-gray-900">{currentQuantity}</Text>
              </View>
              
              <Pressable 
                className="w-8 h-8 rounded items-center justify-center bg-gray-600"
                onPress={() => incrementQuantity(item.id)}
              >
                <Text className="text-sm font-bold text-white">+</Text>
              </Pressable>
            </View>
          </View>
          
          {/* Stock actual */}
          <View className="flex-1">
            <Text className="text-xs font-semibold text-gray-700 mb-2">Stock actual</Text>
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg p-2">
              <Pressable 
                className={`w-8 h-8 rounded items-center justify-center ${
                  hasStockQuantity ? 'bg-gray-600' : 'bg-gray-300'
                }`}
                onPress={() => decrementStock(item.id)}
                disabled={!hasStockQuantity}
              >
                <Text className={`text-sm font-bold ${
                  hasStockQuantity ? 'text-white' : 'text-gray-500'
                }`}>−</Text>
              </Pressable>
              
              <View className="flex-1 px-2 items-center">
                <Text className="text-lg font-bold text-gray-900">{currentStock}</Text>
              </View>
              
              <Pressable 
                className="w-8 h-8 rounded items-center justify-center bg-gray-600"
                onPress={() => incrementStock(item.id)}
              >
                <Text className="text-sm font-bold text-white">+</Text>
              </Pressable>
            </View>
          </View>
        </View>
        
        {/* FILA 3: Collapse de Detalles */}
        <View className="border-t border-gray-200">
          <Pressable 
            className="flex-row items-center justify-between px-3 py-2"
            onPress={() => toggleDetails(item.id)}
          >
            <Text className="text-sm font-semibold text-gray-700">
              Detalles del producto
            </Text>
            <Text className={`text-base font-bold text-gray-500 transform ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}>
              ▼
            </Text>
          </Pressable>
          
          {isExpanded && (
            <View className="px-4 pb-4 bg-gray-50 gap-2">
              {/* Código */}
              <View className="flex-row items-center gap-3 py-1">
                <View className="w-6 h-6 rounded-md bg-slate-100 items-center justify-center">
                  <Text className="text-sm">🏷️</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-medium text-gray-600">Código</Text>
                  <Text className="text-sm font-semibold text-gray-900">{primaryBarcode}</Text>
                </View>
              </View>
              
              {/* Unidades por caja */}
              {item.units_per_box && (
                <View className="flex-row items-center gap-3 py-1">
                  <View className="w-6 h-6 rounded-md bg-slate-100 items-center justify-center">
                    <Text className="text-sm">📦</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-medium text-gray-600">Unidades por caja</Text>
                    <Text className="text-sm font-semibold text-gray-900">{item.units_per_box} unidades</Text>
                  </View>
                </View>
              )}
              
              {/* Stock disponible */}
              <View className="flex-row items-center gap-3 py-1">
                <View className="w-6 h-6 rounded-md bg-slate-100 items-center justify-center">
                  <Text className="text-sm">📊</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-medium text-gray-600">Stock disponible</Text>
                  <View className="flex-row items-center gap-2">
                    <Text className={`text-sm font-semibold ${
                      item.amount_boxes === 0 ? 'text-red-600' : 
                      item.amount_boxes <= 5 ? 'text-orange-600' : 'text-gray-900'
                    }`}>
                      {item.amount_boxes} cajas
                    </Text>
                    {item.amount_boxes === 0 && (
                      <View className="bg-red-100 border border-red-200 px-2 py-0.5 rounded">
                        <Text className="text-xs font-semibold text-red-800">Sin stock</Text>
                      </View>
                    )}
                    {item.amount_boxes > 0 && item.amount_boxes <= 5 && (
                      <View className="bg-orange-100 border border-orange-200 px-2 py-0.5 rounded">
                        <Text className="text-xs font-semibold text-orange-800">Stock bajo</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              
              {/* Proveedor */}
              {item.providers && item.providers.length > 0 && (
                <View className="flex-row items-center gap-3 py-1">
                  <View className="w-6 h-6 rounded-md bg-slate-100 items-center justify-center">
                    <Text className="text-sm">🏢</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-medium text-gray-600">Proveedor</Text>
                    <Text className="text-sm font-semibold text-gray-900">{item.providers[0].name}</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View className="py-5 items-center">
          <ActivityIndicator size="small" color="#10b981" />
          <Text className="mt-2 text-sm text-gray-600">Cargando más productos...</Text>
        </View>
      );
    }
    
    // Mostrar error de red con botón de reintentar
    if (networkError && hasNextPage) {
      return (
        <View className="py-5 items-center">
          <Text className="text-sm text-red-500 mb-2">Error de conexión</Text>
          <Pressable 
            className="bg-emerald-500 rounded-lg px-4 py-2" 
            onPress={() => {
              setNetworkError(false);
              loadMoreProducts();
            }}
          >
            <Text className="text-white text-sm font-semibold">Reintentar</Text>
          </Pressable>
        </View>
      );
    }
    
    // Mostrar mensaje cuando no hay más páginas
    if (data && data.length > 0 && !hasNextPage) {
      return (
        <View className="py-5 items-center">
          <Text className="text-sm text-gray-500 italic">No hay más productos</Text>
        </View>
      );
    }
    
    return null;
  };

  if (loading && !data) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View className="flex-1 items-center justify-center bg-slate-50 p-4">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="mt-3 text-gray-600 text-base">Cargando productos...</Text>
        </View>
        <BottomMenu activeTab="tools" />
      </SafeAreaView>
    );
  }

  if (error) {
    const isAuthError = error.includes('Sesión expirada') || error.includes('autorizado');
    
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View className="flex-1 items-center justify-center bg-slate-50 p-4">
          <Text className="text-red-500 mb-3 font-semibold text-center">{error}</Text>
          
          <View className="flex-row gap-3 mt-2">
            {isAuthError ? (
              <Pressable className="bg-gray-500 rounded-xl px-4 py-2.5" onPress={() => router.back()}>
                <Text className="text-white font-bold"></Text>
              </Pressable>
            ) : (
              <Pressable className="bg-emerald-500 rounded-xl px-4 py-2.5" onPress={() => fetchProducts()}>
                <Text className="text-white font-bold">Reintentar</Text>
              </Pressable>
            )}
          </View>
        </View>
        <BottomMenu activeTab="tools" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View className="flex-1 bg-slate-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-100 shadow-sm">
          <View className="px-5 pt-4 pb-3">
            {/* Primera fila: Navegación, Título y Scanner */}
            <View className="flex-row items-center justify-between mb-4">
              <Pressable className="w-10 h-10 rounded-lg bg-gray-100 items-center justify-center" onPress={() => router.back()}>
                <View className="w-5 h-5 items-center justify-center">
                  <Text className="text-gray-700 text-lg font-bold">‹</Text>
                </View>
              </Pressable>
              
              <View className="flex-1 items-center mx-4">
                <Text className="text-2xl font-bold text-gray-900">Productos</Text>
                <Text className="text-base text-gray-600 mt-1">
                  {decodeURIComponent(providerName || 'Proveedor')}
                </Text>
              </View>
              
              {/* Icono de Scanner */}
              <Pressable 
                className={`w-12 h-12 rounded-lg border items-center justify-center shadow-sm ${
                  scannerLoading ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-300'
                }`}
                onPress={openCamera}
                disabled={scannerLoading}
              >
                <View className="items-center justify-center">
                  {scannerLoading ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                  ) : (
                    /* Icono de scanner profesional */
                    <View className="w-6 h-6 items-center justify-center">
                      <View className="w-5 h-5 border-2 border-gray-600 rounded-sm relative">
                        {/* Esquinas del marco de escaneo */}
                        <View className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 border-t-2 border-l-2 border-gray-700" />
                        <View className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 border-t-2 border-r-2 border-gray-700" />
                        <View className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 border-b-2 border-l-2 border-gray-700" />
                        <View className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 border-b-2 border-r-2 border-gray-700" />
                        {/* Línea de escaneo */}
                        <View className="absolute top-2 left-0 right-0 h-0.5 bg-gray-600" />
                      </View>
                    </View>
                  )}
                </View>
              </Pressable>
            </View>
          </View>
          
          {/* Search Bar */}
          <View className="px-5 pb-3">
            <View className="flex-row items-center gap-3">
              <View className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 flex-row items-center shadow-sm">
                <View className="w-4 h-4 mr-2 items-center justify-center">
                  <Text className="text-gray-500 text-lg leading-none">⌕</Text>
                </View>
                <TextInput
                  className="flex-1 text-sm text-gray-900"
                  placeholder="Buscar productos..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  onSubmitEditing={() => {
                    if (searchQuery.trim()) {
                      // Limpiar timeout y buscar inmediatamente
                      if (searchTimeout) {
                        clearTimeout(searchTimeout);
                        setSearchTimeout(null);
                      }
                      searchProducts(searchQuery);
                    }
                  }}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={clearSearch} className="ml-2 w-4 h-4 items-center justify-center bg-gray-100 rounded-full">
                    <Text className="text-gray-500 text-xs font-bold">×</Text>
                  </Pressable>
                )}
              </View>
              
              {/* Indicador de búsqueda en progreso */}
              {isSearching && (
                <View className="px-3 py-2">
                  <ActivityIndicator size="small" color="#10b981" />
                </View>
              )}
            </View>
          </View>
          
          {/* Indicador de progreso de pre-carga */}
          {isPreloading && preloadProgress < 100 && (
            <View className="px-4 py-2 bg-emerald-50 border-b border-emerald-200">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xs font-semibold text-emerald-700">
                  Cargando catálogo completo...
                </Text>
                <Text className="text-xs font-bold text-emerald-700">
                  {preloadProgress}%
                </Text>
              </View>
              <View className="w-full h-1.5 bg-emerald-200 rounded-full overflow-hidden">
                <View 
                  className="h-full bg-emerald-500"
                  style={{ width: `${preloadProgress}%` }}
                />
              </View>
            </View>
          )}
          
        </View>
        
        <FlatList
          ref={flatListRef}
          data={data || []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProduct}
          className="pl-4 pr-16 pt-2 pb-24"
          onViewableItemsChanged={onViewableItemsChangedRef.current}
          viewabilityConfig={viewabilityConfigRef.current}
          getItemLayout={(data, index) => ({
            length: 194, // Altura aproximada de cada item (del error: averageItemLength: 193.99)
            offset: 194 * index,
            index,
          })}
          onScrollToIndexFailed={(info) => {
            console.warn('⚠️ scrollToIndex failed:', info);
            // Fallback: scroll usando offset calculado
            const offset = info.averageItemLength * info.index;
            setTimeout(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToOffset({
                  offset: offset,
                  animated: true,
                });
              }
            }, 100);
          }}
          removeClippedSubviews={false}
          maxToRenderPerBatch={20}
          windowSize={21}
          initialNumToRender={20}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            !loading ? (
              <View className="items-center p-8 mt-10">
                <Text className="text-lg font-semibold text-gray-700 mb-2 text-center">No hay productos disponibles</Text>
                <Text className="text-sm text-gray-600 text-center leading-5">
                  Este proveedor no tiene productos registrados
                </Text>
              </View>
            ) : null
          }
        />
      </View>
      
      {/* Toast de letra seleccionada */}
      {showLetterToast && currentLetter && (
        <View className="absolute inset-0 items-center justify-center" style={{ zIndex: 100 }} pointerEvents="none">
          <View className="bg-gray-900/90 rounded-3xl px-12 py-10 shadow-2xl">
            <Text className="text-white text-7xl font-black">{currentLetter}</Text>
          </View>
        </View>
      )}
      
      {/* Índice alfabético lateral */}
      {availableLetters.length > 0 && (
        <View 
          style={{ 
            position: 'absolute',
            right: 4,
            top: 200, 
            bottom: 100,
            justifyContent: 'center',
            zIndex: 50 
          }}
        >
          <View className="bg-white/98 rounded-2xl py-3 px-2 shadow-2xl border-2 border-gray-200">
            {Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map((letter) => {
              const isAvailable = availableLetters.includes(letter);
              const isActive = currentLetter === letter;
              
              return (
                <Pressable
                  key={letter}
                  onPress={() => {
                    if (isAvailable) {
                      handleLetterPress(letter);
                    }
                  }}
                  disabled={!isAvailable}
                  style={{
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    marginVertical: 2,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 32,
                    minHeight: 24,
                    backgroundColor: isActive ? '#10b981' : 'transparent',
                  }}
                >
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: !isAvailable ? '#d1d5db' : isActive ? '#ffffff' : '#1f2937'
                  }}>
                    {letter}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      
      {/* Botón flotante de enviar pedido */}
      {modifiedProducts.filter(p => p.quantity_units > 0 || p.amount_boxes > 0).length > 0 && (
        <View className="absolute bottom-32 right-6">
          <Pressable 
            className={`rounded-xl px-6 py-4 items-center justify-center shadow-lg min-w-28 ${
              submitting ? 'bg-gray-400' : 'bg-emerald-600 shadow-emerald-600/25'
            }`}
            onPress={handleSubmitOrder}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <View className="items-center">
                <Text className="text-lg font-bold text-white leading-6 mb-1">
                  Enviar ›
                </Text>
                <Text className="text-sm font-medium text-emerald-100">
                  {modifiedProducts.filter(p => p.quantity_units > 0 || p.amount_boxes > 0).length} productos
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      )}
      
      <BottomMenu activeTab="tools" />
      
      {/* Modal de Cámara */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={cameraVisible}
        onRequestClose={closeCamera}
      >
        <View className="flex-1 bg-black">
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
              
              {/* Overlay content positioned absolutely on top of camera */}
              <View className="absolute top-12 left-4 right-4 z-10">
                <Pressable 
                  className="bg-white/90 rounded-xl px-4 py-3 mb-4"
                  onPress={closeCamera}
                >
                  <Text className="text-center font-semibold text-gray-900">✕ Cerrar Cámara</Text>
                </Pressable>
                
                {scannedData && (
                  <View className="bg-emerald-500 rounded-xl px-4 py-3">
                    <Text className="text-white font-semibold text-center">
                      Código escaneado: {scannedData}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Guía de escaneo */}
              <View className="absolute inset-0 items-center justify-center">
                <View className="w-64 h-64 border-2 border-white rounded-2xl">
                  <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-slate-400 rounded-tl-2xl" />
                  <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-slate-400 rounded-tr-2xl" />
                  <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-slate-400 rounded-bl-2xl" />
                  <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-slate-400 rounded-br-2xl" />
                </View>
              </View>
              
              {/* Instrucciones */}
              <View className="absolute bottom-0 left-0 right-0">
                <SafeAreaView>
                  <View className="p-6">
                    <View className="bg-black/70 rounded-xl p-4">
                      <Text className="text-white text-center font-semibold mb-2">
                        Escanear código EAN-13
                      </Text>
                      <Text className="text-white/80 text-center text-sm">
                        Solo se aceptan códigos de barras EAN-13 (13 dígitos)
                      </Text>
                      
                      {scannedData && (
                        <View className="mt-4 bg-slate-500/20 rounded-lg p-3">
                          <Text className="text-slate-300 text-center font-semibold">
                            Código escaneado: {scannedData}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </SafeAreaView>
              </View>
            </>
          ) : (
            <View className="flex-1 items-center justify-center p-4">
              <Text className="text-white text-lg mb-4 text-center">
                Se requiere permiso de cámara para escanear códigos de barras
              </Text>
              <Pressable 
                className="bg-white rounded-xl px-6 py-3 mb-4"
                onPress={async () => {
                  const { granted } = await requestPermission();
                  if (!granted) {
                    setError('Permiso de cámara denegado');
                    closeCamera();
                  }
                }}
              >
                <Text className="text-gray-900 font-semibold">Solicitar Permiso</Text>
              </Pressable>
              <Pressable 
                className="bg-gray-600 rounded-xl px-6 py-3"
                onPress={closeCamera}
              >
                <Text className="text-white font-semibold">Cancelar</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
