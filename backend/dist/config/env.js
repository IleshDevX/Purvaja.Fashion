import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(5001),
    CORS_ORIGIN: z.string().default('http://localhost:5174'),
    DATABASE_URL: z.string().default('mongodb://localhost:27017/ecommerce_proto_b'),
});
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment variables:', parsedEnv.error.format());
    process.exit(1);
}
export const env = parsedEnv.data;
