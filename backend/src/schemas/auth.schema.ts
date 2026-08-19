import { z } from 'zod';

export const SignupSchema = z.object({
  email: z.email().max(255).transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8, 'password must be at least 8 characters').max(128),
  name: z.string().min(1).max(80).optional(),
});

export const LoginSchema = z.object({
  email: z.email().max(255).transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, 'password is required').max(128),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
