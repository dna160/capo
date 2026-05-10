import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { generateRandomSeed } from '../../lib/crypto.js'
import { writeAudit } from '../../lib/audit.js'
import { ActorType } from '@prisma/client'

function weightedRandomSample(
  pool: { user_id: string; entries: number }[],
  numWinners: number,
  seed: string
): string[] {
  // Deterministic weighted selection using seed (simplified seedable approach)
  const total = pool.reduce((s, p) => s + p.entries, 0)
  const winners = new Set<string>()

  // Build cumulative weight array
  const cumulative: number[] = []
  let acc = 0
  for (const p of pool) {
    acc += p.entries
    cumulative.push(acc)
  }

  // Generate pseudo-random picks seeded from the seed hex
  let seedNum = BigInt('0x' + seed.slice(0, 16))
  const lcg = () => {
    seedNum = (seedNum * 6364136223846793005n + 1442695040888963407n) & 0xFFFFFFFFFFFFFFFFn
    return Number(seedNum & 0xFFFFFFn) / 0x1000000
  }

  let attempts = 0
  while (winners.size < Math.min(numWinners, pool.length) && attempts < numWinners * 10) {
    attempts++
    const r = lcg() * total
    const idx = cumulative.findIndex((c) => c > r)
    if (idx >= 0) winners.add(pool[idx].user_id)
  }

  return [...winners]
}

export async function luckyDrawAdminRoutes(app: FastifyInstance) {
  app.post(
    '/admin/campaigns/:id/lucky-draw/execute',
    { onRequest: [app.authenticateAdmin] },
    async (req, reply) => {
      const { id: campaignId } = req.params as { id: string }
      const admin = req.user as { sub: string }

      const schema = z.object({
        num_winners: z.number().int().positive(),
        prize_label: z.string().min(1),
      })
      const body = schema.safeParse(req.body)
      if (!body.success) return reply.code(400).send({ success: false, error: body.error.issues[0]?.message, data: null })

      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
      if (!campaign) return reply.code(404).send({ success: false, error: 'Campaign not found', data: null })
      if (campaign.status !== 'COMPLETED') {
        return reply.code(409).send({ success: false, error: 'Campaign must be COMPLETED to execute draw', data: null })
      }

      // Idempotency
      const existingResult = await prisma.luckyDrawResult.findUnique({ where: { campaign_id: campaignId } })
      if (existingResult) {
        return reply.send({ success: true, data: existingResult, error: null })
      }

      // Fetch all entries grouped by user
      const entries = await prisma.luckyDrawEntry.groupBy({
        by: ['user_id'],
        where: { campaign_id: campaignId },
        _count: { id: true },
      })

      const pool = entries.map((e) => ({ user_id: e.user_id, entries: e._count.id }))
      const totalEntries = pool.reduce((s, p) => s + p.entries, 0)
      const seed = generateRandomSeed()

      const winnerIds = weightedRandomSample(pool, body.data.num_winners, seed)

      // Enrich with display info
      const winners = await Promise.all(
        winnerIds.map(async (uid) => {
          const user = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, display_name: true } })
          const entryCount = pool.find((p) => p.user_id === uid)?.entries ?? 0
          return {
            user_id: uid,
            display_name: user?.display_name ?? 'Unknown',
            entry_count: entryCount,
            win_probability_pct: parseFloat(((entryCount / totalEntries) * 100).toFixed(2)),
          }
        })
      )

      const result = await prisma.luckyDrawResult.create({
        data: {
          campaign_id: campaignId,
          draw_seed: seed,
          winner_user_ids: winnerIds,
          total_entries: totalEntries,
          total_participants: pool.length,
          executed_by: admin.sub,
        },
      })

      await writeAudit({
        actorId: admin.sub,
        actorType: ActorType.ADMIN,
        eventType: 'LUCKY_DRAW_EXECUTED',
        campaignId,
        payload: { winners: winnerIds, total_entries: totalEntries, seed },
        ip: req.ip,
      })

      return reply.send({
        success: true,
        data: { winners, total_entries: totalEntries, total_participants: pool.length, draw_seed: seed },
        error: null,
      })
    }
  )

  app.get(
    '/admin/campaigns/:id/lucky-draw/entries',
    { onRequest: [app.authenticateAdmin] },
    async (req, reply) => {
      const { id: campaignId } = req.params as { id: string }
      const page = parseInt((req.query as Record<string, string>).page ?? '1', 10)
      const limit = 50
      const skip = (page - 1) * limit

      const grouped = await prisma.luckyDrawEntry.groupBy({
        by: ['user_id'],
        where: { campaign_id: campaignId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        skip,
        take: limit,
      })

      const enriched = await Promise.all(
        grouped.map(async (g) => {
          const user = await prisma.user.findUnique({
            where: { id: g.user_id },
            select: { id: true, display_name: true },
          })
          const skuBreakdown = await prisma.luckyDrawEntry.groupBy({
            by: ['sku_code'],
            where: { campaign_id: campaignId, user_id: g.user_id },
            _count: { id: true },
          })
          return {
            user_id: g.user_id,
            display_name: user?.display_name ?? 'Unknown',
            entry_count: g._count.id,
            scans_by_sku: Object.fromEntries(skuBreakdown.map((s) => [s.sku_code, s._count.id])),
          }
        })
      )

      return reply.send({ success: true, data: enriched, error: null })
    }
  )
}
