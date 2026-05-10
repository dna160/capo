import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export async function geoRoutes(app: FastifyInstance) {
  app.get(
    '/dashboard/campaigns/:id/geo',
    { onRequest: [app.authenticateAdmin] },
    async (req, reply) => {
      const { id: campaignId } = req.params as { id: string }
      const user = req.user as { role: string }

      if (user.role !== 'BRAND' && user.role !== 'ADMIN') {
        return reply.code(403).send({ success: false, error: 'Brand role required for district geo data', data: null })
      }

      const total = await prisma.redemption.count({ where: { campaign_id: campaignId } })

      const grouped = await prisma.redemption.groupBy({
        by: ['district_name', 'city'],
        where: { campaign_id: campaignId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      })

      // Get province via batch mapping
      const enriched = await Promise.all(
        grouped.map(async (g) => {
          const bm = await prisma.batchMapping.findFirst({
            where: { campaign_id: campaignId, district_name: g.district_name },
            select: { province: true },
          })
          return {
            district_name: g.district_name,
            city: g.city,
            province: bm?.province ?? '',
            redemption_count: Number(g._count.id),
            pct_of_total: total > 0 ? parseFloat(((Number(g._count.id) / total) * 100).toFixed(2)) : 0,
          }
        })
      )

      return reply.send({ success: true, data: enriched, error: null })
    }
  )
}
