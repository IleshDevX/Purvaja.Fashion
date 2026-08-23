import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Enter your email address.').email('Enter a valid email address.'),
  password: z
    .string()
    .min(1, 'Enter your password.')
    .min(8, 'Password must be at least 8 characters.'),
  rememberMe: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, 'Enter your first name.')
      .min(2, 'First name must be at least 2 characters.')
      .max(50, 'First name must be under 50 characters.'),
    lastName: z
      .string()
      .trim()
      .min(1, 'Enter your last name.')
      .min(2, 'Last name must be at least 2 characters.')
      .max(50, 'Last name must be under 50 characters.'),
    email: z
      .string()
      .trim()
      .min(1, 'Enter your email address.')
      .email('Enter a valid email address.'),
    password: z
      .string()
      .min(1, 'Enter a password.')
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
      .regex(/[0-9!@#$%^&*]/, 'Password must contain at least one number or symbol.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
    phone: z
      .string()
      .trim()
      .optional()
      .refine(val => !val || /^[6-9]\d{9}$/.test(val), {
        message: 'Enter a valid 10-digit mobile number.',
      }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .email('Enter a valid email address.'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Enter a new password.')
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
      .regex(/[0-9!@#$%^&*]/, 'Password must contain at least one number or symbol.'),
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
