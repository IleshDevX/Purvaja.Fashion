import { z } from 'zod';

export function getSeedAdminCredentials(source: Record<string, string | undefined> = process.env) {
  const result = z.object({
    INITIAL_ADMIN_EMAIL: z.string().trim().email(),
    INITIAL_ADMIN_PASSWORD: z.string().min(16),
  }).safeParse(source);
  if (!result.success) throw new Error('Seeding requires explicit INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD (at least 16 characters).');
  return { email: result.data.INITIAL_ADMIN_EMAIL.toLowerCase(), password: result.data.INITIAL_ADMIN_PASSWORD };
}
