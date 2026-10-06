import { useEffect, useRef, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../src/providers/auth';
import { useCart } from '../src/providers/cart';
import { useProducts } from '../src/lib/queries';
import { cartTotal, formatNaira, shipping } from '../src/lib/money';
import { states } from '../src/lib/config';
import { checkoutSchema } from '../src/lib/validation';
import {
  openPayment,
  pollOrder,
  startCheckout,
  type PaymentResult,
} from '../src/lib/checkout';
import {
  Button,
  Card,
  Guard,
  Message,
  Screen,
  styles,
} from '../src/components/ui';
export default function Checkout() {
  const { user } = useAuth();
  const cart = useCart();
  const products = useProducts();
  const cache = useQueryClient();
  const [form, setForm] = useState({
    full_name: user?.user_metadata.full_name || '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: 'Lagos',
    postal_code: '',
    country: 'Nigeria',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [step, setStep] = useState('');
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  const lines = cart.items.flatMap((i) => {
    const p = products.data?.find((p) => p.id === i.product_id);
    return p ? [{ ...p, quantity: i.quantity }] : [];
  });
  const subtotal = cartTotal(lines);
  const invalidCart =
    !cart.ready ||
    cart.busy ||
    !!cart.error ||
    !cart.items.length ||
    products.isPending ||
    products.isError ||
    lines.length !== cart.items.length ||
    lines.some((i) => i.quantity > i.stock);
  async function submit() {
    if (!user || invalidCart || busy) return;
    const parsed = checkoutSchema.safeParse({
      shipping: form,
      items: cart.items,
    });
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('\n'),
      );
      return;
    }
    setBusy(true);
    setError('');
    setStep('Preparing your secure payment…');
    let createdId: string | null = null;
    try {
      const payment = await startCheckout(parsed.data);
      createdId = payment.order_id;
      if (!mounted.current) return;
      setOrderId(payment.order_id);
      setStep(
        'Complete payment in the browser, then close it to check your order.',
      );
      await openPayment(payment.authorization_url);
      if (!mounted.current) return;
      setStep('Checking your payment with the shop…');
      controller.current = new AbortController();
      const status = await pollOrder(
        payment.order_id,
        user.id,
        controller.current.signal,
      );
      if (!mounted.current) return;
      setResult(status);
      await cart.refresh();
      await cache.invalidateQueries({ queryKey: ['orders', user.id] });
      if (status === 'success')
        Alert.alert('Payment confirmed', 'Your order has been received.');
    } catch (problem) {
      if (!mounted.current) return;
      if (createdId) {
        setResult('pending');
        setError(
          'Your order was created, but payment could not be checked. View it in Orders before starting another checkout.',
        );
      } else
        setError(
          problem instanceof Error
            ? problem.message
            : 'Checkout could not start. If your connection dropped, check Orders before retrying.',
        );
    } finally {
      if (mounted.current) {
        setBusy(false);
        setStep('');
      }
    }
  }
  return (
    <Guard next="/checkout">
      <Screen>
        <Text style={styles.title}>Your next beauty ritual</Text>
        {orderId ? (
          <Card>
            <Text style={styles.heading}>
              {busy
                ? 'Payment in progress'
                : result === 'success'
                  ? 'Payment confirmed'
                  : result === 'failed'
                    ? 'Order cancelled'
                    : 'Payment pending'}
            </Text>
            <Text style={styles.text}>
              {step ||
                (result === 'success'
                  ? 'Thank you. Your order is in your account.'
                  : result === 'failed'
                    ? 'This order was cancelled or expired. Contact the shop if you were charged.'
                    : 'The shop has not confirmed payment yet. Check your order again later. Do not pay twice.')}
            </Text>
            <Button
              title="View order"
              disabled={busy}
              onPress={() =>
                router.replace({
                  pathname: '/order/[id]',
                  params: { id: orderId, payment: result || 'pending' },
                })
              }
            />
          </Card>
        ) : (
          <>
            <Card>
              <Text style={styles.heading}>Order summary</Text>
              {lines.map((i) => (
                <View key={i.id} style={styles.row}>
                  <Text style={[styles.text, { flex: 1 }]}>
                    {i.name} × {i.quantity}
                  </Text>
                  <Text style={styles.text}>
                    {formatNaira(i.price_kobo * i.quantity)}
                  </Text>
                </View>
              ))}
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
            </Card>
            <Card>
              <Text style={styles.heading}>Where shall we deliver?</Text>
              {(
                [
                  ['full_name', 'Full name'],
                  ['phone', 'Nigerian phone number'],
                  ['address1', 'Address line 1'],
                  ['address2', 'Address line 2 (optional)'],
                  ['city', 'City'],
                  ['postal_code', 'Postal code (optional)'],
                ] as const
              ).map(([field, label]) => (
                <View key={field} style={{ gap: 6 }}>
                  <Text style={styles.small}>{label}</Text>
                  <TextInput
                    accessibilityLabel={label}
                    value={form[field]}
                    onChangeText={(value) =>
                      setForm((f) => ({ ...f, [field]: value }))
                    }
                    keyboardType={field === 'phone' ? 'phone-pad' : 'default'}
                    placeholder={field === 'phone' ? '08012345678' : label}
                    editable={!busy}
                    maxLength={field === 'postal_code' ? 20 : 200}
                    style={styles.input}
                  />
                </View>
              ))}
              <Text style={styles.small}>State</Text>
              <Picker
                accessibilityLabel="Nigerian state"
                selectedValue={form.state}
                enabled={!busy}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, state: value }))
                }
              >
                {states.map((state) => (
                  <Picker.Item key={state} label={state} value={state} />
                ))}
              </Picker>
              <Text style={styles.text}>Country: Nigeria</Text>
            </Card>
            {invalidCart && (
              <Message
                text={
                  cart.error ||
                  'Wait for your bag to sync, or update unavailable items in Cart.'
                }
                retry={() => {
                  void cart.refresh();
                  void products.refetch();
                }}
              />
            )}
            <Text style={styles.small}>
              Paystack securely handles payment in your browser. Stock is
              reserved for 30 minutes. After payment, close the browser to check
              your order; confirmation may take up to 60 seconds.
            </Text>
            <Button
              title={
                busy
                  ? step
                  : `Pay ${formatNaira(subtotal + shipping(subtotal))} with Paystack`
              }
              disabled={busy || invalidCart}
              onPress={() => {
                void submit();
              }}
            />
          </>
        )}
        {error && <Message text={error} />}
      </Screen>
    </Guard>
  );
}
