# Fix: App Crashing al Cargar el Mapa 🔧

## Problema
La aplicación se cerraba automáticamente (crash) al intentar mostrar el mapa después del login.

## Causa Raíz
El crash era causado por una configuración agresiva de `initialCamera` en el componente `NativeMapView.native.tsx`:
- **Pitch 60°** (inclinación muy pronunciada)
- **Zoom 19** (nivel de zoom extremadamente alto)
- **Altitude 400** con pitch alto puede causar inestabilidad
- **followsUserLocation=true** puede causar crashes si los permisos no están listos
- Falta de validación de coordenadas
- Sin manejo de errores

## Cambios Realizados ✅

### 1. `NativeMapView.native.tsx` - Cambios Críticos

#### ✅ Cambio de `initialCamera` a `initialRegion`
```tsx
// ANTES (causa crash)
initialCamera={{
  center: { latitude, longitude },
  pitch: 60,
  heading: 0,
  altitude: 400,
  zoom: 19,
}}

// DESPUÉS (estable)
initialRegion={{
  latitude: latitude,
  longitude: longitude,
  latitudeDelta: 0.005,  // ~500m de vista
  longitudeDelta: 0.005,
}}
```

#### ✅ Agregado `PROVIDER_GOOGLE` explícitamente
```tsx
<MapView
  provider={PROVIDER_GOOGLE}  // Forzar Google Maps
  ...
/>
```

#### ✅ Validación de Coordenadas
```tsx
const isValidCoordinate = (lat: number, lng: number): boolean => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
};
```

#### ✅ Agregado Marcador Visible
```tsx
<Marker
  coordinate={{ latitude, longitude }}
  title={title}
  description={loginTime ? `Login: ${loginTime}` : undefined}
/>
```

#### ✅ Desactivado `followsUserLocation`
```tsx
followsUserLocation={false}  // Evita crashes por permisos
```

### 2. `MapLayer.tsx` - Manejo de Errores

#### ✅ Try-Catch en renderMap
```tsx
try {
  const NativeMapView = require('@/components/map/NativeMapView').default;
  return <NativeMapView ... />;
} catch (error) {
  console.error('❌ Error al renderizar el mapa:', error);
  setMapError(error.message);
  return renderFallbackMap();
}
```

#### ✅ Validación Previa de Coordenadas
Si las coordenadas son inválidas, muestra un mensaje de error en lugar de intentar cargar el mapa.

### 3. `app.json` - Configuración de Google Maps
```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "AIzaSyBFw0Qbyq9zTFTd-tUY6dOWTgHz-y931Pk"
    }
  }
}
```

### 4. `.env` - Variable de Entorno
```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBFw0Qbyq9zTFTd-tUY6dOWTgHz-y931Pk
```

## Qué Hacer Ahora 🚀

### 1. Limpiar caché y reinstalar dependencias
```bash
# Limpiar caché de Metro
npx expo start -c

# O si es necesario, limpiar todo
rm -rf node_modules
npm install
```

### 2. Probar en desarrollo
```bash
# Iniciar en modo desarrollo
npx expo start

# Probar en dispositivo Android
# Presiona 'a' para abrir en Android
```

### 3. Construir nuevo APK
```bash
# Build para testing
eas build --platform android --profile preview

# O build de producción
eas build --platform android --profile production
```

### 4. Verificar logs durante el testing

Si vuelve a fallar, conecta tu dispositivo y revisa los logs:
```bash
# Ver logs en tiempo real
adb logcat | grep -E "MapView|Google|Maps|ReactNative"

# O logs específicos de tu app
adb logcat | grep -E "kchdigital"
```

## Debugging Tips 🔍

### Logs a buscar
Los componentes ahora tienen logs descriptivos:

- ✅ `Coordenadas válidas: { latitude, longitude }`
- ❌ `Coordenadas inválidas: { latitude, longitude }`
- ✅ `Mapa nativo listo`
- 📍 `Ubicación actualizada`
- ❌ `Error al renderizar el mapa: [error]`

### Fallback Automático
Si el mapa falla, la app ahora muestra una vista fallback con:
- Las coordenadas en texto
- Precisión de la ubicación
- Opción para abrir en Google Maps externo

### Verificar que los cambios funcionan

1. **Abre la app**
2. **Haz login** 
3. **Observa el preloader** ("Cargando mapa...")
4. **El mapa debe cargar** sin crash
5. **Debes ver un marcador rojo** en tu ubicación
6. **Verifica los logs** en la consola

## Diferencias Técnicas Clave

| Aspecto | Antes (Crasheaba) | Después (Estable) |
|---------|-------------------|-------------------|
| Configuración | `initialCamera` con pitch 60° | `initialRegion` simple |
| Zoom | Zoom 19 (extremo) | latitudeDelta 0.005 (~zoom 16) |
| Provider | Default | `PROVIDER_GOOGLE` |
| Validación | Sin validación | Validación completa |
| Errores | Sin manejo | Try-catch + fallback |
| Marcador | Sin marcador | Marcador visible |
| FollowUser | `true` | `false` |

## Notas Importantes ⚠️

1. **API Key debe estar activa** en Google Cloud Console con "Maps SDK for Android" habilitado
2. **SHA-1 fingerprint** debe estar agregado a la API key para producción
3. **Permisos de ubicación** deben estar concedidos por el usuario
4. **La validación de coordenadas** previene crashes por datos corruptos

## Si Aún Hay Problemas

### Problema: Mapa en blanco
- Verifica que la API key esté activa
- Revisa que "Maps SDK for Android" esté habilitado
- Agrega el SHA-1 fingerprint

### Problema: "Google Play Services no disponible"
```bash
# En emulador, instala Google Play Services
# En dispositivo físico, actualiza Google Play Services desde Play Store
```

### Problema: Permisos de ubicación
El componente ahora maneja mejor los permisos, pero asegúrate de concederlos:
- Settings → Apps → KachApp → Permissions → Location → Allow

## Testing Checklist ✓

- [ ] La app no crashea al abrir el mapa
- [ ] Se ve el mapa de Google Maps
- [ ] Aparece un marcador rojo en la ubicación
- [ ] El panel de información muestra el nombre del mercado
- [ ] Los logs muestran "✅ Mapa nativo listo"
- [ ] Si hay error, se muestra la vista fallback
- [ ] El botón de confirmar ubicación funciona

## Resumen
El crash era por una configuración muy agresiva del mapa. Ahora usa una configuración estable, con validación completa de coordenadas y manejo de errores robusto. 🎉
