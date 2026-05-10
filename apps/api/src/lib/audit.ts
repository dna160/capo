import { prisma } from './prisma.js'
import { hashIp } from './crypto.js'
import { ActorType, Prisma } from '@prisma/client'

interface AuditPayload {
  actorId: string
  actorType: ActorType
  eventType: string
  campaignId?: string
  payload: Record<string, unknown>
  ip: string
}

export async function writeAudit(data: AuditPayload): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actor_id: data.actorId,
      actor_type: data.actorType,
      event_type: data.eventType,
      campaign_id: data.campaignId,
      payload: data.payload as Prisma.InputJsonValue,
      ip_address: hashIp(data.ip),
    },
  })
}
