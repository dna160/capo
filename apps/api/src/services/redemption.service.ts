import { prisma } from '../lib/prisma.js'
import { encryptCode } from '../lib/crypto.js'
import { atomicSpendCode } from './vault.service.js'
import { resolveDistrict, resolveSku, skuLabel } from './geo.service.js'
import { writeAudit } from '../lib/audit.js'
import { RewardTier, ActorType } from '@prisma/client'

interface RedeemInput {
  campaignId: string
  cartonUid: string
  userId: string
  fingerprintHash: string
  ip: string
}

interface TierRewardResult {
  tier: RewardTier
  game_code: string
}

interface RedeemResult {
  game_code: string
  district_resolved: string
  campaign_name: string
  sku_resolved: string
  tier_rewards_issued: TierRewardResult[]
  variety_reward_issued: { game_code: string } | null
  lucky_draw_entries_total: number
  progress: {
    total_scans: number
    tier1_rewarded: boolean
    tier2_rewarded: boolean
    tier3_rewarded: boolean
    variety_rewarded: boolean
    scanned_skus: string[]
  }
}

export async function processRedemption(input: RedeemInput): Promise<RedeemResult> {
  const { campaignId, cartonUid, userId, fingerprintHash, ip } = input

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { rewardConfig: true },
  })

  if (!campaign) throw Object.assign(new Error('Campaign not found'), { statusCode: 404 })
  if (campaign.status !== 'ACTIVE') throw Object.assign(new Error('Campaign inactive'), { statusCode: 410 })

  const now = new Date()
  if (now < campaign.start_date || now > campaign.end_date) {
    throw Object.assign(new Error('Campaign outside date window'), { statusCode: 410 })
  }

  // Idempotency: already redeemed?
  const existing = await prisma.redemption.findUnique({ where: { carton_uid: cartonUid } })
  if (existing) throw Object.assign(new Error('Carton already redeemed'), { statusCode: 409 })

  // Per-user limit check
  const userRedemptions = await prisma.redemption.count({
    where: { campaign_id: campaignId, user_id: userId },
  })
  if (userRedemptions >= campaign.max_per_user) {
    throw Object.assign(new Error('User redemption limit reached'), { statusCode: 422 })
  }

  // Resolve geography
  const geo = await resolveDistrict(campaignId, cartonUid)
  if (!geo) throw Object.assign(new Error('Serial not mapped to district'), { statusCode: 422 })

  // Resolve SKU
  const skuCode = resolveSku(cartonUid)
  if (!skuCode) throw Object.assign(new Error('Unknown SKU prefix'), { statusCode: 422 })

  // Atomic: spend one STANDARD code
  const spentCode = await atomicSpendCode(campaignId, RewardTier.STANDARD)
  if (!spentCode) throw Object.assign(new Error('Vault exhausted'), { statusCode: 503 })

  // Write redemption record
  const redemption = await prisma.redemption.create({
    data: {
      campaign_id: campaignId,
      carton_uid: cartonUid,
      user_id: userId,
      fingerprint_hash: fingerprintHash,
      ip_code_issued: encryptCode(spentCode.plainCode),
      batch_id: geo.batch_id,
      district_name: geo.district_name,
      city: geo.city,
      sku_code: skuCode,
    },
  })

  await prisma.codeVault.update({
    where: { id: spentCode.vaultId },
    data: { assigned_to: redemption.id },
  })

  // ── Addendum A: Multi-track evaluation ───────────────────────────────────────
  const tierRewardsIssued: TierRewardResult[] = []
  let varietyRewardIssued: { game_code: string } | null = null

  const rewardConfig = campaign.rewardConfig

  // Upsert progress
  const progress = await prisma.userCampaignProgress.upsert({
    where: { campaign_id_user_id: { campaign_id: campaignId, user_id: userId } },
    create: {
      campaign_id: campaignId,
      user_id: userId,
      total_scans: 1,
      scanned_skus: [skuCode],
      lucky_draw_entries: rewardConfig?.lucky_draw_enabled ? 1 : 0,
    },
    update: {
      total_scans: { increment: 1 },
      scanned_skus: { push: skuCode },
      lucky_draw_entries: rewardConfig?.lucky_draw_enabled ? { increment: 1 } : undefined,
    },
  })

  // De-duplicate scanned_skus (Prisma push may add duplicates)
  const uniqueSkus = [...new Set(progress.scanned_skus)]
  if (uniqueSkus.length !== progress.scanned_skus.length) {
    await prisma.userCampaignProgress.update({
      where: { id: progress.id },
      data: { scanned_skus: uniqueSkus },
    })
    progress.scanned_skus = uniqueSkus
  }

  if (rewardConfig) {
    // Tier evaluation
    const tierMap: [number, boolean, RewardTier][] = [
      [rewardConfig.tier1_threshold, progress.tier1_rewarded, RewardTier.TIER_1],
      [rewardConfig.tier2_threshold, progress.tier2_rewarded, RewardTier.TIER_2],
      [rewardConfig.tier3_threshold, progress.tier3_rewarded, RewardTier.TIER_3],
    ]

    for (const [threshold, alreadyRewarded, tier] of tierMap) {
      if (!alreadyRewarded && progress.total_scans >= threshold) {
        const tierCode = await atomicSpendCode(campaignId, tier)
        if (tierCode) {
          await prisma.tierRewardIssuance.create({
            data: {
              campaign_id: campaignId,
              user_id: userId,
              tier,
              code_vault_id: tierCode.vaultId,
              trigger_scan_count: progress.total_scans,
              trigger_redemption_id: redemption.id,
            },
          })
          const field = tier === 'TIER_1' ? 'tier1_rewarded'
            : tier === 'TIER_2' ? 'tier2_rewarded'
            : 'tier3_rewarded'
          await prisma.userCampaignProgress.update({
            where: { id: progress.id },
            data: { [field]: true },
          })
          tierRewardsIssued.push({ tier, game_code: tierCode.plainCode })
        } else {
          await writeAudit({
            actorId: userId,
            actorType: ActorType.SYSTEM,
            eventType: 'TIER_VAULT_EXHAUSTED',
            campaignId,
            payload: { tier, user_id: userId },
            ip,
          })
        }
      }
    }

    // Variety track
    const allVarietySkus = rewardConfig.variety_skus_required
    const hasAllSkus = allVarietySkus.every((s) => uniqueSkus.includes(s))
    if (!progress.variety_rewarded && hasAllSkus) {
      const varietyCode = await atomicSpendCode(campaignId, RewardTier.VARIETY)
      if (varietyCode) {
        await prisma.tierRewardIssuance.create({
          data: {
            campaign_id: campaignId,
            user_id: userId,
            tier: RewardTier.VARIETY,
            code_vault_id: varietyCode.vaultId,
            trigger_scan_count: progress.total_scans,
            trigger_redemption_id: redemption.id,
          },
        })
        await prisma.userCampaignProgress.update({
          where: { id: progress.id },
          data: { variety_rewarded: true },
        })
        varietyRewardIssued = { game_code: varietyCode.plainCode }
      }
    }

    // Lucky draw entry
    if (rewardConfig.lucky_draw_enabled) {
      const entryNumber = progress.lucky_draw_entries
      await prisma.luckyDrawEntry.create({
        data: {
          campaign_id: campaignId,
          user_id: userId,
          redemption_id: redemption.id,
          sku_code: skuCode,
          entry_number: entryNumber,
        },
      })
    }
  }

  await writeAudit({
    actorId: userId,
    actorType: ActorType.CONSUMER,
    eventType: 'REDEEM_SUCCESS',
    campaignId,
    payload: {
      carton_uid: cartonUid,
      district: geo.district_name,
      sku: skuCode,
      tier_rewards: tierRewardsIssued.map((t) => t.tier),
      variety_reward: !!varietyRewardIssued,
    },
    ip,
  })

  const freshProgress = await prisma.userCampaignProgress.findUnique({
    where: { campaign_id_user_id: { campaign_id: campaignId, user_id: userId } },
  })

  return {
    game_code: spentCode.plainCode,
    district_resolved: geo.district_name,
    campaign_name: campaign.campaign_name,
    sku_resolved: skuLabel(skuCode),
    tier_rewards_issued: tierRewardsIssued,
    variety_reward_issued: varietyRewardIssued,
    lucky_draw_entries_total: freshProgress?.lucky_draw_entries ?? 0,
    progress: {
      total_scans: freshProgress?.total_scans ?? 1,
      tier1_rewarded: freshProgress?.tier1_rewarded ?? false,
      tier2_rewarded: freshProgress?.tier2_rewarded ?? false,
      tier3_rewarded: freshProgress?.tier3_rewarded ?? false,
      variety_rewarded: freshProgress?.variety_rewarded ?? false,
      scanned_skus: freshProgress?.scanned_skus ?? [skuCode],
    },
  }
}
