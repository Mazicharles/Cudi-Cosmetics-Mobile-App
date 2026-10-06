import { config } from './config';
export function formatNaira(kobo: number) {
  const absolute = Math.abs(Math.round(kobo));
  const whole = Math.floor(absolute / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${kobo < 0 ? '-' : ''}₦${whole}.${(absolute % 100).toString().padStart(2, '0')}`;
}
export const shipping = (subtotal: number) =>
  subtotal >= config.freeShippingThresholdKobo ? 0 : config.shippingKobo;
export const cartTotal = (items: { price_kobo: number; quantity: number }[]) =>
  items.reduce((sum, item) => sum + item.price_kobo * item.quantity, 0);
export const lagosDate = (value: string) =>
  new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  }).format(new Date(value));
