import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PROD: process.env.NODE_ENV === 'production',
  PORT: parseInt(process.env.PORT || '3001', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  FRONTEND_URL: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://pulse.avixstudio.in' : 'http://localhost:5173'),
  
  // Redis (Upstash)
  REDIS_URL: process.env.KV_REST_API_URL || 
             process.env.UPSTASH_REDIS_REST_URL || 
             process.env.STORAGE_REST_API_URL ||
             process.env.REDIS_REST_API_URL || 
             process.env.REDIS_URL || '',
  REDIS_TOKEN: process.env.KV_REST_API_TOKEN || 
               process.env.UPSTASH_REDIS_REST_TOKEN || 
               process.env.STORAGE_REST_API_TOKEN ||
               process.env.REDIS_REST_API_TOKEN || 
               process.env.REDIS_TOKEN || '',

  // Razorpay
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',

  // Supabase (PostgreSQL & Media Storage)
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Resend (Transactional Email Service)
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  RESEND_SENDER_EMAIL: process.env.RESEND_SENDER_EMAIL || 'notifications@pulse.avixstudio.in',
  RESEND_SENDER_NAME: process.env.RESEND_SENDER_NAME || 'PULSE Fitness',
  RESEND_SUPPORT_EMAIL: process.env.RESEND_SUPPORT_EMAIL || 'support@avixstudio.in',

  // Legacy Brevo compatibility aliases
  BREVO_API_KEY: process.env.RESEND_API_KEY || process.env.BREVO_API_KEY || '',
  BREVO_SENDER_EMAIL: process.env.RESEND_SENDER_EMAIL || process.env.BREVO_SENDER_EMAIL || 'notifications@pulse.avixstudio.in',
  BREVO_SENDER_NAME: process.env.RESEND_SENDER_NAME || process.env.BREVO_SENDER_NAME || 'PULSE Fitness',
  BREVO_SUPPORT_EMAIL: process.env.RESEND_SUPPORT_EMAIL || process.env.BREVO_SUPPORT_EMAIL || 'support@avixstudio.in',

  // Security
  SESSION_SECRET: process.env.SESSION_SECRET || 'pulse_session_secret_2026_default',
  COOKIE_NAME: 'pulse_session_token',

  // Allowed redirect origins
  TRUSTED_DOMAINS: [
    'https://pulse.avixstudio.in',
    'https://pulse.avixstudio.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:5173',
  ],
};
