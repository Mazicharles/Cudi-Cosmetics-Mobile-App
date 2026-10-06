import { Text } from 'react-native';
import { Stack } from 'expo-router';
import { renderRouter, screen, fireEvent, waitFor } from 'expo-router/testing-library';
import Account from '../app/(tabs)/account';
import TabLayout from '../app/(tabs)/_layout';
import Login from '../app/login';
const mockAuth = { user: null, loading: false, error: '', signInWithGoogle: jest.fn(), signOut: jest.fn() };
jest.mock('../src/providers/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('../src/providers/cart', () => ({ useCart: () => ({ items: [] }) }));
function Root() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" />
    </Stack>
  );
}
test.each(['Account', 'Orders'])('signed-out %s tab opens Google login and preserves the return destination', async (tab) => {
  const route = renderRouter({
    _layout: Root,
    '(tabs)/_layout': TabLayout,
    '(tabs)/index': () => <Text>Shop home</Text>,
    '(tabs)/cart': () => <Text>Cart contents</Text>,
    '(tabs)/orders': () => <Text>Orders</Text>,
    '(tabs)/account': Account,
    login: Login,
  }, { initialUrl: '/' });
  fireEvent.press(screen.getByText(tab));
  await waitFor(() => expect(route.getPathname()).toBe('/login'));
  expect(screen.getByText('Continue with Google')).toBeTruthy();
  expect(route.getSearchParams().next).toBe(`/(tabs)/${tab.toLowerCase()}`);
  fireEvent.press(screen.getByText('Continue browsing'));
  await waitFor(() => expect(route.getPathname()).toBe('/'));
  expect(screen.getByText('Shop home')).toBeTruthy();
});
