import { z } from 'zod';

const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must be at most 50 characters')
  .regex(/^[a-zA-Z0-9_.-]+$/, 'Username may only contain letters, numbers, dots, underscores and hyphens');

// Requires reasonable complexity without being overly restrictive
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a digit');

export const registerSchema = z.object({
  body: z.object({
    username: usernameSchema,
    email: z.string().email('Invalid email address').max(255),
    password: passwordSchema,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    // Accepts either a username or an email address in the same field
    login: z.string().min(3).max(255),
    password: z.string().min(1, 'Password is required'),
  }),
});

export type RegisterDto = z.infer<typeof registerSchema>['body'];
export type LoginDto = z.infer<typeof loginSchema>['body'];
