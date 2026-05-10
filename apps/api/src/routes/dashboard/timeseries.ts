import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export async function timeseriesRoutes(app: FastifyInstance) {
  app.get(
    '/dashboard/campaigns/:id/timeseries',
    { onRequest: [app.authenticateAdmin] },
    async (req, reply) => {
      const { id: campaignId } = req.params as { id: string }
      const { granularity = 'day', start_date, end_date } = req.query as Record<string, string>

      const truncMap: Record<string, string> = { hour: 'hour', day: 'day', week: 'week' }
      const trunc = truncMap[granularity] ?? 'day'

      const whereClause = `campaign_id = '${campaignId}'`
        + (start_date ? ` AND created_at >= '${start_date}'` : '')
        + (end_date ? ` AND created_at <= '${end_date}'` : '')

      const rows = await prisma.$queryRawUnsafe<{ timestamp: Date; count: bigint }[]>(`
        SELECT date_trunc('${trunc}', created_at) as timestamp, COUNT(*) as count
        FROM "Redemption"
        WHERE ${whereClause}
        GROUP BY timestamp
        ORDER BY timestamp ASC
      `)

      let cumulative = 0
      const data = rows.map((r) => {
        cumulative += Number(r.count)
        return {
          timestamp: r.timestamp,
          redemption_count: Number(r.count),
          cumulative_total: cumulative,
        }
      })

      return reply.send({ success: true, data, error: null })
    }
  )
}
