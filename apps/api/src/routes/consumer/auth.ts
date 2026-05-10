import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { hashSha256 } from '../../lib/crypto.js'
import { exchangeGoogleCode } from '../../lib/google.js'
import { writeAudit } from '../../lib/audit.js'
import { ActorType } from '@prisma/client'

const callbackBody = z.object({
  provider: z.enum(['GOOGLE', 'WHATSAPP']),
  auth_code: z.string().min(1),
  fingerprint_hash: z.string().min(1),
  redirect_uri: z.string().url().optional(),
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/oauth/callback', async (req, reply) => {
    const body = callbackBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ success: false, error: 'Invalid request body', data: null })

    const { provider, auth_code, fingerprint_hash, redirect_uri } = body.data
    const ip = req.ip

    let socialId: string
    let email: string | undefined
    let displayName: string | undefined

    if (provider === 'GOOGLE') {
      try {
        const gUser = await exchangeGoogleCode(
          auth_code,
          redirect_uri ?? `${req.headers.origin ?? ''}/auth/callback`
        )
        socialId = gUser.sub
        email = gUser.email
        displayName = gUser.name
      } catch {
        return reply.code(400).send({ success: false, error: 'Invalid Google auth code', data: null })
      }
    } else {
      // WhatsApp OAuth stub — provider TBD per PRD open item #3
      return reply.code(501).send({ success: false, error: 'WhatsApp OAuth not yet configured', data: null })
    }

    // Upsert user
    const user = await prisma.user.upsert({
      where: { social_id: socialId },
      create: { social_id: socialId, provider, email, display_name: displayName },
      update: { email, display_name: displayName },
    })

    // Fingerprint handling
    let riskFlag = false
    const existingFp = await prisma.fingerprintRecord.findFirst({ where: { user_id: user.id } })

    if (!existingFp) {
      await prisma.fingerprintRecord.create({
        data: { user_id: user.id, fingerprint_hash },
      })
    } else if (existingFp.fingerprint_hash !== fingerprint_hash) {
      riskFlag = true
      await prisma.fingerprintRecord.upsert({
        where: { fingerprint_hash },
        create: { user_id: user.id, fingerprint_hash, risk_flag: true },
        update: { last_seen_at: new Date(), risk_flag: true },
      })

      // Count distinct fingerprints — hard block at 3+
      const fpCount = await prisma.fingerprintRecord.count({ where: { user_id: user.id } })
      if (fpCount >= 3) {
        await writeAudit({
          actorId: user.id,
          actorType: ActorType.SYSTEM,
          eventType: 'FRAUD_HARDBLOCK',
          payload: { user_id: user.id, fp_count: fpCount },
          ip,
        })
        return reply.code(403).send({ success: false, error: 'Account blocked due to fraud signals', data: null })
      }

      await prisma.fingerprintRecord.update({
        where: { id: existingFp.id },
        data: { risk_flag: true },
      })
    }

    const jwt = app.jwt.sign({ sub: user.id, role: 'CONSUMER' }, { expiresIn: '24h' })

    await writeAudit({
      actorId: user.id,
      actorType: ActorType.CONSUMER,
      eventType: 'AUTH_SUCCESS',
      payload: { provider, risk_flag: riskFlag },
      ip,
    })

    return reply.send({
      success: true,
      data: { jwt, user_id: user.id, risk_flag: riskFlag },
      error: null,
    })
  })
}
