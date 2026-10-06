import { openPayment, pollOrder, startCheckout } from '../src/lib/checkout';
const mockGetSession = jest.fn();
const mockFrom = jest.fn();
const mockBrowser = jest.fn();
jest.mock('../src/lib/supabase', () => ({
  apiBase: 'https://shop.example',
  supabase: {
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: (...args: unknown[]) => mockBrowser(...args),
}));
const id = '00000000-0000-4000-8000-000000000001';
const input = {
  shipping: {
    full_name: 'Ada Okafor',
    phone: '08012345678',
    address1: '12 Rose Street',
    address2: '',
    city: 'Lagos',
    state: 'Lagos' as const,
    postal_code: '',
    country: 'Nigeria' as const,
  },
  items: [{ product_id: id, quantity: 1 }],
};
beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'verified-token' } },
    error: null,
  });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});
test('checkout sends only validated data and Bearer token to the existing API', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({
      order_id: id,
      authorization_url: 'https://checkout.paystack.com/test',
    }),
  } as Response);
  expect((await startCheckout(input)).order_id).toBe(id);
  expect(fetchMock).toHaveBeenCalledWith(
    'https://shop.example/api/checkout',
    expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer verified-token',
      },
      body: JSON.stringify(input),
    }),
  );
});
test('rejects non-Paystack payment redirects', async () => {
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({
      order_id: id,
      authorization_url: 'https://evil.example/pay',
    }),
  } as Response);
  await expect(startCheckout(input)).rejects.toThrow();
});
test('unauthenticated checkout never posts', async () => {
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  const fetchMock = jest.spyOn(globalThis, 'fetch');
  await expect(startCheckout(input)).rejects.toThrow('sign in');
  expect(fetchMock).not.toHaveBeenCalled();
});
test('hosted payment keeps existing server callback', async () => {
  mockBrowser.mockResolvedValue({ type: 'dismiss' });
  await openPayment('https://checkout.paystack.com/test');
  expect(mockBrowser).toHaveBeenCalledWith(
    'https://checkout.paystack.com/test',
    'https://shop.example/checkout/callback',
  );
});
function statuses(values: string[]) {
  const eq = jest.fn();
  const builder = {
    select: jest.fn(),
    eq,
    single: jest.fn(),
    abortSignal: jest.fn(),
  };
  builder.select.mockReturnValue(builder);
  eq.mockReturnValue(builder);
  builder.abortSignal.mockReturnValue(builder);
  builder.single.mockImplementation(async () => ({
    data: { status: values.length > 1 ? values.shift() : values[0] },
    error: null,
  }));
  mockFrom.mockReturnValue(builder);
  return builder;
}
test('polls the exact owned order every two seconds until paid', async () => {
  jest.useFakeTimers();
  const builder = statuses(['pending', 'paid']);
  const pending = pollOrder(id, 'user-id', new AbortController().signal);
  await jest.advanceTimersByTimeAsync(2000);
  await expect(pending).resolves.toBe('success');
  expect(builder.eq).toHaveBeenCalledWith('id', id);
  expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-id');
  expect(builder.abortSignal).toHaveBeenCalledTimes(2);
});
test('cancellation is failed and 60-second unconfirmed status stays pending', async () => {
  statuses(['cancelled']);
  await expect(
    pollOrder(id, 'user-id', new AbortController().signal),
  ).resolves.toBe('failed');
  jest.useFakeTimers();
  statuses(['pending']);
  const pending = pollOrder(id, 'user-id', new AbortController().signal);
  await jest.advanceTimersByTimeAsync(60000);
  await expect(pending).resolves.toBe('pending');
});
