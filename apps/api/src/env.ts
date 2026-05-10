function require(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const env = {
  DATABASE_URL: require('DATABASE_URL'),
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  JWT_SECRET: require('JWT_SECRET'),
  AES_KEY: require('AES_KEY'),
  HMAC_SECRET: require('HMAC_SECRET'),
  GOOGLE_CLIENT_ID: require('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: require('GOOGLE_CLIENT_SECRET'),
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173').split(','),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '8080', 10),
}
