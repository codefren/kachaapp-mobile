import { useEffect } from 'react';
import { useNavigationPersistence } from '@/hooks/useNavigationPersistence';
import { useAuth } from '@/context/AuthContext';

/**
 * Componente que maneja la persistencia de navegación
 * Debe estar dentro del AuthProvider y del Router context
 * 
 * Este componente:
 * - Guarda la ruta actual cuando el usuario navega
 * - Guarda la ruta cuando la app va a background
 * - Restaura la ruta cuando la app vuelve (solo si está autenticado)
 */
export default function NavigationPersistence() {
  const { state } = useAuth();
  const { currentRoute } = useNavigationPersistence(
    state.isAuthenticated,
    state.isInitialized
  );

  useEffect(() => {
    console.log('[NAV_PERSISTENCE] Estado:', {
      isAuthenticated: state.isAuthenticated,
      isInitialized: state.isInitialized,
      currentRoute,
    });
  }, [state.isAuthenticated, state.isInitialized, currentRoute]);

  // Este componente no renderiza nada, solo maneja la lógica
  return null;
}
