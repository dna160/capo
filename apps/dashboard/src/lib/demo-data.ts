import type { Campaign, CampaignSummary, TimeseriesPoint, GeoPoint, VaultStatus, RewardFunnel } from './api'

export const IS_DEMO = true

export const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: 'demo-genshin-q1',
    campaign_name: 'Ultra Milk × Genshin Impact Q1 2026',
    ip_holder_name: 'HoYoverse',
    game_type: 'GENSHIN',
    start_date: '2026-01-01T00:00:00Z',
    end_date: '2026-03-31T23:59:59Z',
    status: 'COMPLETED',
    created_at: '2025-12-15T00:00:00Z',
    _count: { redemptions: 18_432, vault: 25_000 },
  },
  {
    id: 'demo-wuwa-launch',
    campaign_name: 'Ultra Milk × Wuthering Waves Launch',
    ip_holder_name: 'Kuro Games',
    game_type: 'WUWA',
    start_date: '2026-04-15T00:00:00Z',
    end_date: '2026-06-30T23:59:59Z',
    status: 'ACTIVE',
    created_at: '2026-04-01T00:00:00Z',
    _count: { redemptions: 4_231, vault: 15_000 },
  },
  {
    id: 'demo-mh-wilds',
    campaign_name: 'Ultra Milk × Monster Hunter Wilds',
    ip_holder_name: 'Capcom',
    game_type: 'MONSTER_HUNTER',
    start_date: '2026-07-01T00:00:00Z',
    end_date: '2026-09-30T23:59:59Z',
    status: 'DRAFT',
    created_at: '2026-06-01T00:00:00Z',
    _count: { redemptions: 0, vault: 0 },
  },
]

export const DEMO_SUMMARY: CampaignSummary = {
  total_redemptions: 4_231,
  vault_remaining: 10_769,
  vault_spent_pct: 28.2,
  unique_users: 3_891,
  risk_flagged_count: 14,
  redemptions_by_hour: Array.from({ length: 24 }, (_, i) => ({
    hour: new Date(Date.now() - (23 - i) * 3_600_000).toISOString(),
    count: [42, 28, 18, 12, 9, 14, 38, 76, 124, 198, 187, 201, 175, 163, 178, 201, 212, 198, 167, 143, 121, 96, 74, 53][i],
  })),
}

export const DEMO_TIMESERIES: TimeseriesPoint[] = (() => {
  const pts: TimeseriesPoint[] = []
  let cum = 0
  const velocity = [12, 18, 22, 31, 45, 67, 89, 112, 134, 98, 121, 145, 167, 189, 201, 178, 156, 143, 167, 189, 201, 198, 212, 178, 154, 132, 145, 167, 189, 198]
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    const daily = velocity[29 - i] * (1 + Math.sin(i * 0.3) * 0.2) | 0
    cum += daily
    pts.push({ timestamp: d.toISOString(), redemption_count: daily, cumulative_total: cum })
  }
  return pts
})()

export interface MapPoint {
  district_name: string
  city: string
  province: string
  redemption_count: number
  pct_of_total: number
  lat: number
  lng: number
}

