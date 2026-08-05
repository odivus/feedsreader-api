import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * All environment variables the app depends on are validated here, once,
 * at startup. If something required is missing or malformed, the process
 * exits immediately with a clear error instead of failing later in a
 * confusing way at runtime.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_URL: z.string().url(),
  CLIENT_URL: z.string().url(),
  CORS_ORIGINS: z.string().optional().default(''),
  TRUST_PROXY: z.coerce.boolean().default(false),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(30),
  REFRESH_TOKEN_COOKIE_NAME: z.string().default('refreshToken'),
  COOKIE_SECURE: z.coerce.boolean().default(false),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().optional().default(''),

  GITHUB_CLIENT_ID: z.string().optional().default(''),
  GITHUB_CLIENT_SECRET: z.string().optional().default(''),
  GITHUB_CALLBACK_URL: z.string().optional().default(''),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  LOG_LEVEL: z.string().default('info'),

  // ---- Feed-parsing worker (src/worker.ts) ----
  // Standard 5-field cron expression. Default: every 15 minutes.
  FEED_PARSE_CRON_SCHEDULE: z.string().default('*/15 * * * *'),
  // How many feeds to fetch/parse in parallel per run.
  FEED_FETCH_CONCURRENCY: z.coerce.number().int().positive().default(5),
  // Per-feed HTTP timeout, in milliseconds.
  FEED_FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),

  // ---- Article retention ----
  // Hard cap: after each refresh, keep only the N most recent articles per
  // feed (articles with unknown published_at are pruned first). This is
  // the primary safeguard against unbounded table growth.
  ARTICLES_MAX_PER_FEED: z.coerce.number().int().positive().default(300),
  // Soft cap: additionally drop anything older than N days, even if the
  // per-feed count above hasn't been hit yet. Applied before the count-based
  // cap. Articles with no known published_at are left alone here (we can't
  // judge their age) - they're handled by ARTICLES_MAX_PER_FEED instead.
  ARTICLES_MAX_AGE_DAYS: z.coerce.number().int().positive().default(30),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  isDevelopment: parsed.data.NODE_ENV === 'development',
  isTest: parsed.data.NODE_ENV === 'test',
  corsOrigins: [
    parsed.data.CLIENT_URL,
    ...parsed.data.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  ],
  googleOAuthEnabled: Boolean(parsed.data.GOOGLE_CLIENT_ID && parsed.data.GOOGLE_CLIENT_SECRET),
  githubOAuthEnabled: Boolean(parsed.data.GITHUB_CLIENT_ID && parsed.data.GITHUB_CLIENT_SECRET),
};
