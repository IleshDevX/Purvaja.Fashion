export function toSearchParams(values: object) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values as Record<string, string | number | boolean | string[] | undefined>)) {
    if (value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(','));
      continue;
    }
    params.set(key, String(value));
  }
  return params.toString();
}
