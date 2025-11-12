import React, { useEffect } from "react";
import { 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  StyleSheet
} from "react-native";
import { useAuth } from '@/context/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import DashboardScreen from './dashboard';
import FruitPreloader from '@/components/ui/FruitPreloader';

// Componente principal que maneja la navegación condicional
// AuthProvider ya está en _layout.tsx, no duplicar aquí
export default function Index() {
  const { state } = useAuth();

  // Log para detectar si el componente Index se remonta
  useEffect(() => {
    console.log('[INDEX] 🔶 Index montado - isInitialized:', state.isInitialized);
    return () => {
      console.log('[INDEX] 🔴 Index desmontado');
    };
  }, []);

  // Handlers para LoginForm (placeholders para futuras funcionalidades)
  const handleLoginSuccess = () => {
    console.log('🎉 Login exitoso - navegando al dashboard/mapa');
  };

  const handleForgotPassword = () => {
    console.log('🔑 Navegar a recuperar contraseña');
  };

  const handleSignUp = () => {
    console.log('📝 Navegar a registro');
  };

  // Mostrar preloader SOLO durante la inicialización inicial de la app
  // NO mostrarlo cada vez que isLoading sea true (login, refresh, etc.)
  if (!state.isInitialized) {
    console.log('[INDEX] ⏳ Mostrando preloader - isInitialized:', state.isInitialized);
    return (
      <FruitPreloader 
        message="Iniciando..." 
        showProgress={false}
        minDuration={1500}
      />
    );
  }

  // Si está autenticado, mostrar dashboard
  if (state.isAuthenticated) {
    console.log('[INDEX] 🏠 Usuario autenticado, mostrando dashboard');
    return <DashboardScreen />;
  }

  // Si no está autenticado, mostrar login
  console.log('[INDEX] 🔐 Usuario no autenticado, mostrando login');
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <LoginForm
          onLoginSuccess={handleLoginSuccess}
          onForgotPassword={handleForgotPassword}
          onSignUp={handleSignUp}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // slate-50
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