export const DEMO_MAP_POINTS: MapPoint[] = [
  { district_name: 'Jakarta Pusat', city: 'Jakarta', province: 'DKI Jakarta', redemption_count: 1_842, pct_of_total: 43.5, lat: -6.1751, lng: 106.8650 },
  { district_name: 'Bandung Kota', city: 'Bandung', province: 'Jawa Barat', redemption_count: 621, pct_of_total: 14.7, lat: -6.9175, lng: 107.6191 },
  { district_name: 'Surabaya Barat', city: 'Surabaya', province: 'Jawa Timur', redemption_count: 534, pct_of_total: 12.6, lat: -7.2575, lng: 112.7521 },
  { district_name: 'Medan Kota', city: 'Medan', province: 'Sumatera Utara', redemption_count: 287, pct_of_total: 6.8, lat: 3.5952, lng: 98.6722 },
  { district_name: 'Semarang Tengah', city: 'Semarang', province: 'Jawa Tengah', redemption_count: 243, pct_of_total: 5.7, lat: -6.9932, lng: 110.4203 },
  { district_name: 'Makassar Timur', city: 'Makassar', province: 'Sulawesi Selatan', redemption_count: 198, pct_of_total: 4.7, lat: -5.1477, lng: 119.4327 },
  { district_name: 'Yogyakarta', city: 'Yogyakarta', province: 'DI Yogyakarta', redemption_count: 156, pct_of_total: 3.7, lat: -7.7972, lng: 110.3688 },
  { district_name: 'Malang Kota', city: 'Malang', province: 'Jawa Timur', redemption_count: 134, pct_of_total: 3.2, lat: -7.9797, lng: 112.6304 },
  { district_name: 'Palembang Ilir', city: 'Palembang', province: 'Sumatera Selatan', redemption_count: 112, pct_of_total: 2.6, lat: -2.9761, lng: 104.7754 },
  { district_name: 'Tangerang Kota', city: 'Tangerang', province: 'Banten', redemption_count: 104, pct_of_total: 2.5, lat: -6.1702, lng: 106.6402 },
  { district_name: 'Depok', city: 'Depok', province: 'Jawa Barat', redemption_count: 89, pct_of_total: 2.1, lat: -6.4025, lng: 106.7942 },
  { district_name: 'Bekasi Barat', city: 'Bekasi', province: 'Jawa Barat', redemption_count: 76, pct_of_total: 1.8, lat: -6.2383, lng: 107.0 },
  { district_name: 'Solo Kota', city: 'Surakarta', province: 'Jawa Tengah', redemption_count: 54, pct_of_total: 1.3, lat: -7.5755, lng: 110.8243 },
  { district_name: 'Bogor Kota', city: 'Bogor', province: 'Jawa Barat', redemption_count: 48, pct_of_total: 1.1, lat: -6.5971, lng: 106.806 },
  { district_name: 'Balikpapan Tengah', city: 'Balikpapan', province: 'Kalimantan Timur', redemption_count: 39, pct_of_total: 0.9, lat: -1.2654, lng: 116.8312 },
  { district_name: 'Denpasar Selatan', city: 'Denpasar', province: 'Bali', redemption_count: 32, pct_of_total: 0.8, lat: -8.6705, lng: 115.2126 },
  { district_name: 'Pontianak Kota', city: 'Pontianak', province: 'Kalimantan Barat', redemption_count: 21, pct_of_total: 0.5, lat: -0.0263, lng: 109.3425 },
  { district_name: 'Manado Tengah', city: 'Manado', province: 'Sulawesi Utara', redemption_count: 18, pct_of_total: 0.4, lat: 1.4748, lng: 124.8421 },
]

export const DEMO_GEO: GeoPoint[] = DEMO_MAP_POINTS.map(({ lat: _lat, lng: _lng, ...rest }) => rest)

export const DEMO_VAULT: VaultStatus = {
  STANDARD: { total: 10_000, spent: 3_412, remaining: 6_588 },
  TIER_1: { total: 2_000, spent: 421, remaining: 1_579 },
  TIER_2: { total: 1_500, spent: 287, remaining: 1_213 },
  TIER_3: { total: 1_000, spent: 98, remaining: 902 },
  VARIETY: { total: 500, spent: 13, remaining: 487 },
}

export const DEMO_FUNNEL: RewardFunnel = {
  tier1_unlocked: 421,
  tier2_unlocked: 287,
  tier3_unlocked: 98,
  variety_unlocked: 13,
  users_with_1plus_scan: 3_891,
  conversion_rates: {
    t0_to_t1: 10.8,
    t1_to_t2: 68.2,
    t2_to_t3: 34.1,
    variety_completion: 3.3,
  },
  sku_distribution: {
    'BC – Karton Biru': 1_842,
    'SB – Susu Botol': 1_421,
    'FC – Full Cream': 968,
  },
  lucky_draw_total_entries: 4_231,
  lucky_draw_unique_participants: 2_847,
}
