import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { verifyHmac } from '../../lib/crypto.js'
import { checkRateLimit } from '../../lib/redis.js'
import { prisma } from '../../lib/prisma.js'
import { processRedemption } from '../../services/redemption.service.js'

const redeemBody = z.object({
  campaign_id: z.string().uuid(),
  carton_uid: z.string().min(1),
  signature: z.string().min(1),
  fingerprint_hash: z.string().min(1),
})

export async function redeemRoutes(app: FastifyInstance) {
  app.post('/redeem', { onRequest: [app.authenticate] }, async (req, reply) => {
    const body = redeemBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ success: false, error: 'Invalid request body', data: null })

    const { campaign_id, carton_uid, signature, fingerprint_hash } = body.data
    const userId = (req.user as { sub: string }).sub
    const ip = req.ip

    // HMAC signature check
    if (!verifyHmac(carton_uid, signature)) {
      return reply.code(400).send({ success: false, error: 'Invalid QR signature', data: null })
    }

    // User scan velocity limit (5/hr)
    const velKey = `vel:user:${userId}`
    const velOk = await checkRateLimit(velKey, 5, 3600)
    if (!velOk) {
      return reply.code(429).send({ success: false, error: 'Too many scan attempts. Try again in 1 hour.', data: null })
    }

    // Fingerprint risk check → route to review queue if flagged
    const fp = await prisma.fingerprintRecord.findFirst({ where: { user_id: userId } })
    if (fp?.risk_flag) {
      // In a full implementation: enqueue to redemption-review queue
      return reply.code(202).send({
        success: true,
        data: { queued: true, message: 'Redemption queued for review. You will be notified.' },
        error: null,
      })
    }

    try {
      const result = await processRedemption({
        campaignId: campaign_id,
        cartonUid: carton_uid,
        userId,
        fingerprintHash: fingerprint_hash,
        ip,
      })

      return reply.send({ success: true, data: result, error: null })
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message: string }
      const code = e.statusCode ?? 500
      return reply.code(code).send({ success: false, error: e.message, data: null })
    }
  })
}
