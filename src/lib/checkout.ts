import { z } from 'zod';
import * as WebBrowser from 'expo-web-browser';
import { apiBase, supabase } from './supabase';
import { checkoutSchema } from './validation';
const paymentResponse = z.object({
  authorization_url: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === 'https:' && url.hostname === 'checkout.paystack.com'
      );
    }),
  order_id: z.string().uuid(),
});
export type PaymentResult = 'success' | 'pending' | 'failed';
export async function startCheckout(input: z.infer<typeof checkoutSchema>) {
  if (!apiBase.startsWith('https://'))
    throw new Error(
      'Configure the deployed HTTPS web API URL before checkout.',
    );
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session)
    throw new Error('Please sign in again before checkout.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${apiBase}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify(checkoutSchema.parse(input)),
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        typeof result.error === 'string'
          ? result.error
          : 'Checkout could not start. Please try again.',
      );
    return paymentResponse.parse(result);
  } catch (problem) {
    if (problem instanceof z.ZodError)
      throw new Error(
        'The shop returned an unexpected response. Check Orders before retrying.',
      );
    if (
      problem instanceof TypeError ||
      (problem instanceof Error && problem.name === 'AbortError')
    )
      throw new Error(
        'Checkout could not connect to the shop. Check Orders before retrying, in case your order was already created.',
      );
    throw problem;
  } finally {
    clearTimeout(timer);
  }
}
export async function openPayment(url: string) {
  // Keep the server's existing web callback. On Android users close/back out after payment.
  return WebBrowser.openAuthSessionAsync(url, `${apiBase}/checkout/callback`);
}
export async function pollOrder(
  id: string,
  userId: string,
  signal: AbortSignal,
): Promise<PaymentResult> {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline && !signal.aborted) {
    const request = new AbortController();
    const cancel = () => request.abort();
    signal.addEventListener('abort', cancel);
    const timer = setTimeout(
      () => request.abort(),
      Math.min(8000, Math.max(1, deadline - Date.now())),
    );
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('status')
        .eq('id', id)
        .eq('user_id', userId)
        .abortSignal(request.signal)
        .single();
      if (!error && data) {
        if (['paid', 'shipped', 'delivered'].includes(data.status))
          return 'success';
        if (data.status === 'cancelled') return 'failed';
      }
    } catch {
      // A transient network failure cannot prove payment failure. Continue until the deadline.
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
    }
    if (!signal.aborted && Date.now() < deadline)
      await new Promise<void>((resolve) => {
        const complete = () => {
          clearTimeout(wait);
          signal.removeEventListener('abort', complete);
          resolve();
        };
        const wait = setTimeout(
          complete,
          Math.min(2000, deadline - Date.now()),
        );
        signal.addEventListener('abort', complete, { once: true });
      });
  }
  return 'pending';
}
