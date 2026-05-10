const REQUIRED_KEYS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'AES_KEY',
  'HMAC_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
] as const

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  AES_KEY: process.env.AES_KEY ?? '',
  HMAC_SECRET: process.env.HMAC_SECRET ?? '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? '',
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173').split(','),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '8080', 10),
}

export function assertRequiredEnv(): void {
  const missing = REQUIRED_KEYS.filter((k) => !process.env[k])
  if (missing.length > 0) {
    throw new Error(`[startup] Missing required environment variables: ${missing.join(', ')}`)
  }
}
