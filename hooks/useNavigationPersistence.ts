import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSegments } from 'expo-router';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_ROUTE_KEY = 'last_navigation_route';

/**
 * Hook para persistir la ruta de navegación actual
 * Guarda la ruta cuando cambia y cuando la app va a background
 * Restaura la ruta cuando la app vuelve de background
 * 
 * @param isAuthenticated - Si el usuario está autenticado (solo restaura rutas si está autenticado)
 * @param isInitialized - Si la app terminó de inicializarse
 */
export function useNavigationPersistence(
  isAuthenticated: boolean = false,
  isInitialized: boolean = false
) {
  const pathname = usePathname();
  const segments = useSegments();
  const router = useRouter();
  const appStateRef = useRef(AppState.currentState);
  const hasRestoredRef = useRef(false);
  const lastSavedRouteRef = useRef<string | null>(null);

  // Guardar ruta actual cuando cambia (solo si está autenticado)
  useEffect(() => {
    const saveCurrentRoute = async () => {
      if (!isAuthenticated) return;
      
      try {
        // Solo guardar si no es la pantalla de login y si cambió
        if (pathname !== '/' && pathname !== '/index' && pathname !== lastSavedRouteRef.current) {
          await AsyncStorage.setItem(LAST_ROUTE_KEY, pathname);
          lastSavedRouteRef.current = pathname;
          console.log('[NAV] 📍 Ruta guardada:', pathname);
        }
      } catch (error) {
        console.error('[NAV] Error guardando ruta:', error);
      }
    };

    saveCurrentRoute();
  }, [pathname, isAuthenticated]);

  // Restaurar ruta al montar (solo una vez y si está autenticado)
  useEffect(() => {
    const restoreRoute = async () => {
      // Solo restaurar si:
      // 1. No se ha restaurado antes
      // 2. La app está inicializada
      // 3. El usuario está autenticado
      // 4. Estamos en la ruta raíz
      if (hasRestoredRef.current || !isInitialized || !isAuthenticated) return;
      if (pathname !== '/' && pathname !== '/index' && pathname !== '/dashboard') return;
      
      try {
        const savedRoute = await AsyncStorage.getItem(LAST_ROUTE_KEY);
        if (savedRoute && savedRoute !== '/' && savedRoute !== '/index') {
          console.log('[NAV] 🔄 Restaurando ruta guardada:', savedRoute);
          hasRestoredRef.current = true;
          // Delay para asegurar que el router y la autenticación están listos
          setTimeout(() => {
            router.replace(savedRoute as any);
          }, 300);
        }
      } catch (error) {
        console.error('[NAV] Error restaurando ruta:', error);
      }
    };

    restoreRoute();
  }, [isInitialized, isAuthenticated, pathname]);

  // Escuchar cambios de AppState para guardar cuando va a background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      // Cuando la app va a background, guardar ruta actual
      if (previousAppState === 'active' && nextAppState.match(/inactive|background/)) {
        console.log('[NAV] 📱 App yendo a background, guardando ruta:', pathname);
        try {
          if (pathname !== '/' && pathname !== '/index') {
            await AsyncStorage.setItem(LAST_ROUTE_KEY, pathname);
          }
        } catch (error) {
          console.error('[NAV] Error guardando ruta en background:', error);
        }
      }

      // Cuando la app vuelve a foreground
      if (previousAppState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[NAV] 📱 App volviendo a foreground, ruta actual:', pathname);
      }
    });

    return () => subscription.remove();
  }, [pathname]);

  return {
    currentRoute: pathname,
    segments,
  };
}

/**
 * Función helper para limpiar la ruta guardada (usar en logout)
 */
export async function clearSavedRoute() {
  try {
    await AsyncStorage.removeItem(LAST_ROUTE_KEY);
    console.log('[NAV] 🗑️ Ruta guardada limpiada');
  } catch (error) {
    console.error('[NAV] Error limpiando ruta:', error);
  }
}
