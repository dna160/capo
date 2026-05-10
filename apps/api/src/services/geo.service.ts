import { prisma } from '../lib/prisma.js'

// SKU prefix → code mapping
const SKU_PREFIXES: Record<string, string> = {
  'BC-': 'SKU_BC',
  'SB-': 'SKU_SB',
  'FC-': 'SKU_FC',
}

const SKU_LABELS: Record<string, string> = {
  SKU_BC: 'Battle Choco',
  SKU_SB: 'Strawberry Blast',
  SKU_FC: 'Full Cream Finisher',
}

export function resolveSku(cartonUid: string): string | null {
  for (const [prefix, sku] of Object.entries(SKU_PREFIXES)) {
    if (cartonUid.startsWith(prefix)) return sku
  }
  return null
}

export function skuLabel(skuCode: string): string {
  return SKU_LABELS[skuCode] ?? skuCode
}

export function extractSerial(cartonUid: string): bigint | null {
  // Serial is numeric portion after the prefix (e.g. BC-000123456 → 123456)
  const parts = cartonUid.split('-')
  if (parts.length < 2) return null
  const numeric = parts.slice(1).join('')
  const n = BigInt(numeric.replace(/\D/g, '') || '0')
  return n
}

export async function resolveDistrict(
  campaignId: string,
  cartonUid: string
): Promise<{ district_name: string; city: string; province: string; batch_id: string } | null> {
  const serial = extractSerial(cartonUid)
  if (serial === null) return null

  const mapping = await prisma.batchMapping.findFirst({
    where: {
      campaign_id: campaignId,
      serial_start: { lte: serial },
      serial_end: { gte: serial },
    },
  })

  if (!mapping) return null

  return {
    district_name: mapping.district_name,
    city: mapping.city,
    province: mapping.province,
    batch_id: mapping.batch_label,
  }
}
