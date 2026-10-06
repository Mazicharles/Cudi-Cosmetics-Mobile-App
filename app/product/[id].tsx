import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useProducts } from '../../src/lib/queries';
import { useCart } from '../../src/providers/cart';
import { formatNaira } from '../../src/lib/money';
import {
  Button,
  Loading,
  Message,
  Screen,
  styles,
} from '../../src/components/ui';
export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const products = useProducts();
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const product = products.data?.find((p) => p.id === id);
  if (products.isPending) return <Loading />;
  if (products.isError)
    return (
      <Screen>
        <Message
          text="This product could not load."
          retry={() => {
            void products.refetch();
          }}
        />
      </Screen>
    );
  if (!product)
    return (
      <Screen>
        <Message text="This product is no longer available." />
      </Screen>
    );
  return (
    <Screen>
      <Image
        source={{ uri: product.image_url }}
        accessibilityLabel={product.name}
        style={{ width: '100%', aspectRatio: 1, borderRadius: 24 }}
      />
      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.text}>{product.short_description}</Text>
      <Text style={styles.heading}>{formatNaira(product.price_kobo)}</Text>
      <Text style={styles.small}>
        {product.size_label} ·{' '}
        {product.stock ? `${product.stock} in stock` : 'Out of stock'}
      </Text>
      <View style={styles.row}>
        <Button
          title="−"
          onPress={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={quantity <= 1}
          secondary
        />
        <Text accessibilityLabel={`Quantity ${quantity}`} style={styles.text}>
          {quantity}
        </Text>
        <Button
          title="+"
          onPress={() => setQuantity((q) => Math.min(99, product.stock, q + 1))}
          disabled={quantity >= Math.min(99, product.stock)}
          secondary
        />
      </View>
      <Button
        title={busy ? 'Adding…' : 'Add to cart'}
        disabled={busy || !cart.ready || !product.stock}
        onPress={() => {
          setBusy(true);
          cart
            .add(product.id, quantity)
            .then(() => Alert.alert('Added to your bag', product.name))
            .catch((e) =>
              Alert.alert(
                'Could not add to cart',
                e instanceof Error ? e.message : 'Please try again.',
              ),
            )
            .finally(() => setBusy(false));
        }}
      />
      {cart.error && (
        <Message
          text={cart.error}
          retry={() => {
            void cart.refresh();
          }}
        />
      )}
      {[
        ['Description', product.description],
        ['Ingredients', product.ingredients],
        ['How to use', product.how_to_use],
      ].map(([label, text]) => (
        <View key={label} style={{ gap: 8 }}>
          <Text style={styles.heading}>{label}</Text>
          <Text style={styles.text}>{text}</Text>
        </View>
      ))}
    </Screen>
  );
}
