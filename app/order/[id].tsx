import { useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../src/providers/auth';
import { supabase } from '../../src/lib/supabase';
import type { Order } from '../../src/lib/types';
import { formatNaira, lagosDate } from '../../src/lib/money';
import { Card, Guard, Loading, Message, styles } from '../../src/components/ui';
export default function OrderDetail() {
  const { id, payment } = useLocalSearchParams<{
    id: string;
    payment?: string;
  }>();
  const { user } = useAuth();
  const order = useQuery({
    queryKey: ['order', user?.id, id],
    enabled: !!user,
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? 10000 : false,
    queryFn: async (): Promise<Order> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*,order_items(product_name,unit_price_kobo,quantity)')
        .eq('id', id)
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
  const o = order.data;
  return (
    <Guard next={`/order/${id}`}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={order.isRefetching}
            onRefresh={() => {
              void order.refetch();
            }}
          />
        }
      >
        {order.isPending ? (
          <Loading />
        ) : order.isError || !o ? (
          <Message
            text="This order could not load."
            retry={() => {
              void order.refetch();
            }}
          />
        ) : (
          <>
            <Text style={styles.title}>Order #{o.order_number}</Text>
            <Card>
              <Text style={styles.heading}>{o.status.toUpperCase()}</Text>
              <Text style={styles.small}>
                {lagosDate(o.created_at)} · Lagos time
              </Text>
              {payment === 'pending' && o.status === 'pending' && (
                <Text style={styles.text}>
                  Payment is still being verified. Your order stays here; pull
                  to refresh later.
                </Text>
              )}
              {o.status === 'cancelled' && (
                <Text style={styles.text}>
                  This order was cancelled or expired. Contact the shop if you
                  were charged.
                </Text>
              )}
            </Card>
            <Card>
              {o.order_items.map((i, index) => (
                <View key={index} style={styles.row}>
                  <Text style={[styles.text, { flex: 1 }]}>
                    {i.product_name} × {i.quantity}
                  </Text>
                  <Text style={styles.text}>
                    {formatNaira(i.unit_price_kobo * i.quantity)}
                  </Text>
                </View>
              ))}
              {[
                ['Subtotal', o.subtotal_kobo],
                ['Shipping', o.shipping_kobo],
                ['Total', o.total_kobo],
              ].map(([label, value]) => (
                <View key={label} style={styles.row}>
                  <Text style={styles.text}>{label}</Text>
                  <Text style={styles.text}>{formatNaira(Number(value))}</Text>
                </View>
              ))}
            </Card>
            <Card>
              <Text style={styles.heading}>Delivery address</Text>
              <Text style={styles.text}>
                {[
                  o.shipping_name,
                  o.shipping_phone,
                  o.shipping_address1,
                  o.shipping_address2,
                  `${o.shipping_city}, ${o.shipping_state}`,
                  o.shipping_postal_code,
                  o.shipping_country,
                ]
                  .filter(Boolean)
                  .join('\n')}
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </Guard>
  );
}
