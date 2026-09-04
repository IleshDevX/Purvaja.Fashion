import { z } from 'zod';
import { ValidationError } from '../utils/errors.js';

const email = z.string().trim().email().max(320);
const password = z.string().min(12, 'Password must be at least 12 characters.').max(128).refine(value => /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value), 'Password must include upper-case, lower-case, and number characters.');
export const registerSchema = z.object({ firstName: z.string().trim().min(1).max(100), lastName: z.string().trim().min(1).max(100), email, password, confirmPassword: z.string(), phone: z.string().trim().max(32).optional() }).refine(value => value.password === value.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });
export const loginSchema = z.object({ email, password: z.string().min(1).max(128), rememberMe: z.boolean().optional() });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token: z.string().min(32).max(256), password, confirmPassword: z.string() }).refine(value => value.password === value.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });
export const tokenSchema = z.object({ token: z.string().min(32).max(256) });
export const updateMeSchema = z.object({ firstName: z.string().trim().min(1).max(100).optional(), lastName: z.string().trim().min(1).max(100).optional(), email: email.optional() }).refine(value => Object.keys(value).length > 0, 'No changes supplied.');
export function body<T extends z.ZodTypeAny>(schema: T, input: unknown): z.output<T> { const result = schema.safeParse(input); if (!result.success) throw new ValidationError('Invalid request body', result.error.flatten()); return result.data; }
