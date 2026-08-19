import { z } from 'zod';

const email = z.email().max(255).transform((v) => v.toLowerCase().trim());

/** Single source of the password policy — mirrored by the frontend form. */
export const PASSWORD_MIN_LENGTH = 8;
const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(128);

export const SignupSchema = z
  .object({
    email,
    password,
    confirmPassword: z.string().max(128),
  })
  // Reported on confirmPassword so the form can show it under that field.
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const LoginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(128),
});

export const ResendVerificationSchema = z.object({
  email: email.optional(),
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>;
