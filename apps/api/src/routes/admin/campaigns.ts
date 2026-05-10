import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { writeAudit } from '../../lib/audit.js'
import { ActorType, CampaignStatus } from '@prisma/client'

const createCampaignBody = z.object({
  campaign_name: z.string().min(1),
  ip_holder_name: z.string().min(1),
  game_type: z.enum(['GENSHIN', 'WUWA', 'MONSTER_HUNTER']),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  max_per_user: z.number().int().positive().default(1),
  vault_watermark: z.number().int().positive().default(500),
})

const VALID_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['PAUSED', 'COMPLETED'],
  PAUSED: ['ACTIVE', 'COMPLETED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [],
}

export async function campaignAdminRoutes(app: FastifyInstance) {
  // GET all campaigns
  app.get('/admin/campaigns', { onRequest: [app.authenticateAdmin] }, async (req, reply) => {
    const admin = req.user as { sub: string; role: string }
    const campaigns = await prisma.campaign.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        campaign_name: true,
        ip_holder_name: true,
        game_type: true,
        start_date: true,
        end_date: true,
        status: true,
        created_at: true,
        _count: { select: { redemptions: true, vault: true } },
      },
    })
    return reply.send({ success: true, data: campaigns, error: null })
  })

  // GET single campaign
  app.get('/admin/campaigns/:id', { onRequest: [app.authenticateAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { rewardConfig: true },
    })
    if (!campaign) return reply.code(404).send({ success: false, error: 'Campaign not found', data: null })
    return reply.send({ success: true, data: campaign, error: null })
  })

  // POST create campaign
  app.post('/admin/campaigns', { onRequest: [app.authenticateAdmin] }, async (req, reply) => {
    const body = createCampaignBody.safeParse(req.body)
    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message, data: null })
    }

    const admin = req.user as { sub: string }
    const campaign = await prisma.campaign.create({ data: body.data })

    await writeAudit({
      actorId: admin.sub,
      actorType: ActorType.ADMIN,
      eventType: 'CAMPAIGN_CREATED',
      campaignId: campaign.id,
      payload: body.data,
      ip: req.ip,
    })

    return reply.code(201).send({ success: true, data: { campaign_id: campaign.id }, error: null })
  })

  // PATCH update status
  app.patch('/admin/campaigns/:id/status', { onRequest: [app.authenticateAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { status } = req.body as { status: CampaignStatus }
    const admin = req.user as { sub: string }

    const campaign = await prisma.campaign.findUnique({ where: { id } })
    if (!campaign) return reply.code(404).send({ success: false, error: 'Campaign not found', data: null })

    const allowed = VALID_TRANSITIONS[campaign.status]
    if (!allowed.includes(status)) {
      return reply.code(409).send({
        success: false,
        error: `Invalid transition: ${campaign.status} → ${status}`,
        data: null,
      })
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status },
    })

    // Lock reward config when going ACTIVE
    if (status === 'ACTIVE') {
      await prisma.campaignRewardConfig.updateMany({
        where: { campaign_id: id, locked_at: null },
        data: { locked_at: new Date() },
      })
    }

    await writeAudit({
      actorId: admin.sub,
      actorType: ActorType.ADMIN,
      eventType: 'CAMPAIGN_STATUS_CHANGED',
      campaignId: id,
      payload: { from: campaign.status, to: status },
      ip: req.ip,
    })

    return reply.send({ success: true, data: { status: updated.status }, error: null })
  })

  // POST reward config
  app.post('/admin/campaigns/:id/reward-config', { onRequest: [app.authenticateAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const existing = await prisma.campaignRewardConfig.findUnique({ where: { campaign_id: id } })
    if (existing?.locked_at) {
      return reply.code(423).send({ success: false, error: 'Reward config is locked (campaign is ACTIVE)', data: null })
    }

    const schema = z.object({
      tier1_threshold: z.number().int().positive(),
      tier2_threshold: z.number().int().positive(),
      tier3_threshold: z.number().int().positive(),
      variety_skus_required: z.array(z.string()).min(1),
      lucky_draw_enabled: z.boolean().default(true),
      lucky_draw_prize_label: z.string().optional(),
    }).refine((d) => d.tier1_threshold < d.tier2_threshold && d.tier2_threshold < d.tier3_threshold, {
      message: 'Tier thresholds must be ascending',
    })

    const body = schema.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ success: false, error: body.error.issues[0]?.message, data: null })

    const config = await prisma.campaignRewardConfig.upsert({
      where: { campaign_id: id },
      create: { campaign_id: id, ...body.data },
      update: body.data,
    })

    return reply.send({ success: true, data: config, error: null })
  })
}
