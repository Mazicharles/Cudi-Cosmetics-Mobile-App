export const redirectUri = 'cudicometics://auth/callback';
export function oauthCode(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== 'cudicometics:' ||
    url.hostname !== 'auth' ||
    url.pathname !== '/callback'
  )
    throw new Error('Unexpected sign-in redirect.');
  if (
    url.searchParams.has('error') ||
    url.searchParams.has('error_description')
  )
    throw new Error(
      url.searchParams.get('error_description') ||
        url.searchParams.get('error') ||
        'Sign-in failed.',
    );
  const code = url.searchParams.get('code');
  if (!code?.trim() || url.searchParams.getAll('code').length !== 1)
    throw new Error('The sign-in code is missing. Please try again.');
  return code;
}
