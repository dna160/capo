import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export async function rewardFunnelRoutes(app: FastifyInstance) {
  app.get(
    '/dashboard/campaigns/:id/reward-funnel',
    { onRequest: [app.authenticateAdmin] },
    async (req, reply) => {
      const { id: campaignId } = req.params as { id: string }
      const user = req.user as { role: string }

      const isBrand = user.role === 'BRAND' || user.role === 'ADMIN'

      const [
        usersWithScans,
        tier1Unlocked,
        tier2Unlocked,
        tier3Unlocked,
        varietyUnlocked,
      ] = await Promise.all([
        prisma.userCampaignProgress.count({ where: { campaign_id: campaignId, total_scans: { gt: 0 } } }),
        prisma.userCampaignProgress.count({ where: { campaign_id: campaignId, tier1_rewarded: true } }),
        prisma.userCampaignProgress.count({ where: { campaign_id: campaignId, tier2_rewarded: true } }),
        prisma.userCampaignProgress.count({ where: { campaign_id: campaignId, tier3_rewarded: true } }),
        prisma.userCampaignProgress.count({ where: { campaign_id: campaignId, variety_rewarded: true } }),
      ])

      const pct = (n: number, total: number) =>
        total > 0 ? parseFloat(((n / total) * 100).toFixed(1)) : 0

      const baseData = {
        tier1_unlocked: tier1Unlocked,
        tier2_unlocked: tier2Unlocked,
        tier3_unlocked: tier3Unlocked,
        variety_unlocked: varietyUnlocked,
      }

      if (!isBrand) {
        return reply.send({ success: true, data: baseData, error: null })
      }

      const [skuDist, luckyDrawStats] = await Promise.all([
        prisma.luckyDrawEntry.groupBy({
          by: ['sku_code'],
          where: { campaign_id: campaignId },
          _count: { id: true },
        }),
        prisma.luckyDrawEntry.aggregate({
          where: { campaign_id: campaignId },
          _count: { id: true },
          _max: { user_id: true },
        }),
      ])

      const luckyParticipants = await prisma.luckyDrawEntry.groupBy({
        by: ['user_id'],
        where: { campaign_id: campaignId },
      })

      return reply.send({
        success: true,
        data: {
          ...baseData,
          users_with_1plus_scan: usersWithScans,
          conversion_rates: {
            t0_to_t1: pct(tier1Unlocked, usersWithScans),
            t1_to_t2: pct(tier2Unlocked, tier1Unlocked),
            t2_to_t3: pct(tier3Unlocked, tier2Unlocked),
            variety_completion: pct(varietyUnlocked, usersWithScans),
          },
          sku_distribution: Object.fromEntries(
            skuDist.map((s) => [s.sku_code, s._count.id])
          ),
          lucky_draw_total_entries: luckyDrawStats._count.id,
          lucky_draw_unique_participants: luckyParticipants.length,
        },
        error: null,
      })
    }
  )
}
