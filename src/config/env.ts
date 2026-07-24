import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Allow connections to legacy hosts with self-signed SSL certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const envSchema = z.object({
  PORT: z.string().default('3000').transform((val) => parseInt(val, 10)),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LEGACY_BASE_URL: z.string().url().default('https://urja-ops.flockenergy.tech'),
  LEGACY_EMAIL: z.string().email().default('operator@urja.local'),
  LEGACY_PASSWORD: z.string().min(1).default('urja-ops-2026'),
  REQUEST_TIMEOUT: z.string().default('10000').transform((val) => parseInt(val, 10)),
  MAX_RETRY: z.string().default('1').transform((val) => parseInt(val, 10)),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform((val) => parseInt(val, 10)),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsedEnv.data;
