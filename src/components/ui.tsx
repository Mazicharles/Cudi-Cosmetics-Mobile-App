import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import type { ReactNode } from 'react';
import { Redirect, type Href } from 'expo-router';
import { useAuth } from '../providers/auth';
export const colors = {
  cream: '#faf6f0',
  rose: '#71384d',
  blush: '#efddd8',
  text: '#33242a',
  muted: '#6c5961',
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  title: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 30,
    color: colors.rose,
  },
  heading: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 22,
    color: colors.text,
  },
  text: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 23,
    color: colors.text,
  },
  small: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.muted,
    lineHeight: 19,
  },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 20, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbb7bd',
    borderRadius: 12,
    minHeight: 48,
    padding: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
  },
});
export function Button({
  title,
  onPress,
  disabled,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        minWidth: 48,
        borderRadius: 14,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: secondary ? colors.blush : colors.rose,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      <Text
        style={[
          styles.text,
          { color: secondary ? colors.rose : '#fff', textAlign: 'center' },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Screen({
  children,
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  return scroll ? (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View collapsable={false} style={styles.screen}>{children}</View>
  );
}
export function Message({ text, retry }: { text: string; retry?: () => void }) {
  return (
    <View style={styles.card}>
      <Text accessibilityRole="alert" style={styles.text}>
        {text}
      </Text>
      {retry && <Button title="Retry" onPress={retry} secondary />}
    </View>
  );
}
export function Loading() {
  return (
    <View style={styles.content}>
      <ActivityIndicator color={colors.rose} accessibilityLabel="Loading" />
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            height: 110,
            borderRadius: 20,
            backgroundColor: colors.blush,
          }}
        />
      ))}
    </View>
  );
}
export function Guard({
  next,
  children,
}: {
  next: string;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user)
    return <Redirect href={{ pathname: '/login', params: { next } } as Href} />;
  return children;
}
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}
