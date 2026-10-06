import { Tabs, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCart } from '../../src/providers/cart';
import { colors } from '../../src/components/ui';
import { useAuth } from '../../src/providers/auth';
export default function TabLayout() {
  const { user, loading } = useAuth();
  const cart = useCart();
  const quantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <Tabs
      screenOptions={{
        headerTitle: 'Cudi Cosmetics',
        headerStyle: { backgroundColor: colors.cream },
        headerTintColor: colors.rose,
        headerTitleStyle: {
          fontFamily: 'PlayfairDisplay_600SemiBold',
          fontSize: 25,
        },
        tabBarActiveTintColor: colors.rose,
        tabBarStyle: { backgroundColor: colors.cream },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flower-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarBadge: quantity || undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bag-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        listeners={{
          tabPress: (event) => {
            if (!user) {
              event.preventDefault();
              if (!loading) router.push({ pathname: '/login', params: { next: '/(tabs)/orders' } });
            }
          },
        }}
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        listeners={{
          tabPress: (event) => {
            if (!user) {
              event.preventDefault();
              if (!loading) router.push({ pathname: '/login', params: { next: '/(tabs)/account' } });
            }
          },
        }}
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
