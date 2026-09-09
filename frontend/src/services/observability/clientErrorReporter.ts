interface ClientErrorPayload {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
}

export function scrubTelemetryText(value: string | undefined): string | undefined {
  return value?.replace(/[?#][^\s)"']*/g, '[REDACTED]');
}

export function reportClientError(error: Error, componentStack?: string): void {
  const endpoint = import.meta.env.VITE_ERROR_REPORTING_URL;
  if (!endpoint) {
    if (import.meta.env.DEV) console.error('Unhandled client error:', scrubTelemetryText(error.message), scrubTelemetryText(componentStack));
    return;
  }

  const payload: ClientErrorPayload = {
    message: scrubTelemetryText(error.message) ?? 'Unhandled client error',
    stack: scrubTelemetryText(error.stack),
    componentStack: scrubTelemetryText(componentStack),
    // Authentication links carry bearer secrets in query/fragment values.
    url: window.location.origin + window.location.pathname,
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
