interface ClientErrorPayload {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
}

export function reportClientError(error: Error, componentStack?: string): void {
  const endpoint = import.meta.env.VITE_ERROR_REPORTING_URL;
  if (!endpoint) {
    if (import.meta.env.DEV) console.error('Unhandled client error:', error, componentStack);
    return;
  }

  const payload: ClientErrorPayload = {
    message: error.message,
    stack: error.stack,
    componentStack,
    url: window.location.href,
  };
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    return;
  }

  void fetch(endpoint, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  });
}
