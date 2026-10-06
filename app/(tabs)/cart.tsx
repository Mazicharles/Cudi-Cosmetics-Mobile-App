import { useCallback } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { useProducts } from '../../src/lib/queries';
import { useCart } from '../../src/providers/cart';
import { cartTotal, formatNaira, shipping } from '../../src/lib/money';
import {
  Button,
  Card,
  Loading,
  Message,
  Screen,
  styles,
} from '../../src/components/ui';
export default function CartScreen() {
  const cart = useCart();
  const products = useProducts();
  const { refresh } = cart;
  const { refetch } = products;
  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refetch();
    }, [refresh, refetch]),
  );
  const lines = cart.items.flatMap((item) => {
    const p = products.data?.find((p) => p.id === item.product_id);
    return p ? [{ ...p, quantity: item.quantity }] : [];
  });
  const subtotal = cartTotal(lines);
  const change = (id: string, quantity: number) => {
    void cart
      .setQuantity(id, quantity)
      .catch((e) =>
        Alert.alert(
          'Could not update your bag',
          e instanceof Error ? e.message : 'Please retry.',
        ),
      );
  };
  return (
    <Screen scroll={false}>
      <FlatList
        contentContainerStyle={styles.content}
        data={cart.items}
        keyExtractor={(i) => i.product_id}
        refreshing={cart.busy || products.isRefetching}
        onRefresh={() => {
          void cart.refresh();
          void products.refetch();
        }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 16 }}>
            <Text style={styles.title}>Your beauty bag</Text>
            <Text style={styles.small}>
              {cart.lastSynced
                ? `Last synced ${new Date(cart.lastSynced).toLocaleTimeString()}`
                : 'Guest bag · saved on this phone'}
            </Text>
            {cart.error && (
              <Message
                text={cart.error}
                retry={() => {
                  void cart.refresh();
                }}
              />
            )}
            {products.isError && (
              <Message
                text="Product prices could not load."
                retry={() => {
                  void products.refetch();
                }}
              />
            )}
            {!cart.ready && !cart.error && <Loading />}
          </View>
        }
        ListEmptyComponent={
          cart.ready ? (
            <Card>
              <Text style={styles.text}>
                Your bag is waiting for a little beauty.
              </Text>
              <Button
                title="Explore the shop"
                onPress={() => router.navigate('/')}
              />
            </Card>
          ) : null
        }
        renderItem={({ item }) => {
          const p = products.data?.find((p) => p.id === item.product_id);
          return (
            <Card style={{ marginBottom: 12 }}>
              <View style={styles.row}>
                {p && (
                  <Image
                    source={{ uri: p.image_url }}
                    accessibilityLabel={p.name}
                    style={{ width: 80, height: 80, borderRadius: 16 }}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.heading}>
                    {p?.name || 'Unavailable product'}
                  </Text>
                  <Text style={styles.text}>
                    {p
                      ? formatNaira(p.price_kobo * item.quantity)
                      : 'Remove this item before checkout'}
                  </Text>
                  {p && item.quantity > p.stock && (
                    <Text style={styles.small}>
                      Only {p.stock} available. Please reduce quantity.
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.row}>
                <Button
                  title="−"
                  secondary
                  disabled={cart.busy || !cart.ready}
                  onPress={() => change(item.product_id, item.quantity - 1)}
                />
                <Text style={styles.text}>{item.quantity}</Text>
                <Button
                  title="+"
                  secondary
                  disabled={
                    cart.busy ||
                    !cart.ready ||
                    !p ||
                    item.quantity >= Math.min(99, p.stock)
                  }
                  onPress={() => change(item.product_id, item.quantity + 1)}
                />
                <Button
                  title="Remove"
                  secondary
                  disabled={cart.busy || !cart.ready}
                  onPress={() => change(item.product_id, 0)}
                />
              </View>
            </Card>
          );
        }}
        ListFooterComponent={
          cart.items.length > 0 ? (
            <Card>
              {[
                ['Subtotal', subtotal],
                ['Shipping', shipping(subtotal)],
                ['Total', subtotal + shipping(subtotal)],
              ].map(([label, value]) => (
                <View key={label} style={styles.row}>
                  <Text style={styles.text}>{label}</Text>
                  <Text style={styles.text}>{formatNaira(Number(value))}</Text>
                </View>
              ))}
              <Text style={styles.small}>Free shipping from ₦50,000.00</Text>
              <Button
                title="Checkout"
                disabled={
                  !cart.ready ||
                  cart.busy ||
                  !!cart.error ||
                  products.isError ||
                  products.isPending ||
                  lines.length !== cart.items.length ||
                  lines.some((i) => i.quantity > i.stock)
                }
                onPress={() => router.push('/checkout')}
              />
            </Card>
          ) : null
        }
      />
    </Screen>
  );
}
