export function paymentDestination(redirectUrl: string, origin: string): { external: boolean; url: string } {
  const destination = new URL(redirectUrl, origin);
  if (destination.username || destination.password) throw new Error('Invalid payment destination.');
  if (destination.origin === origin) {
    if (!destination.pathname.startsWith('/checkout/')) throw new Error('Invalid internal payment destination.');
    return { external: false, url: destination.pathname + destination.search + destination.hash };
  }
  if (destination.protocol !== 'https:') throw new Error('Payment destination must use HTTPS.');
  return { external: true, url: destination.href };
}
