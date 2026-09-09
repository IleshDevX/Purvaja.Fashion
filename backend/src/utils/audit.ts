/**
 * Audit log sanitization utility.
 * Ensures sensitive data like passwords, tokens, secrets, and auth headers
 * are never persisted into database audit records.
 */
export function sanitizeAuditMetadata<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeAuditMetadata(item)) as unknown as T;
  }

  if (typeof value === 'object') {
    const sensitivePattern = /password|token|secret|cookie|authorization|key|hash|credential|signature/i;
    const sanitized: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (sensitivePattern.test(k)) {
        sanitized[k] = '[REDACTED]';
      } else if (v && typeof v === 'object') {
        sanitized[k] = sanitizeAuditMetadata(v);
      } else {
        sanitized[k] = v;
      }
    }

    return sanitized as T;
  }

  return value;
}
