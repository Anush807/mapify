import { z } from 'zod';

/** Mirrors backend `schemas/auth.schema.ts` so errors surface before the network. */
export const PASSWORD_MIN_LENGTH = 8;

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export const signupSchema = z
  .object({
    email: z.email('Enter a valid email address'),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`),
    confirmPassword: z.string().min(1, 'Re-enter your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
