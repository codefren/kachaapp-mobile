#!/bin/bash

echo "🧹 Limpiando toda la caché de Expo y React Native..."

# Detener cualquier proceso de Expo/Metro que esté corriendo
echo "📱 Deteniendo procesos de Expo/Metro..."
pkill -f "expo" || true
pkill -f "metro" || true

# Limpiar caché de npm
echo "📦 Limpiando caché de npm..."
npm cache clean --force

# Limpiar caché de Yarn (si existe)
if command -v yarn &> /dev/null; then
    echo "🧶 Limpiando caché de Yarn..."
    yarn cache clean
fi

# Limpiar caché de Expo
echo "🚀 Limpiando caché de Expo..."
npx expo install --fix
npx expo r -c

# Limpiar caché de Metro
echo "🚇 Limpiando caché de Metro..."
npx react-native start --reset-cache || true

# Limpiar directorios de caché temporal
echo "🗂️ Limpiando directorios temporales..."
rm -rf node_modules/.cache
rm -rf .expo
rm -rf .metro-cache
rm -rf /tmp/metro-*
rm -rf /tmp/react-*
rm -rf ~/.expo/cache

# Limpiar caché del sistema (macOS/Linux)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Limpiando caché de macOS..."
    rm -rf ~/Library/Caches/Expo
    rm -rf ~/Library/Caches/com.facebook.react.devsupport.DevServerHelper
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Limpiando caché de Linux..."
    rm -rf ~/.cache/expo
    rm -rf ~/.cache/metro
fi

# Reinstalar node_modules
echo "📚 Reinstalando dependencias..."
rm -rf node_modules
rm -f package-lock.json
rm -f yarn.lock
npm install

echo ""
echo "✅ ¡Caché completamente limpiada!"
echo ""
echo "🚀 Para iniciar el proyecto limpio, ejecuta:"
echo "   npx expo start --clear"
echo ""
