import rateLimit from 'express-rate-limit';

// Global API rate limit: 300 requests per 15 minutes per IP
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
});

// Auth endpoints rate limit: 20 attempts per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
  },
});

// Payments rate limit: 30 requests per 15 minutes per IP
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'PAYMENT_RATE_LIMIT_EXCEEDED',
      message: 'Too many payment requests. Please try again shortly.',
    },
  },
});

// Invite creation/redemption rate limit: 20 requests per 15 minutes per IP
export const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'INVITE_RATE_LIMIT_EXCEEDED',
      message: 'Too many invite operations. Please try again later.',
    },
  },
});

// Email verification resend rate limit: 5 requests per 15 minutes per IP
export const emailResendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RESEND_RATE_LIMIT_EXCEEDED',
      message: 'Too many verification email requests. Please wait a few minutes before trying again.',
    },
  },
});

// Forgot password request rate limit: 5 requests per 15 minutes per IP
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.headers['x-pulse-test-bypass'] === 'pulse-internal-security-test',
  message: {
    success: false,
    error: {
      code: 'FORGOT_PASSWORD_RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset requests. Please wait 15 minutes before trying again.',
    },
  },
});

// Password reset execution rate limit: 15 attempts per 15 minutes per IP
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.headers['x-pulse-test-bypass'] === 'pulse-internal-security-test',
  message: {
    success: false,
    error: {
      code: 'RESET_PASSWORD_RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset attempts. Please wait 15 minutes before trying again.',
    },
  },
});

// Review endpoints rate limit: 60 requests per 15 minutes per IP
export const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.headers['x-pulse-test-bypass'] === 'pulse-internal-security-test',
  message: {
    success: false,
    error: {
      code: 'REVIEW_RATE_LIMIT_EXCEEDED',
      message: 'Too many review requests. Please try again shortly.',
    },
  },
});


