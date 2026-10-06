import { formatNaira, cartTotal, shipping } from '../src/lib/money';
import { mergeCart, sanitizeCart } from '../src/lib/cart';
import { oauthCode } from '../src/lib/oauth';
import { checkoutSchema } from '../src/lib/validation';
import { config, states } from '../src/lib/config';
describe('kobo money', () => {
  test.each([
    [0, '₦0.00'],
    [1, '₦0.01'],
    [123456789, '₦1,234,567.89'],
    [-1250, '-₦12.50'],
  ])('%s formats without Intl', (value, expected) =>
    expect(formatNaira(value as number)).toBe(expected),
  );
  test('integer line totals and shipping boundary', () => {
    expect(
      cartTotal([
        { price_kobo: 120000, quantity: 3 },
        { price_kobo: 250000, quantity: 2 },
      ]),
    ).toBe(860000);
    expect(shipping(config.freeShippingThresholdKobo - 1)).toBe(250000);
    expect(shipping(config.freeShippingThresholdKobo)).toBe(0);
    expect(shipping(config.freeShippingThresholdKobo + 1)).toBe(0);
  });
});
describe('guest merge', () => {
  test('sums matching rows, caps at stock and 99, removes unavailable products', () => {
    expect(
      mergeCart(
        [
          { product_id: 'a', quantity: 2 },
          { product_id: 'b', quantity: 98 },
        ],
        [
          { product_id: 'a', quantity: 4 },
          { product_id: 'b', quantity: 5 },
          { product_id: 'missing', quantity: 1 },
          { product_id: 'out', quantity: 1 },
        ],
        [
          { id: 'a', stock: 5 },
          { id: 'b', stock: 200 },
          { id: 'out', stock: 0 },
        ],
      ),
    ).toEqual([
      { product_id: 'a', quantity: 5 },
      { product_id: 'b', quantity: 99 },
    ]);
  });
  test('empty cart and duplicate guest rows', () => {
    expect(mergeCart([], [], [])).toEqual([]);
    expect(
      mergeCart(
        [],
        [
          { product_id: 'a', quantity: 2 },
          { product_id: 'a', quantity: 3 },
        ],
        [{ id: 'a', stock: 10 }],
      ),
    ).toEqual([{ product_id: 'a', quantity: 5 }]);
  });
  test('rejects malformed persisted values', () =>
    expect(
      sanitizeCart([
        { product_id: 'a', quantity: 0 },
        { product_id: 'b', quantity: 100 },
        { product_id: 'c', quantity: 1.5 },
        { product_id: 'd', quantity: 2 },
        null,
      ]),
    ).toEqual([{ product_id: 'd', quantity: 2 }]));
});
describe('OAuth callback', () => {
  test('extracts and decodes PKCE code', () =>
    expect(oauthCode('cudicometics://auth/callback?code=hello%2Bworld')).toBe(
      'hello+world',
    ));
  test.each([
    'cudicometics://auth/callback',
    'cudicometics://auth/callback?code=',
    'cudicometics://auth/callback?code=a&code=b',
    'https://evil.example/auth/callback?code=a',
    'cudicosmetics://auth/callback?code=a',
    'cudicometics://auth/other?code=a',
    'invalid',
  ])('rejects %s', (url) => expect(() => oauthCode(url)).toThrow());
  test('returns provider error', () =>
    expect(() =>
      oauthCode(
        'cudicometics://auth/callback?error=access_denied&error_description=Denied',
      ),
    ).toThrow('Denied'));
});
describe('web checkout schema', () => {
  const input = {
    shipping: {
      full_name: 'Ada Okafor',
      phone: '08012345678',
      address1: '12 Rose Street',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
    },
    items: [
      { product_id: '00000000-0000-4000-8000-000000000001', quantity: 1 },
    ],
  };
  test.each([
    '08012345678',
    '08112345678',
    '07012345678',
    '09012345678',
    '09112345678',
    '+2348012345678',
  ])('accepts web-supported phone %s', (phone) =>
    expect(
      checkoutSchema.safeParse({
        ...input,
        shipping: { ...input.shipping, phone },
      }).success,
    ).toBe(true),
  );
  test.each([
    '2348012345678',
    '+18012345678',
    '080123',
    '080123456789',
    '+23408012345678',
    'abc',
  ])('rejects %s', (phone) =>
    expect(
      checkoutSchema.safeParse({
        ...input,
        shipping: { ...input.shipping, phone },
      }).success,
    ).toBe(false),
  );
  test('36 states and FCT, strict items, optional fields', () => {
    expect(states).toHaveLength(37);
    expect(checkoutSchema.parse(input).shipping.address2).toBe('');
    expect(
      checkoutSchema.safeParse({ ...input, user_id: 'forged' }).success,
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({
        ...input,
        items: [{ ...input.items[0], quantity: 100 }],
      }).success,
    ).toBe(false);
  });
});
