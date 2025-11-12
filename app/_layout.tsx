import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/context/AuthContext';
import NavigationPersistence from '@/components/navigation/NavigationPersistence';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Log para detectar si RootLayout se remonta
  useEffect(() => {
    console.log('[LAYOUT] 🔶 RootLayout montado');
    return () => {
      console.log('[LAYOUT] 🔴 RootLayout desmontado');
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          {/* Persistencia de navegación */}
          <NavigationPersistence />
          
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: true }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="menu" options={{ headerShown: false }} />
            <Stack.Screen name="dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="providers" options={{ headerShown: false }} />
            <Stack.Screen name="reception" options={{ headerShown: false }} />
            <Stack.Screen name="reception-products" options={{ headerShown: false }} />
            <Stack.Screen name="reception-invoice" options={{ headerShown: false }} />
            <Stack.Screen name="products" options={{ headerShown: false }} />
            <Stack.Screen name="purchase-order-detail" options={{ headerShown: false }} />
            <Stack.Screen name="purchase-order/[po_units_id]" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
