import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Picker } from '@react-native-picker/picker';
import { useCategories, useProducts } from '../../src/lib/queries';
import { formatNaira } from '../../src/lib/money';
import {
  colors,
  Loading,
  Message,
  Screen,
  styles,
} from '../../src/components/ui';
export default function Shop() {
  const products = useProducts();
  const categories = useCategories();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const visible = useMemo(
    () =>
      (products.data || [])
        .filter(
          (p) =>
            (!category || p.category_id === category) &&
            p.name.toLowerCase().includes(search.trim().toLowerCase()),
        )
        .sort((a, b) =>
          sort === 'low'
            ? a.price_kobo - b.price_kobo
            : sort === 'high'
              ? b.price_kobo - a.price_kobo
              : Date.parse(b.created_at) - Date.parse(a.created_at),
        ),
    [products.data, category, search, sort],
  );
  return (
    <Screen scroll={false}>
      <FlatList
        data={visible}
        numColumns={2}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.content}
        columnWrapperStyle={{ gap: 12 }}
        refreshing={products.isRefetching || categories.isRefetching}
        onRefresh={() => {
          void products.refetch();
          void categories.refetch();
        }}
        ListHeaderComponent={
          <View style={{ gap: 14, paddingBottom: 20 }}>
            <Text style={styles.title}>Beauty, made simple.</Text>
            <Text style={styles.text}>
              Essentials for your everyday rituals.
            </Text>
            <TextInput
              accessibilityLabel="Search products by name"
              placeholder="Find your next essential"
              value={search}
              onChangeText={setSearch}
              style={styles.input}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.row}>
                {[{ id: '', name: 'All' }, ...(categories.data || [])].map(
                  (c) => (
                    <Pressable
                      key={c.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Category ${c.name}`}
                      accessibilityState={{ selected: category === c.id }}
                      onPress={() => setCategory(c.id)}
                      style={{
                        minHeight: 44,
                        padding: 12,
                        borderRadius: 24,
                        backgroundColor:
                          category === c.id ? colors.rose : colors.blush,
                      }}
                    >
                      <Text
                        style={[
                          styles.small,
                          { color: category === c.id ? '#fff' : colors.rose },
                        ]}
                      >
                        {c.name}
                      </Text>
                    </Pressable>
                  ),
                )}
              </View>
            </ScrollView>
            {categories.isError && (
              <Message
                text="Categories could not load."
                retry={() => {
                  void categories.refetch();
                }}
              />
            )}
            <View style={styles.input}>
              <Picker
                accessibilityLabel="Sort products"
                selectedValue={sort}
                onValueChange={setSort}
              >
                <Picker.Item label="Newest first" value="newest" />
                <Picker.Item label="Price: low to high" value="low" />
                <Picker.Item label="Price: high to low" value="high" />
              </Picker>
            </View>
          </View>
        }
        ListEmptyComponent={
          products.isPending ? (
            <Loading />
          ) : products.isError ? (
            <Message
              text={
                products.error.message ||
                'Products could not load. Check your connection.'
              }
              retry={() => {
                void products.refetch();
              }}
            />
          ) : (
            <Message text="No products found. Try another search or category." />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${item.name}, ${formatNaira(item.price_kobo)}`}
            onPress={() =>
              router.push({
                pathname: '/product/[id]',
                params: { id: item.id },
              })
            }
            style={{
              flex: 1,
              maxWidth: '50%',
              marginBottom: 16,
              backgroundColor: '#fff',
              borderRadius: 20,
              overflow: 'hidden',
            }}
          >
            <Image
              source={{ uri: item.image_url }}
              accessibilityLabel={item.name}
              style={{ width: '100%', aspectRatio: 1 }}
              contentFit="cover"
              transition={200}
            />
            <View style={{ padding: 12, gap: 6 }}>
              <Text style={styles.heading}>{item.name}</Text>
              <Text style={styles.small}>{item.size_label}</Text>
              <Text style={styles.text}>{formatNaira(item.price_kobo)}</Text>
              {!item.stock && <Text style={styles.small}>Out of stock</Text>}
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}
