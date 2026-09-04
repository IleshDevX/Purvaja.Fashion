import { z } from 'zod';

export const configSchema = z.object({
  apiUrl: z.string().min(1),
  appName: z.string().default('Purvaja Fashion — Atelier'),
  isDev: z.boolean().default(true),
  isProd: z.boolean().default(false),
});

export type Config = z.infer<typeof configSchema>;

const getApiUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return '/api/v1';
};

const getAppName = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_NAME) {
    return import.meta.env.VITE_APP_NAME;
  }
  return 'Purvaja Fashion — Atelier';
};

const rawConfig = {
  apiUrl: getApiUrl(),
  appName: getAppName(),
  isDev: typeof import.meta !== 'undefined' && import.meta.env ? Boolean(import.meta.env.DEV) : true,
  isProd: typeof import.meta !== 'undefined' && import.meta.env ? Boolean(import.meta.env.PROD) : false,
};

const parsed = configSchema.safeParse(rawConfig);

if (!parsed.success) {
  throw new Error(`Invalid frontend configuration: ${parsed.error.message}`);
}

export const config: Config = parsed.data;
