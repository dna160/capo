import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export async function historyRoutes(app: FastifyInstance) {
  app.get('/user/history', { onRequest: [app.authenticate] }, async (req, reply) => {
    const userId = (req.user as { sub: string }).sub
    const campaignId = (req.query as Record<string, string>).campaign_id

    const redemptions = await prisma.redemption.findMany({
      where: {
        user_id: userId,
        ...(campaignId ? { campaign_id: campaignId } : {}),
      },
      include: { campaign: { select: { campaign_name: true, game_type: true } } },
      orderBy: { created_at: 'desc' },
    })

    const data = redemptions.map((r) => ({
      campaign_name: r.campaign.campaign_name,
      game_type: r.campaign.game_type,
      redeemed_at: r.created_at,
      district_resolved: r.district_name,
      sku_code: r.sku_code,
      // game_code intentionally omitted — one-time display only
    }))

    return reply.send({ success: true, data, error: null })
  })
}
