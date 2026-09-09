import { z } from 'zod';

const durationInMinutes = (fallback: number) =>
  z.coerce.number().int().positive().default(fallback);

const durationInDays = (fallback: number) =>
  z.coerce.number().int().positive().default(fallback);

const rateLimit = (fallback: number) =>
  z.coerce.number().int().positive().default(fallback);

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce.number().int().min(1024).max(65535).default(8080),

  DATABASE_URL: z.string().url(),

  JWT_ACCESS_TOKEN_SECRET: z.string().min(32),
  JWT_REFRESH_TOKEN_SECRET: z.string().min(32),

  JWT_ACCESS_TOKEN_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRATION: z.string().default('7d'),

  CORS_ORIGIN: z
    .string()
    .optional()
    .transform((val) => val?.split(',').filter(Boolean) ?? []),

  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),

  TERMS_VERSION: z.string().default('2026-01'),

  SIGNUP_JOURNEY_TTL_MINUTES: durationInMinutes(15),
  SIGNUP_CODE_TTL_MINUTES: durationInMinutes(10),
  VERIFICATION_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),

  SESSION_SLIDING_LIFETIME_DAYS: durationInDays(14),
  SESSION_ABSOLUTE_LIFETIME_DAYS: durationInDays(60),

  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().min(1).optional(),
  MAIL_REPLY_TO: z.string().optional(),

  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_USERNAME_AVAILABILITY: rateLimit(60),
  RATE_LIMIT_SIGN_UP: rateLimit(5),
  RATE_LIMIT_SIGN_UP_VERIFY: rateLimit(10),
  RATE_LIMIT_SIGN_IN_PER_IP: rateLimit(10),
  RATE_LIMIT_SIGN_IN_PER_ACCOUNT: rateLimit(5),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(env: Record<string, unknown>): Env {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((err) => `- ${err.path.join('.')} : ${err.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${formattedErrors}`);
  }

  return result.data;
}
