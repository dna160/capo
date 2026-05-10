import { prisma } from '../lib/prisma.js'
import { decryptCode } from '../lib/crypto.js'
import { RewardTier } from '@prisma/client'

export async function atomicSpendCode(
  campaignId: string,
  tier: RewardTier = RewardTier.STANDARD
): Promise<{ vaultId: string; plainCode: string } | null> {
  // SELECT FOR UPDATE + UPDATE in a single transaction — zero duplicate issuance
  return prisma.$transaction(async (tx) => {
    const vault = await tx.$queryRaw<{ id: string; game_code: string }[]>`
      SELECT id, game_code
      FROM "CodeVault"
      WHERE campaign_id = ${campaignId}
        AND reward_tier = ${tier}::"RewardTier"
        AND is_spent = false
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `

    if (!vault.length) return null

    const row = vault[0]
    await tx.codeVault.update({
      where: { id: row.id },
      data: { is_spent: true, spent_at: new Date() },
    })

    return { vaultId: row.id, plainCode: decryptCode(row.game_code) }
  })
}

export async function getVaultStatus(campaignId: string) {
  const rows = await prisma.codeVault.groupBy({
    by: ['reward_tier'],
    where: { campaign_id: campaignId },
    _count: { id: true },
    _sum: { is_spent: true } as never,
  })

  const tiers = Object.values(RewardTier)
  const result: Record<string, { total: number; spent: number; remaining: number }> = {}

  for (const tier of tiers) {
    result[tier] = { total: 0, spent: 0, remaining: 0 }
  }

  // Compute per tier via raw query for accuracy
  for (const tier of tiers) {
    const [total, spent] = await Promise.all([
      prisma.codeVault.count({ where: { campaign_id: campaignId, reward_tier: tier } }),
      prisma.codeVault.count({ where: { campaign_id: campaignId, reward_tier: tier, is_spent: true } }),
    ])
    result[tier] = { total, spent, remaining: total - spent }
  }

  return result
}
