import { Redis } from 'ioredis'
import { Queue } from 'bullmq'
import { env } from '../env.js'

export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })

export const queues = {
  redemptionStandard: new Queue('redemption-standard', { connection: redis }),
  redemptionReview: new Queue('redemption-review', { connection: redis }),
  vaultAlert: new Queue('vault-alert', { connection: redis }),
  auditWrite: new Queue('audit-write', { connection: redis }),
  csvImport: new Queue('csv-import', { connection: redis }),
}

// Sliding window rate limiter
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSecs: number
): Promise<boolean> {
  const now = Date.now()
  const windowMs = windowSecs * 1000
  const multi = redis.multi()
  multi.zremrangebyscore(key, 0, now - windowMs)
  multi.zadd(key, now, `${now}-${Math.random()}`)
  multi.zcard(key)
  multi.expire(key, windowSecs + 1)
  const results = await multi.exec()
  const count = results?.[2]?.[1] as number
  return count <= maxRequests
}
