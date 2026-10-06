import type { CartItem, Product } from './types';
export function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is CartItem =>
        item &&
        typeof item.product_id === 'string' &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= 99,
    )
    .slice(0, 100);
}
export function mergeCart(
  existing: CartItem[],
  guest: CartItem[],
  products: Pick<Product, 'id' | 'stock'>[],
): CartItem[] {
  const merged = new Map(
    existing.map((item) => [item.product_id, item.quantity]),
  );
  for (const item of guest)
    merged.set(
      item.product_id,
      (merged.get(item.product_id) || 0) + item.quantity,
    );
  return Array.from(merged, ([product_id, quantity]) => ({
    product_id,
    quantity: Math.min(
      99,
      quantity,
      products.find((p) => p.id === product_id)?.stock || 0,
    ),
  })).filter((item) => item.quantity > 0);
}
