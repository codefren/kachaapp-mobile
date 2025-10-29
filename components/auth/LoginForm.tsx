import FruitPreloader from "@/components/ui/FruitPreloader";
import { useAuth } from "@/context/AuthContext";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

interface LoginFormProps {
  onLoginSuccess?: () => void;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
}

export default function LoginForm({
  onLoginSuccess,
  onForgotPassword,
  onSignUp,
}: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { state, login } = useAuth();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    // Validación básica de username
    if (username.length < 3) {
      Alert.alert(
        "Error",
        "El nombre de usuario debe tener al menos 3 caracteres"
      );
      return;
    }

    console.log("🔐 Iniciando login para usuario:", username);
    const result = await login(username, password);

    if (result.success) {
      console.log("✅ Login exitoso:", result.message);
      onLoginSuccess?.();
    } else {
      console.log("❌ Error en login:", result.message);
      Alert.alert("Error", result.message || "Error al iniciar sesión");
    }
  };

  const handleForgotPassword = () => {
    if (onForgotPassword) {
      onForgotPassword();
    } else {
      Alert.alert("Recuperar Contraseña", "¿Deseas recuperar tu contraseña?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Enviar",
          onPress: () => {
            if (!username) {
              Alert.alert(
                "Error",
                "Por favor ingresa tu nombre de usuario primero"
              );
              return;
            }
            // Aquí podrías llamar a forgotPassword del contexto
            Alert.alert("Enviado", "Se ha enviado información de recuperación");
          },
        },
      ]);
    }
  };

  const handleSignUp = () => {
    if (onSignUp) {
      onSignUp();
    } else {
      Alert.alert("Registro", "Funcionalidad de registro no implementada");
    }
  };

  // Mostrar preloader mientras se procesa el login
  if (state.isLoading) {
    return (
      <FruitPreloader
        message="Iniciando sesión..."
        showProgress={true}
        minDuration={3000}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.logoText}>KachaSystem</Text>
        <Text style={styles.welcomeText}>Bienvenido de vuelta</Text>
      </View>

      {/* Form Section */}
      <View style={styles.formSection}>
        <View style={styles.formCard}>
          {/* Username Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Usuario</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="nombre_usuario"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              autoComplete="username"
              editable={!state.isLoading}
              style={[
                styles.textInput,
                state.isLoading && styles.textInputDisabled,
              ]}
            />
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              secureTextEntry
              autoComplete="password"
              editable={!state.isLoading}
              style={[
                styles.textInput,
                state.isLoading && styles.textInputDisabled,
              ]}
            />
          </View>

          {/* Login Button */}
          <Pressable
            onPress={handleLogin}
            disabled={state.isLoading}
            style={[
              styles.loginButton,
              state.isLoading
                ? styles.loginButtonDisabled
                : styles.loginButtonActive,
            ]}
          >
            <Text style={styles.loginButtonText}>
              {state.isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Text>
          </Pressable>

          {/* Forgot Password */}
          <Pressable
            style={styles.forgotPasswordContainer}
            onPress={handleForgotPassword}
            disabled={state.isLoading}
          >
            <Text
              style={[
                styles.forgotPasswordText,
                state.isLoading && styles.textDisabled,
              ]}
            >
              ¿Olvidaste tu contraseña?
            </Text>
          </Pressable>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>¿No tienes cuenta? </Text>
            <Pressable onPress={handleSignUp} disabled={state.isLoading}>
              <Text
                style={[
                  styles.signupLink,
                  state.isLoading && styles.textDisabled,
                ]}
              >
                Regístrate
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    justifyContent: "center",
    minHeight: height,
  },

  // Header Styles
  headerSection: {
    alignItems: "center",
    paddingBottom: 40,
  },
  logoText: {
    fontSize: 48,
    fontWeight: "900",
    color: "#1e293b", // slate-800
    textAlign: "center",
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 20,
    color: "#475569", // slate-600
    fontWeight: "500",
    textAlign: "center",
  },

  // Form Styles
  formSection: {
    justifyContent: "center",
    alignItems: "center",
  },
  formCard: {
    width: "100%",
    maxWidth: 384, // max-w-sm
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0", // slate-200
  },

  // Input Styles
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151", // slate-700
    marginBottom: 8,
  },
  textInput: {
    width: "100%",
    height: 48,
    paddingHorizontal: 16,
    backgroundColor: "#f1f5f9", // slate-100
    borderWidth: 1,
    borderColor: "#cbd5e1", // slate-300
    borderRadius: 8,
    color: "#0f172a", // slate-900
    fontSize: 16,
  },
  textInputDisabled: {
    backgroundColor: "#f8fafc", // slate-50
    color: "#94a3b8", // slate-400
  },

  // Button Styles
  loginButton: {
    width: "100%",
    height: 48,
    borderRadius: 8,
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  loginButtonActive: {
    backgroundColor: "#2563eb", // blue-600
  },
  loginButtonDisabled: {
    backgroundColor: "#94a3b8", // slate-400
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },

  // Forgot Password
  forgotPasswordContainer: {
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#2563eb", // blue-600
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },

  // Sign Up Styles
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0", // slate-200
  },
  signupText: {
    color: "#64748b", // slate-600
    fontSize: 16,
  },
  signupLink: {
    color: "#2563eb", // blue-600
    fontWeight: "600",
    fontSize: 16,
  },

  // Disabled text
  textDisabled: {
    color: "#94a3b8", // slate-400
  },
});
