import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { hashSha256 } from '../../lib/crypto.js'

export async function exportRoutes(app: FastifyInstance) {
  app.get(
    '/dashboard/campaigns/:id/export',
    { onRequest: [app.authenticateAdmin] },
    async (req, reply) => {
      const { id: campaignId } = req.params as { id: string }
      const user = req.user as { role: string }

      if (user.role !== 'BRAND' && user.role !== 'ADMIN') {
        return reply.code(403).send({ success: false, error: 'Brand role required', data: null })
      }

      const redemptions = await prisma.redemption.findMany({
        where: { campaign_id: campaignId },
        orderBy: { created_at: 'asc' },
        select: {
          id: true,
          carton_uid: true,
          user_id: true,
          district_name: true,
          city: true,
          sku_code: true,
          created_at: true,
          batch_id: true,
        },
      })

      const csvLines = [
        'redemption_id,carton_uid,user_hash,district,city,sku_code,batch_id,redeemed_at',
        ...redemptions.map((r) =>
          [
            r.id,
            r.carton_uid,
            hashSha256(r.user_id), // anonymized
            r.district_name,
            r.city,
            r.sku_code ?? '',
            r.batch_id,
            r.created_at.toISOString(),
          ].join(',')
        ),
      ].join('\n')

      reply.header('Content-Type', 'text/csv')
      reply.header('Content-Disposition', `attachment; filename="redemptions-${campaignId}.csv"`)
      return reply.send(csvLines)
    }
  )
}
