import { useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useAuth } from '../src/providers/auth';
import { Button, Card, Message, Screen, styles } from '../src/components/ui';
export function loginDestination(next?: string): Href {
  return (
    next &&
    /^\/(?:checkout|order\/[a-f0-9-]+|\(tabs\)\/(?:account|orders))$/.test(next)
      ? next
      : '/(tabs)/account'
  ) as Href;
}
export default function Login() {
  const auth = useAuth();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Screen>
      <Text style={styles.title}>Cudi Cosmetics</Text>
      <Text style={styles.text}>Beauty, made simple.</Text>
      <Card>
        <Text style={styles.heading}>Welcome to your beauty ritual</Text>
        <Text style={styles.text}>
          Use the same Google account as the website. Your bag and orders come
          with you.
        </Text>
        <Button
          title={busy ? 'Connecting…' : 'Continue with Google'}
          disabled={busy}
          onPress={() => {
            setBusy(true);
            setError('');
            auth
              .signInWithGoogle()
              .then(() => router.replace(loginDestination(next)))
              .catch((e) =>
                setError(
                  e instanceof Error
                    ? e.message
                    : 'Sign-in could not complete. Please try again.',
                ),
              )
              .finally(() => setBusy(false));
          }}
        />
      </Card>
      {(error || auth.error) && <Message text={error || auth.error} />}
      <Button
        title="Continue browsing"
        secondary
        onPress={() => router.replace('/')}
      />
    </Screen>
  );
}
