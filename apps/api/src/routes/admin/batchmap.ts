import type { FastifyInstance } from 'fastify'
import { parse } from 'csv-parse/sync'
import { prisma } from '../../lib/prisma.js'
import { writeAudit } from '../../lib/audit.js'
import { ActorType } from '@prisma/client'

export async function batchmapAdminRoutes(app: FastifyInstance) {
  app.post(
    '/admin/campaigns/:id/batchmap/upload',
    { onRequest: [app.authenticateAdmin] },
    async (req, reply) => {
      const { id: campaignId } = req.params as { id: string }
      const admin = req.user as { sub: string }

      const data = await req.file()
      if (!data) return reply.code(400).send({ success: false, error: 'No file uploaded', data: null })

      const buffer = await data.toBuffer()
      let rows: Record<string, string>[]

      try {
        rows = parse(buffer, { columns: true, skip_empty_lines: true, trim: true })
      } catch {
        return reply.code(400).send({ success: false, error: 'Invalid CSV format', data: null })
      }

      // Fetch existing ranges to check overlaps
      const existing = await prisma.batchMapping.findMany({
        where: { campaign_id: campaignId },
        select: { serial_start: true, serial_end: true },
      })

      const imported: number[] = []
      const errors: { row: number; reason: string }[] = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 2

        const requiredCols = ['serial_start', 'serial_end', 'district_name', 'city', 'province', 'batch_label']
        const missing = requiredCols.filter((c) => !row[c])
        if (missing.length) { errors.push({ row: rowNum, reason: `Missing: ${missing.join(', ')}` }); continue }

        let start: bigint, end: bigint
        try {
          start = BigInt(row.serial_start.trim())
          end = BigInt(row.serial_end.trim())
        } catch {
          errors.push({ row: rowNum, reason: 'serial_start/end must be numeric' }); continue
        }

        if (start >= end) { errors.push({ row: rowNum, reason: 'serial_start must be < serial_end' }); continue }

        // Overlap check
        const overlaps = existing.some(
          (e) => !(end < e.serial_start || start > e.serial_end)
        )
        if (overlaps) { errors.push({ row: rowNum, reason: 'Serial range overlaps existing mapping' }); continue }

        try {
          const created = await prisma.batchMapping.create({
            data: {
              campaign_id: campaignId,
              serial_start: start,
              serial_end: end,
              district_name: row.district_name.trim(),
              city: row.city.trim(),
              province: row.province.trim(),
              batch_label: row.batch_label.trim(),
            },
          })
          existing.push({ serial_start: start, serial_end: end })
          imported.push(created.id)
        } catch {
          errors.push({ row: rowNum, reason: 'DB insert failed' })
        }
      }

      await writeAudit({
        actorId: admin.sub,
        actorType: ActorType.ADMIN,
        eventType: 'BATCHMAP_UPLOAD',
        campaignId,
        payload: { imported: imported.length, rejected: errors.length },
        ip: req.ip,
      })

      return reply.send({
        success: true,
        data: { imported: imported.length, rejected: errors.length, errors },
        error: null,
      })
    }
  )
}
