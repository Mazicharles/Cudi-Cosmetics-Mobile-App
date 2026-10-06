import { useCallback } from 'react';
import { FlatList, Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/providers/auth';
import { useOrders } from '../../src/lib/queries';
import { formatNaira, lagosDate } from '../../src/lib/money';
import {
  Button,
  Card,
  Guard,
  Loading,
  Message,
  Screen,
  styles,
} from '../../src/components/ui';
export default function Orders() {
  const { user } = useAuth();
  const orders = useOrders(user?.id);
  const { refetch } = orders;
  useFocusEffect(
    useCallback(() => {
      if (user) void refetch();
    }, [user, refetch]),
  );
  return (
    <Guard next="/(tabs)/orders">
      <Screen scroll={false}>
        <FlatList
          data={orders.data || []}
          contentContainerStyle={styles.content}
          keyExtractor={(o) => o.id}
          refreshing={orders.isRefetching}
          onRefresh={() => {
            void orders.refetch();
          }}
          ListHeaderComponent={<Text style={styles.title}>Your orders</Text>}
          ListEmptyComponent={
            orders.isPending ? (
              <Loading />
            ) : orders.isError ? (
              <Message
                text="Orders could not load. Check your connection."
                retry={() => {
                  void orders.refetch();
                }}
              />
            ) : (
              <Message text="Your next beauty ritual starts in the shop. No orders yet." />
            )
          }
          renderItem={({ item }) => (
            <Card style={{ marginTop: 16 }}>
              <Text style={styles.heading}>Order #{item.order_number}</Text>
              <Text
                style={[
                  styles.small,
                  {
                    backgroundColor: '#efddd8',
                    padding: 8,
                    borderRadius: 12,
                    alignSelf: 'flex-start',
                  },
                ]}
              >
                {item.status.toUpperCase()}
              </Text>
              <Text style={styles.text}>{formatNaira(item.total_kobo)}</Text>
              <Text style={styles.small}>
                {lagosDate(item.created_at)} · Lagos time
              </Text>
              <Button
                title="View order"
                secondary
                onPress={() =>
                  router.push({
                    pathname: '/order/[id]',
                    params: { id: item.id },
                  })
                }
              />
            </Card>
          )}
        />
      </Screen>
    </Guard>
  );
}
