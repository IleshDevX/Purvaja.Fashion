import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5001),
  CORS_ORIGIN: z.string().default('http://localhost:5174'),
  DATABASE_URL: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;

export function getDatabaseUrl(): string {
  const result = z
    .string()
    .url('DATABASE_URL must be a valid PostgreSQL connection URL.')
    .refine(
      value => value.startsWith('postgresql://') || value.startsWith('postgres://'),
      'DATABASE_URL must use the postgresql:// or postgres:// protocol.',
    )
    .safeParse(env.DATABASE_URL);

  if (!result.success) {
    throw new Error(`Invalid DATABASE_URL: ${result.error.issues[0]?.message ?? 'value is required.'}`);
  }

  return result.data;
}
