import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { fetchProducts } from '../lib/queries';
import { mergeCart, sanitizeCart } from '../lib/cart';
import type { CartItem } from '../lib/types';
import { useAuth } from './auth';
const guestKey = 'cudi-guest-cart';
type Cart = {
  items: CartItem[];
  ready: boolean;
  busy: boolean;
  error: string;
  lastSynced: number | null;
  refresh: () => Promise<void>;
  add: (id: string, quantity: number) => Promise<void>;
  setQuantity: (id: string, quantity: number) => Promise<void>;
};
const Context = createContext<Cart | null>(null);
async function readGuest() {
  const raw = await AsyncStorage.getItem(guestKey);
  try {
    return sanitizeCart(JSON.parse(raw || '[]'));
  } catch {
    return [];
  }
}
async function readRemote(uid: string): Promise<CartItem[]> {
  const { data, error } = await supabase
    .from('cart_items')
    .select('product_id,quantity')
    .eq('user_id', uid);
  if (error) throw error;
  return data || [];
}
export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const uid = user?.id || null;
  const cache = useQueryClient();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(
    undefined,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const current = useRef<CartItem[]>([]);
  const identity = useRef(uid);
  const generation = useRef(0);
  useLayoutEffect(() => {
    identity.current = uid;
    generation.current++;
  }, [uid, loading]);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const mergedFor = useRef<string | null>(null);
  const commit = useCallback((next: CartItem[]) => {
    current.current = next;
    setItems(next);
  }, []);
  const enqueue = useCallback((work: () => Promise<void>) => {
    const next = queue.current.then(work);
    queue.current = next.catch(() => {});
    return next;
  }, []);
  const refresh = useCallback(
    () =>
      enqueue(async () => {
        const token = generation.current;
        const target = identity.current;
        setBusy(true);
        try {
          let next: CartItem[];
          if (target) {
            next = await readRemote(target);
            if (mergedFor.current !== target) {
              const guest = await readGuest();
              if (guest.length) {
                const products = await fetchProducts();
                const merged = mergeCart(next, guest, products);
                // Touch only guest-product rows; preserve unrelated server rows.
                const guestIds = new Set(guest.map((i) => i.product_id));
                const changed = merged.filter((i) =>
                  guestIds.has(i.product_id),
                );
                if (changed.length) {
                  const result = await supabase.from('cart_items').upsert(
                    changed.map((i) => ({ ...i, user_id: target })),
                    { onConflict: 'user_id,product_id' },
                  );
                  if (result.error) throw result.error;
                }
                const unavailable = next.filter(
                  (i) =>
                    guestIds.has(i.product_id) &&
                    !merged.some((m) => m.product_id === i.product_id),
                );
                if (unavailable.length) {
                  const result = await supabase
                    .from('cart_items')
                    .delete()
                    .eq('user_id', target)
                    .in(
                      'product_id',
                      unavailable.map((i) => i.product_id),
                    );
                  if (result.error) throw result.error;
                }
                // Clear only after all writes succeed. A failed merge remains retryable.
                await AsyncStorage.removeItem(guestKey);
                next = await readRemote(target);
              }
              mergedFor.current = target;
            }
          } else {
            mergedFor.current = null;
            next = await readGuest();
          }
          if (token === generation.current && target === identity.current) {
            commit(next);
            setError('');
            setReady(true);
            setLoadedFor(target);
            setLastSynced(target ? Date.now() : null);
            cache.setQueryData(['cart', target], next);
          }
        } catch {
          if (token === generation.current)
            setError(
              'Your bag could not sync. Check your connection and tap Retry.',
            );
        } finally {
          if (token === generation.current) setBusy(false);
        }
      }),
    [cache, commit, enqueue],
  );
  useEffect(() => {
    const token = generation.current;
    // Session changes synchronize external persisted data asynchronously.
    queueMicrotask(() => {
      if (token !== generation.current) return;
      setReady(false);
      setLastSynced(null);
      setError('');
      commit([]);
      if (!loading) void refresh();
    });
  }, [uid, loading, refresh, commit]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !loading) void refresh();
    });
    return () => listener.remove();
  }, [loading, refresh]);
  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`cart:${uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `user_id=eq.${uid}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [uid, refresh]);
  const update = (id: string, quantity: number, adding: boolean) => {
    const target = identity.current;
    const token = generation.current;
    return enqueue(async () => {
      if (
        !ready ||
        loadedFor !== target ||
        token !== generation.current ||
        target !== identity.current
      )
        throw new Error('Please wait for your bag to sync.');
      setBusy(true);
      let previous = current.current;
      try {
        const products = await cache.fetchQuery({
          queryKey: ['products'],
          queryFn: fetchProducts,
          staleTime: 0,
        });
        const stock = products.find((p) => p.id === id)?.stock || 0;
        // Read before an add so an existing web row is incremented rather than overwritten.
        const base = target ? await readRemote(target) : current.current;
        previous = base;
        const existing = base.find((i) => i.product_id === id)?.quantity || 0;
        const q = Math.max(
          0,
          Math.min(
            99,
            stock,
            Math.floor(adding ? existing + quantity : quantity),
          ),
        );
        if (adding && !q) throw new Error('This product is out of stock.');
        const next = [
          ...base.filter((i) => i.product_id !== id),
          ...(q ? [{ product_id: id, quantity: q }] : []),
        ];
        if (token !== generation.current || target !== identity.current) return;
        commit(next); // Optimistic while persistence is in flight; serialized operations make rollback safe.
        if (target) {
          const result = q
            ? await supabase
                .from('cart_items')
                .upsert(
                  { user_id: target, product_id: id, quantity: q },
                  { onConflict: 'user_id,product_id' },
                )
            : await supabase
                .from('cart_items')
                .delete()
                .eq('user_id', target)
                .eq('product_id', id);
          if (result.error) throw result.error;
        } else await AsyncStorage.setItem(guestKey, JSON.stringify(next));
        if (token === generation.current) {
          setError('');
          setLastSynced(target ? Date.now() : null);
          cache.setQueryData(['cart', target], next);
        }
      } catch (problem) {
        if (token === generation.current) {
          commit(previous);
          setError(
            'Your change could not be saved. Check your connection and try again.',
          );
        }
        throw problem;
      } finally {
        if (token === generation.current) setBusy(false);
      }
    });
  };
  return (
    <Context.Provider
      value={{
        items: loadedFor === uid ? items : [],
        ready: ready && loadedFor === uid,
        busy,
        error,
        lastSynced: loadedFor === uid ? lastSynced : null,
        refresh,
        add: (id, q) => update(id, q, true),
        setQuantity: (id, q) => update(id, q, false),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useCart() {
  const value = useContext(Context);
  if (!value) throw new Error('CartProvider missing');
  return value;
}
