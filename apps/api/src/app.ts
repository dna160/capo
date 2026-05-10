import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import { env } from './env.js'

// Routes
import { authRoutes } from './routes/consumer/auth.js'
import { redeemRoutes } from './routes/consumer/redeem.js'
import { historyRoutes } from './routes/consumer/history.js'
import { progressRoutes } from './routes/consumer/progress.js'
import { adminAuthRoutes } from './routes/admin/auth.js'
import { campaignAdminRoutes } from './routes/admin/campaigns.js'
import { vaultAdminRoutes } from './routes/admin/vault.js'
import { batchmapAdminRoutes } from './routes/admin/batchmap.js'
import { luckyDrawAdminRoutes } from './routes/admin/luckydraw.js'
import { summaryRoutes } from './routes/dashboard/summary.js'
import { timeseriesRoutes } from './routes/dashboard/timeseries.js'
import { geoRoutes } from './routes/dashboard/geo.js'
import { exportRoutes } from './routes/dashboard/export.js'
import { rewardFunnelRoutes } from './routes/dashboard/rewardfunnel.js'

// Augment FastifyInstance with auth decorators
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    authenticateAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: env.NODE_ENV === 'development' ? 'info' : 'warn' },
    trustProxy: true,
  })

  // ── Plugins ───────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await app.register(jwt, { secret: env.JWT_SECRET })

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  })

  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  })

  // ── Auth decorators ───────────────────────────────────────────────────────
  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify()
      const payload = req.user as { role: string }
      if (payload.role !== 'CONSUMER') {
        return reply.code(403).send({ success: false, error: 'Consumer token required', data: null })
      }
    } catch {
      reply.code(401).send({ success: false, error: 'Unauthorized', data: null })
    }
  })

  app.decorate('authenticateAdmin', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify()
      const payload = req.user as { role: string }
      if (!['ADMIN', 'BRAND', 'IP_HOLDER'].includes(payload.role)) {
        return reply.code(403).send({ success: false, error: 'Admin token required', data: null })
      }
    } catch {
      reply.code(401).send({ success: false, error: 'Unauthorized', data: null })
    }
  })

  // ── Health ────────────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // ── Routes under /api/v1 ─────────────────────────────────────────────────
  await app.register(async (v1) => {
    // Consumer
    await v1.register(authRoutes)
    await v1.register(redeemRoutes)
    await v1.register(historyRoutes)
    await v1.register(progressRoutes)

    // Admin auth (no admin-auth guard — it validates credentials to issue JWT)
    await v1.register(adminAuthRoutes)

    // Admin management
    await v1.register(campaignAdminRoutes)
    await v1.register(vaultAdminRoutes)
    await v1.register(batchmapAdminRoutes)
    await v1.register(luckyDrawAdminRoutes)

    // Dashboard analytics
    await v1.register(summaryRoutes)
    await v1.register(timeseriesRoutes)
    await v1.register(geoRoutes)
    await v1.register(exportRoutes)
    await v1.register(rewardFunnelRoutes)
  }, { prefix: '/api/v1' })

  return app
}
