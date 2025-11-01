# Configuración de Google Maps para Android

## Problema Resuelto ✅

El mapa fallaba al hacer el build del APK porque faltaba la configuración de Google Maps API para Android.

## Cambios Realizados

### 1. API Key agregada al `.env`
```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBFw0Qbyq9zTFTd-tUY6dOWTgHz-y931Pk
```

### 2. Configuración en `app.json`
Se agregó la configuración de Google Maps en la sección de Android:
```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "AIzaSyBFw0Qbyq9zTFTd-tUY6dOWTgHz-y931Pk"
    }
  }
}
```

## Verificar la API Key en Google Cloud Console

Para que el mapa funcione correctamente en el APK, debes asegurarte de que la API key esté correctamente configurada:

### 1. Ve a Google Cloud Console
https://console.cloud.google.com/

### 2. Habilita las siguientes APIs:
- **Maps SDK for Android** (para react-native-maps en Android)
- **Maps Embed API** (para la versión web)
- **Maps JavaScript API** (opcional, para funciones avanzadas)

### 3. Configura las restricciones de la API Key

**Para Android:**
- Ve a Credentials → Tu API Key
- En "Application restrictions" selecciona "Android apps"
- Agrega el package name: `com.efrenoscar.kchdigitalfrontend`
- Agrega el SHA-1 fingerprint de tu keystore

**Para obtener el SHA-1:**
```bash
# Para debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Para production keystore (si tienes uno)
keytool -list -v -keystore /path/to/your/keystore.jks -alias your-alias-name
```

### 4. Para Web:
- Puedes agregar restricciones de dominio HTTP referrer
- Agrega tu dominio: `*.kachadigitalbcn.com/*` o el dominio donde esté alojada la app web

## Construir el APK

Después de estos cambios, necesitas reconstruir el APK:

```bash
# Limpiar caché
npx expo start -c

# Build APK para preview/testing
eas build --platform android --profile preview

# O build APK para producción
eas build --platform android --profile production
```

## Troubleshooting

### Si el mapa aún no carga:

1. **Verifica los logs de Android:**
   ```bash
   adb logcat | grep -i maps
   ```

2. **Verifica que la API key esté activa:**
   - Ve a Google Cloud Console
   - Asegúrate de que no hay límites de quota excedidos
   - Verifica que las APIs necesarias estén habilitadas

3. **Verifica los permisos en el APK:**
   - Los permisos de ubicación deben estar en el AndroidManifest.xml
   - Expo los agrega automáticamente desde app.json

4. **Si usas una keystore personalizada:**
   - Asegúrate de agregar el SHA-1 fingerprint correcto a la API key

## Notas Importantes

⚠️ **Seguridad:** En producción, considera usar restricciones más estrictas para la API key

⚠️ **Costos:** Google Maps API tiene límites gratuitos, pero puede generar costos si excedes el uso mensual

⚠️ **Testing:** Prueba el mapa tanto en debug como en release builds antes de publicar
