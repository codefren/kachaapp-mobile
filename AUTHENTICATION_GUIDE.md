# 🔐 Sistema de Autenticación con Geolocalización - KCH Digital

## 📋 Resumen del Sistema

Este sistema implementa autenticación basada en geolocalización con refresh automático de tokens cada 3 minutos, específicamente diseñado para los requerimientos de KCH Digital.

## 🏗️ Arquitectura Implementada

### **Componentes Principales**

```
├── 📁 types/
│   ├── auth.ts           # Tipos base de autenticación
│   └── location.ts       # Tipos de geolocalización
├── 📁 services/
│   ├── authService.ts    # Servicio de autenticación
│   └── locationService.ts # Servicio de geolocalización
├── 📁 middleware/
│   └── api.ts           # Middleware para requests HTTP
├── 📁 context/
│   └── AuthContext.tsx  # Context global de autenticación
├── 📁 components/
│   ├── auth/LoginForm.tsx # Formulario de login
│   └── debug/AuthDebugPanel.tsx # Panel de debug
├── 📁 hooks/
│   └── useLocation.ts   # Hook personalizado para ubicación
├── 📁 utils/
│   └── constants.ts     # Constantes de la aplicación
└── 📁 app/
    ├── index.tsx        # Pantalla principal con navegación
    └── dashboard.tsx    # Dashboard post-login
```

## 🔄 Flujo de Autenticación

### **1. Login Process**
```typescript
// El usuario ingresa username y password
const result = await login("mi_usuario", "mi_password");

// Internamente se ejecuta:
1. Solicitar permisos de ubicación
2. Obtener coordenadas GPS actuales
3. Enviar al servidor: { username, password, latitude, longitude, timestamp }
4. Recibir: { bearer_token, expires_in, refresh_interval, user }
5. Configurar refresh automático cada 3 minutos
6. Iniciar monitoreo de ubicación continuo
```

### **2. Token Refresh Automático**
```typescript
// Cada 3 minutos (180000ms) se ejecuta automáticamente:
setInterval(async () => {
  const currentLocation = await getCurrentLocation();
  const response = await refreshToken({
    bearer_token: currentToken,
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    timestamp: Date.now()
  });
  // Actualizar token en el sistema
}, 180000);
```

### **3. Monitoreo de Ubicación**
```typescript
// Tracking continuo cada 30 segundos o 10 metros de movimiento
watchLocation((coordinates) => {
  updateLocation(coordinates);
  // Las coordenadas se envían automáticamente en el próximo refresh
});
```

## 🚀 Uso del Sistema

### **Configuración Inicial**

1. **Variables de Entorno**
```bash
# .env
EXPO_PUBLIC_API_URL=https://api.kch-digital.com
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_DEBUG=true
```

2. **Permisos en app.json**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Esta app necesita acceso a la ubicación para funcionar correctamente."
        }
      ]
    ]
  }
}
```

### **Implementación en Componentes**

```tsx
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/hooks/useLocation';

function MyComponent() {
  const { state, login, logout } = useAuth();
  const location = useLocation();

  // Login
  const handleLogin = async () => {
    const result = await login("username", "password");
    if (result.success) {
      console.log("Login exitoso!");
    }
  };

  // Estado actual
  console.log(state.isAuthenticated);  // true/false
  console.log(state.user);            // Datos del usuario
  console.log(state.lastLocation);    // Última ubicación
  console.log(state.isRefreshActive); // Si el refresh está activo

  return (
    <View>
      {state.isAuthenticated ? (
        <Text>Bienvenido {state.user?.username}</Text>
      ) : (
        <LoginForm onLoginSuccess={handleLogin} />
      )}
    </View>
  );
}
```

## 📡 Endpoints del Backend

El sistema espera que el backend implemente estos endpoints:

### **POST /auth/login**
```json
// Request
{
  "username": "mi_usuario",
  "password": "mi_password",
  "latitude": -34.6037,
  "longitude": -58.3816,
  "accuracy": 5.0,
  "timestamp": 1697123456789
}

