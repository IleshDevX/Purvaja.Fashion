export function sanitizeInternalRedirect(redirectPath: string | null): string {
  if (!redirectPath) return '/account';

  const clean = redirectPath.trim();

  if (
    !clean.startsWith('/') ||
    clean.startsWith('//') ||
    clean.startsWith('/\\') ||
    clean.includes('://') ||
    clean.toLowerCase().includes('javascript:') ||
    clean.toLowerCase().includes('data:')
  ) {
    return '/account';
  }

  const normalizedPath = clean.split('?')[0]?.toLowerCase() || '';
  if (
    normalizedPath === '/auth/login' ||
    normalizedPath === '/auth/register' ||
    normalizedPath === '/auth/forgot-password' ||
    normalizedPath === '/auth/reset-password'
  ) {
    return '/account';
  }

  return clean;
}
