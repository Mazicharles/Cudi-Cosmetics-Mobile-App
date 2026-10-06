import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { browserSignInActive, exchangeRedirect } from '../../src/lib/auth-flow';
import { useAuth } from '../../src/providers/auth';
import { Loading, Message, Screen } from '../../src/components/ui';
// Fallback for OS-delivered deep links. The normal browser-session path exchanges in AuthProvider.
export default function Callback() {
  const { user } = useAuth();
  const url = Linking.useURL();
  const [error, setError] = useState('');
  useEffect(() => {
    if (browserSignInActive) return; // Login owns the return destination during a live browser session.
    if (user) {
      router.replace('/(tabs)/account');
      return;
    }
    if (!url) return;
    // Let the active openAuthSessionAsync handler exchange first; avoid consuming a code twice.
    const timer = setTimeout(() => {
      void supabase.auth
        .getSession()
        .then(async ({ data }) => {
          if (data.session) {
            router.replace('/(tabs)/account');
            return;
          }
          await exchangeRedirect(url);
          router.replace('/(tabs)/account');
        })
        .catch(() =>
          setError('Sign-in could not finish. Return to login and try again.'),
        );
    }, 1500);
    return () => clearTimeout(timer);
  }, [url, user]);
  return (
    <Screen>
      {error ? (
        <Message text={error} retry={() => router.replace('/login')} />
      ) : (
        <Loading />
      )}
    </Screen>
  );
}
