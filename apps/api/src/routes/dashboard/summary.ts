import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export async function summaryRoutes(app: FastifyInstance) {
  app.get(
    '/dashboard/campaigns/:id/summary',
    { onRequest: [app.authenticateAdmin] },
    async (req, reply) => {
      const { id: campaignId } = req.params as { id: string }
      const user = req.user as { sub: string; role: string }
      const isBrand = user.role === 'BRAND' || user.role === 'ADMIN'
      const isIpHolder = user.role === 'IP_HOLDER'

      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
      if (!campaign) return reply.code(404).send({ success: false, error: 'Campaign not found', data: null })

      const [totalRedemptions, vaultTotal, vaultSpent, uniqueUsers] = await Promise.all([
        prisma.redemption.count({ where: { campaign_id: campaignId } }),
        prisma.codeVault.count({ where: { campaign_id: campaignId, reward_tier: 'STANDARD' } }),
        prisma.codeVault.count({ where: { campaign_id: campaignId, reward_tier: 'STANDARD', is_spent: true } }),
        prisma.redemption.groupBy({ by: ['user_id'], where: { campaign_id: campaignId } }).then((r) => r.length),
      ])

      const vaultRemaining = vaultTotal - vaultSpent
      const vaultSpentPct = vaultTotal > 0 ? parseFloat(((vaultSpent / vaultTotal) * 100).toFixed(2)) : 0

      if (isBrand) {
        const [byDistrict, byHour, riskFlaggedCount] = await Promise.all([
          prisma.redemption.groupBy({
            by: ['district_name', 'city'],
            where: { campaign_id: campaignId },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 20,
          }),
          prisma.$queryRaw<{ hour: string; count: bigint }[]>`
            SELECT date_trunc('hour', created_at) as hour, COUNT(*) as count
            FROM "Redemption"
            WHERE campaign_id = ${campaignId}
            GROUP BY hour
            ORDER BY hour DESC
            LIMIT 48
          `,
          prisma.fingerprintRecord.count({ where: { risk_flag: true, user: { redemptions: { some: { campaign_id: campaignId } } } } }),
        ])

        return reply.send({
          success: true,
          data: {
            total_redemptions: totalRedemptions,
            vault_remaining: vaultRemaining,
            vault_spent_pct: vaultSpentPct,
            unique_users: uniqueUsers,
            risk_flagged_count: riskFlaggedCount,
            redemptions_by_district: byDistrict.map((d) => ({
              district_name: d.district_name,
              city: d.city,
              count: Number(d._count.id),
            })),
            redemptions_by_hour: byHour.map((h) => ({
              hour: h.hour,
              count: Number(h.count),
            })),
          },
          error: null,
        })
      }

      if (isIpHolder) {
        const byCity = await prisma.redemption.groupBy({
          by: ['city'],
          where: { campaign_id: campaignId },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 20,
        })

        return reply.send({
          success: true,
          data: {
            total_redemptions: totalRedemptions,
            vault_remaining: vaultRemaining,
            vault_spent_pct: vaultSpentPct,
            redemptions_by_city: byCity.map((c) => ({ city: c.city, count: Number(c._count.id) })),
          },
          error: null,
        })
      }

      return reply.code(403).send({ success: false, error: 'Insufficient role', data: null })
    }
  )
}
