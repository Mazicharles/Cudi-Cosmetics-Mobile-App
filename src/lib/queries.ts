import { useQuery } from '@tanstack/react-query';
import { configured, supabase } from './supabase';
import type { Product, Order } from './types';
export async function fetchProducts(): Promise<Product[]> {
  if (!configured)
    throw new Error(
      'Add your Supabase public values to mobile/.env, then restart Expo.',
    );
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
export const useProducts = () =>
  useQuery({ queryKey: ['products'], queryFn: fetchProducts });
export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      if (!configured) throw new Error('Supabase is not configured.');
      const { data, error } = await supabase
        .from('categories')
        .select('id,name,slug')
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string; slug: string }[];
    },
  });
export function useOrders(userId?: string) {
  return useQuery({
    queryKey: ['orders', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*,order_items(product_name,unit_price_kobo,quantity)')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}
