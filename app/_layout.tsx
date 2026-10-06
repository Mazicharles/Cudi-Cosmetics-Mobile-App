import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display/600SemiBold';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/providers/auth';
import { CartProvider } from '../src/providers/cart';
import { colors, Loading } from '../src/components/ui';
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15000, retry: 1 } },
});
export default function Layout() {
  const [fonts, error] = useFonts({
    Inter_400Regular,
    PlayfairDisplay_600SemiBold,
  });
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) =>
      focusManager.setFocused(state === 'active'),
    );
    return () => sub.remove();
  }, []);
  if (!fonts && !error) return <Loading />;
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                // Avoid Android view re-parenting during native removal transitions.
                animation: Platform.OS === 'android' ? 'none' : 'default',
                headerStyle: { backgroundColor: colors.cream },
                headerTintColor: colors.rose,
                headerTitleStyle: { fontFamily: 'PlayfairDisplay_600SemiBold' },
                contentStyle: { backgroundColor: colors.cream },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="login"
                options={{ title: 'Cudi Cosmetics' }}
              />
              <Stack.Screen
                name="product/[id]"
                options={{ title: 'Your beauty ritual' }}
              />
              <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
              <Stack.Screen
                name="order/[id]"
                options={{ title: 'Your order' }}
              />
              <Stack.Screen
                name="auth/callback"
                options={{ title: 'Signing in' }}
              />
            </Stack>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
