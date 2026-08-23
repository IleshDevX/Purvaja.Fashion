import { z } from 'zod';

export const addressSchema = z.object({
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
  phone: z
    .string()
    .trim()
    .min(1, 'Enter your mobile number.')
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.'),
  addressLine1: z
    .string()
    .trim()
    .min(1, 'Enter your street address.')
    .min(5, 'Address should be at least 5 characters.'),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(1, 'Enter your city.').min(2, 'City name is too short.'),
  state: z.string().trim().min(1, 'Select or enter your state.').min(2, 'State name is too short.'),
  postalCode: z
    .string()
    .trim()
    .min(1, 'Enter your 6-digit PIN code.')
    .regex(/^\d{6}$/, 'PIN code must be exactly 6 digits.'),
  country: z.string().default('India'),
});

export type AddressFormData = z.infer<typeof addressSchema>;