// Response
{
  "success": true,
  "bearer_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 10800,
  "refresh_interval": 180000,
  "user": {
    "id": "user123",
    "username": "mi_usuario",
    "name": "Mi Nombre",
    "permissions": ["read", "write"]
  }
}
```

### **POST /auth/refresh**
```json
// Request
{
  "bearer_token": "eyJhbGciOiJIUzI1NiIs...",
  "latitude": -34.6037,
  "longitude": -58.3816,
  "timestamp": 1697123456789
}

// Response
{
  "success": true,
  "bearer_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 10800,
  "refresh_interval": 180000
}
```

### **POST /auth/verify**
```json
// Request
{
  "bearer_token": "eyJhbGciOiJIUzI1NiIs...",
  "latitude": -34.6037,
  "longitude": -58.3816,
  "timestamp": 1697123456789
}

// Response - Igual que /auth/login
```

### **POST /auth/logout**
```json
// Request
{
  "bearer_token": "eyJhbGciOiJIUzI1NiIs...",
  "timestamp": 1697123456789
}

// Response
{
  "success": true,
  "message": "Logout exitoso"
}
```

## 🔧 Configuración Avanzada

### **Personalizar Intervalos**
```typescript
// En utils/constants.ts
export const APP_CONFIG = {
  AUTH: {
    TOKEN_REFRESH_INTERVAL: 180000, // 3 minutos
    LOCATION_UPDATE_INTERVAL: 30000, // 30 segundos
    LOCATION_DISTANCE_THRESHOLD: 50, // 50 metros
  }
};
```

### **Manejo de Errores**
```typescript
const { state } = useAuth();

if (state.isLoading) {
  return <LoadingSpinner />;
}

if (!state.isAuthenticated) {
  return <LoginScreen />;
}

// Usuario autenticado
return <Dashboard />;
```

## 🐛 Debug y Monitoreo

### **Panel de Debug**
```tsx
import AuthDebugPanel from '@/components/debug/AuthDebugPanel';

// Mostrar información completa del sistema
<AuthDebugPanel />
```

### **Logs del Sistema**
```typescript
// El sistema registra automáticamente:
console.log('Token refresh configurado cada 180 segundos');
console.log('Token refrescado exitosamente');
console.log('Error refreshing token:', error);
console.log('Usuario no autenticado, redirigir al login');
```

## 📱 Estados de la Aplicación

### **Estados Posibles**
1. **Cargando inicial** - Verificando token existente
2. **No autenticado** - Mostrar login
3. **Autenticado** - Mostrar dashboard
4. **Refresh activo** - Token actualizándose automáticamente
5. **Error de ubicación** - Permisos denegados o GPS deshabilitado

### **Transiciones de Estado**
```
[Inicio] → [Verificando Token] → [Login/Dashboard]
[Login] → [Obteniendo GPS] → [Autenticando] → [Dashboard]
[Dashboard] → [Refresh cada 3min] → [Dashboard]
[Cualquier Estado] → [Logout] → [Login]
```

## 🔒 Seguridad

### **Medidas Implementadas**
- ✅ Tokens JWT con expiración
- ✅ Refresh automático con ubicación
- ✅ Validación de permisos de ubicación
- ✅ Limpieza de tokens en logout
- ✅ Manejo seguro de errores
- ✅ Timeout en requests HTTP

### **Consideraciones de Producción**
- Configurar HTTPS en el backend
- Implementar rate limiting
- Validar coordenadas en el servidor
- Logs de seguridad para intentos de login
- Monitoreo de tokens expirados

## 🚀 Deployment

### **Comandos de Build**
```bash
# Desarrollo
npx expo start

# Build para producción
npx expo build:android
npx expo build:ios

# Preview
npx expo export
```

### **Variables de Entorno de Producción**
```bash
EXPO_PUBLIC_API_URL=https://api.kch-digital.com
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_DEBUG=false
```

¡El sistema está completamente implementado y listo para usar! 🎉
