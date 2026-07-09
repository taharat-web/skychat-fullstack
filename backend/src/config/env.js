const { z } = require('zod');
require('dotenv').config();

// Fail fast: if a required env var is missing or malformed, the process
// should refuse to start rather than fail confusingly at request time.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(30),

  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z.coerce.boolean().default(false),

  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().default('SkyChat <no-reply@skychat.app>'),

  UPLOAD_DIR: z.string().default('uploads'),
  MAX_AVATAR_SIZE_MB: z.coerce.number().positive().default(5),

  AUTH_RATE_LIMIT_WINDOW_MIN: z.coerce.number().positive().default(15),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().positive().default(10),
  MESSAGE_RATE_LIMIT_WINDOW_SEC: z.coerce.number().positive().default(10),
  MESSAGE_RATE_LIMIT_MAX: z.coerce.number().positive().default(30),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;
env.IS_PRODUCTION = env.NODE_ENV === 'production';

module.exports = env;
