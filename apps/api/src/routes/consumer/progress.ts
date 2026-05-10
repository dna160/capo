import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { skuLabel } from '../../services/geo.service.js'

export async function progressRoutes(app: FastifyInstance) {
  app.get('/user/progress/:campaign_id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const userId = (req.user as { sub: string }).sub
    const { campaign_id } = req.params as { campaign_id: string }

    const [progress, config] = await Promise.all([
      prisma.userCampaignProgress.findUnique({
        where: { campaign_id_user_id: { campaign_id, user_id: userId } },
      }),
      prisma.campaignRewardConfig.findUnique({ where: { campaign_id } }),
    ])

    if (!config) {
      return reply.code(404).send({ success: false, error: 'Campaign reward config not found', data: null })
    }

    const totalScans = progress?.total_scans ?? 0
    const scannedSkus = progress?.scanned_skus ?? []

    // Compute next tier
    const tiers = [
      { tier: 'TIER_1', threshold: config.tier1_threshold, rewarded: progress?.tier1_rewarded ?? false },
      { tier: 'TIER_2', threshold: config.tier2_threshold, rewarded: progress?.tier2_rewarded ?? false },
      { tier: 'TIER_3', threshold: config.tier3_threshold, rewarded: progress?.tier3_rewarded ?? false },
    ]
    const nextTier = tiers.find((t) => !t.rewarded)

    // Variety skus remaining
    const varietySkusRemaining = config.variety_skus_required
      .filter((s) => !scannedSkus.includes(s))
      .map(skuLabel)

    return reply.send({
      success: true,
      data: {
        total_scans: totalScans,
        next_tier: nextTier
          ? { tier: nextTier.tier, scans_remaining: Math.max(0, nextTier.threshold - totalScans) }
          : null,
        tier1_rewarded: progress?.tier1_rewarded ?? false,
        tier2_rewarded: progress?.tier2_rewarded ?? false,
        tier3_rewarded: progress?.tier3_rewarded ?? false,
        variety_rewarded: progress?.variety_rewarded ?? false,
        scanned_skus: scannedSkus,
        lucky_draw_entries: progress?.lucky_draw_entries ?? 0,
        variety_skus_remaining: varietySkusRemaining,
      },
      error: null,
    })
  })
}
