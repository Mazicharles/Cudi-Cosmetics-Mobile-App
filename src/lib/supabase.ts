import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
export const configured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);
export const apiBase = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(
  /\/$/,
  '',
);
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://unconfigured.supabase.co',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'unconfigured',
  {
    auth: {
      storage: AsyncStorage,
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
