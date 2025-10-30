import React from "react";
import { 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Text
} from "react-native";
import { AuthProvider, useAuth } from '@/context/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import DashboardScreen from './dashboard';
import FruitPreloader from '@/components/ui/FruitPreloader';

// Componente principal que maneja la navegación condicional
function AppContent() {
  const { state } = useAuth();

  const handleLoginSuccess = () => {
    console.log('🎉 Login exitoso - navegando al dashboard/mapa');
  };

  const handleForgotPassword = () => {
    console.log('🔑 Navegar a recuperar contraseña');
  };

  const handleSignUp = () => {
    console.log('📝 Navegar a registro');
  };

  // Mostrar preloader mejorado mientras se verifica el token
  if (state.isLoading && !state.isAuthenticated) {
    return (
      <FruitPreloader 
        message="Verificando sesión..." 
        showProgress={false}
        minDuration={2000}
      />
    );
  }

  // Si está autenticado, mostrar dashboard
  if (state.isAuthenticated) {
    console.log('🏠 Usuario autenticado, mostrando dashboard');
    return <DashboardScreen />;
  }

  // Si no está autenticado, mostrar login
  console.log('🔐 Usuario no autenticado, mostrando login');
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        keyboardShouldPersistTaps='handled'
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

// Componente raíz con AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '500',
  },
});
