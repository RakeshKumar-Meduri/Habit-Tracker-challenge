import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long').max(30),
  email: z.string().trim().email('Please enter a valid email address').optional(),
  name: z.string().min(1, 'Name is required').max(50).optional(),
  password: z.string().optional(),
  passwordPlain: z.string().optional(),
  height: z.coerce.number().min(50).max(300).optional(),
  weight: z.coerce.number().min(20).max(500).optional(),
  age: z.coerce.number().min(10).max(120).optional(),
  gender: z.string().optional(),
  inviteToken: z.string().optional(),
}).superRefine((data, ctx) => {
  const pass = (data.password || data.passwordPlain || '').trim();
  const cleanUsername = data.username.trim().replace(/^@+/, '').toLowerCase();

  if (!pass || pass.length < 6) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password must be at least 6 characters long',
      path: ['password'],
    });
    return;
  }
  if (!/[A-Z]/.test(pass)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password must contain at least one uppercase letter',
      path: ['password'],
    });
  }
  if (!/[^A-Za-z0-9]/.test(pass)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password must contain at least one special character',
      path: ['password'],
    });
  }
  if (pass.toLowerCase() === cleanUsername) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password cannot match your username',
      path: ['password'],
    });
  }
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or identifier is required'),
  password: z.string().optional(),
  passwordPlain: z.string().optional(),
  passwordHash: z.string().optional(),
}).refine(data => data.password || data.passwordPlain || data.passwordHash, {
  message: 'Password is required',
  path: ['password'],
});

export const groupUpdateSchema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters').max(60).optional(),
  step_target: z.coerce.number().min(1000, 'Step target must be at least 1,000 steps').max(50000, 'Step target cannot exceed 50,000 steps').optional(),
});

export const createInviteSchema = z.object({
  expiresInDays: z.coerce.number().min(1).max(365).optional().default(7),
  maxUses: z.coerce.number().min(1).max(1000).optional().default(10),
});

export const dailyLogSchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  gym_done: z.boolean().optional(),
  steps_done: z.boolean().optional(),
  steps_value: z.coerce.number().min(0).optional(),
  steps_target: z.coerce.number().min(1000).optional(),
  sleep_done: z.boolean().optional(),
  junk_food_avoided: z.boolean().optional(),
  cheat_day_used: z.boolean().optional(),
  water_done: z.boolean().optional(),
  water_intake_ml: z.coerce.number().min(0).optional(),
  water_target_ml: z.coerce.number().min(500).optional(),
  sleep_start: z.string().optional(),
  sleep_end: z.string().optional(),
  sleep_duration: z.coerce.number().min(0).max(24).optional(),
});

export const workoutItemSchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  exercise_name: z.string().min(1, 'Exercise name is required').max(100),
  exercise_type: z.enum(['strength', 'cardio', 'other']).optional().default('strength'),
  sets: z.coerce.number().min(0).max(200).optional().default(0),
  reps: z.coerce.number().min(0).max(1000).optional().default(0),
  weight: z.coerce.number().min(0).max(1000).optional().default(0),
  weight_unit: z.enum(['kg', 'lb']).optional().default('kg'),
  duration: z.coerce.number().min(0).max(1440).optional().default(0),
  notes: z.string().max(500).optional(),
  is_private: z.boolean().optional().default(false),
});

export const weightLogSchema = z.object({
  id: z.string().optional(),
  weight: z.coerce.number().min(20).max(500),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

export const createOrderSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  paymentId: z.string().min(1, 'Payment ID is required'),
  signature: z.string().min(1, 'Signature is required'),
});

export const setEmailSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters long'),
  confirmPassword: z.string().optional(),
}).superRefine((data, ctx) => {
  const pass = data.newPassword.trim();
  if (pass.length < 6) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password must be at least 6 characters long',
      path: ['newPassword'],
    });
    return;
  }
  if (!/[A-Z]/.test(pass)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password must contain at least one uppercase letter',
      path: ['newPassword'],
    });
  }
  if (!/[^A-Za-z0-9]/.test(pass)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password must contain at least one special character',
      path: ['newPassword'],
    });
  }
  if (data.confirmPassword && pass !== data.confirmPassword.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    });
  }
});


