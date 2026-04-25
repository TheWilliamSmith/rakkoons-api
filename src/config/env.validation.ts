import { z } from 'zod';

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
