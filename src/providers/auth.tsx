import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { configured, supabase } from '../lib/supabase';
import { redirectUri } from '../lib/oauth';
import { exchangeRedirect, setBrowserSignInActive } from '../lib/auth-flow';
WebBrowser.maybeCompleteAuthSession();
type Auth = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (alive) {
          setSession(data.session);
          setLoading(false);
          if (error)
            setError('Your session could not load. Please sign in again.');
        }
      })
      .catch(() => {
        if (alive) {
          setLoading(false);
          setError('Your session could not load. Please try again.');
        }
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    const refresh = (state: string) =>
      state === 'active'
        ? supabase.auth.startAutoRefresh()
        : supabase.auth.stopAutoRefresh();
    refresh(AppState.currentState);
    const listener = AppState.addEventListener('change', refresh);
    return () => {
      alive = false;
      subscription.unsubscribe();
      listener.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);
  async function signInWithGoogle() {
    if (!configured)
      throw new Error('Please configure the Supabase environment variables.');
    setError('');
    const redirectTo = makeRedirectUri({
      scheme: 'cudicometics',
      path: 'auth/callback',
      native: redirectUri,
    });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) throw new Error('Sign-in is unavailable. Please try again.');
    setBrowserSignInActive(true);
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
      );
      if (result.type !== 'success')
        throw new Error('Sign-in was cancelled. You can try again.');
      await exchangeRedirect(result.url);
      const { data: current } = await supabase.auth.getSession();
      setSession(current.session);
    } finally {
      setBrowserSignInActive(false);
    }
  }
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
  }
  return (
    <Context.Provider
      value={{
        session,
        user: session?.user || null,
        loading,
        error,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
