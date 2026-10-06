import { supabase } from './supabase';
import { oauthCode } from './oauth';
let pending: { code: string; promise: Promise<void> } | null = null;
export let browserSignInActive = false;
export function setBrowserSignInActive(active: boolean) {
  browserSignInActive = active;
}
/** Both native deep-link and browser completion can deliver the same one-use code. */
export function exchangeRedirect(url: string) {
  const code = oauthCode(url);
  if (pending?.code === code) return pending.promise;
  const promise = supabase.auth
    .exchangeCodeForSession(code)
    .then(({ error }) => {
      if (error) throw error;
    });
  pending = { code, promise };
  return promise;
}
