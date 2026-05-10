import type { FastifyInstance } from 'fastify'
import { parse } from 'csv-parse/sync'
import { prisma } from '../../lib/prisma.js'
import { encryptCode } from '../../lib/crypto.js'
import { getVaultStatus } from '../../services/vault.service.js'
import { writeAudit } from '../../lib/audit.js'
import { ActorType, RewardTier } from '@prisma/client'

const VALID_REWARD_TIERS = Object.values(RewardTier)

export async function vaultAdminRoutes(app: FastifyInstance) {
  app.post(
    '/admin/campaigns/:id/vault/upload',
    { onRequest: [app.authenticateAdmin] },
    async (req, reply) => {
      const { id: campaignId } = req.params as { id: string }
      const admin = req.user as { sub: string }

      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
      if (!campaign) return reply.code(404).send({ success: false, error: 'Campaign not found', data: null })

      const data = await req.file()
      if (!data) return reply.code(400).send({ success: false, error: 'No file uploaded', data: null })

      const buffer = await data.toBuffer()
      let rows: Record<string, string>[]

      try {
        rows = parse(buffer, { columns: true, skip_empty_lines: true, trim: true })
      } catch {
        return reply.code(400).send({ success: false, error: 'Invalid CSV format', data: null })
      }

      const imported: string[] = []
      const errors: { row: number; reason: string }[] = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 2 // 1-indexed + header

        const rawCode = row.game_code?.trim()
        const rawTier = (row.reward_tier?.trim() || 'STANDARD').toUpperCase() as RewardTier

        if (!rawCode) { errors.push({ row: rowNum, reason: 'Missing game_code' }); continue }
        if (!VALID_REWARD_TIERS.includes(rawTier)) {
          errors.push({ row: rowNum, reason: `Invalid reward_tier: ${rawTier}` }); continue
        }

        // Check for duplicate within existing vault
        const exists = await prisma.codeVault.findUnique({ where: { game_code: encryptCode(rawCode) } })
        if (exists) { errors.push({ row: rowNum, reason: 'Duplicate code' }); continue }

        try {
          await prisma.codeVault.create({
            data: {
              campaign_id: campaignId,
              game_code: encryptCode(rawCode),
              reward_tier: rawTier,
            },
          })
          imported.push(rawCode)
        } catch {
          errors.push({ row: rowNum, reason: 'DB insert failed' })
        }
      }

      await writeAudit({
        actorId: admin.sub,
        actorType: ActorType.ADMIN,
        eventType: 'VAULT_UPLOAD',
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

  app.get(
    '/admin/campaigns/:id/vault/status',
    { onRequest: [app.authenticateAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string }
      const status = await getVaultStatus(id)
      return reply.send({ success: true, data: status, error: null })
    }
  )
}
