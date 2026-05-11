import type { Campaign, CampaignSummary, TimeseriesPoint, GeoPoint, VaultStatus, RewardFunnel } from './api'

export const IS_DEMO = true

// ─────────────────────────────────────────────────────────────────────────────
// Campaign list
// ─────────────────────────────────────────────────────────────────────────────
export const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: 'demo-kamen-rider',
    campaign_name: 'Ultra Milk × Kamen Rider: Gotchard',
    ip_holder_name: 'Toei Company',
    game_type: 'KAMEN_RIDER',
    start_date: '2026-02-01T00:00:00Z',
    end_date: '2026-07-31T23:59:59Z',
    status: 'ACTIVE',
    created_at: '2026-01-10T00:00:00Z',
    _count: { redemptions: 47_283, vault: 60_500 },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Ultra Milk × Kamen Rider: Gotchard — full dataset
// ─────────────────────────────────────────────────────────────────────────────

export const KR_SUMMARY: CampaignSummary = {
  total_redemptions: 47_283,
  vault_remaining: 13_217,
  vault_spent_pct: 78.2,
  unique_users: 31_947,
  risk_flagged_count: 38,
  redemptions_by_hour: Array.from({ length: 24 }, (_, i) => ({
    hour: new Date(Date.now() - (23 - i) * 3_600_000).toISOString(),
    count: [
      // Typical consumer pattern: morning ramp, lunch peak, afternoon steady, evening surge
      61, 44, 29, 19, 14, 22, 71, 143, 287, 412, 398, 431,
      389, 367, 401, 445, 467, 489, 521, 478, 401, 334, 241, 143,
    ][i],
  })),
}

export const KR_TIMESERIES: TimeseriesPoint[] = (() => {
  const pts: TimeseriesPoint[] = []
  let cum = 0
  // 90-day arc: slow launch → viral spike (week 3, TV episode tie-in) → plateau → steady grind
  const daily = [
    // Week 1-2: launch ramp
    234, 312, 398, 445, 489, 521, 498,
    534, 567, 589, 612, 634, 645, 623,
    // Week 3: viral spike (special episode dropped)
    712, 834, 1_021, 1_243, 1_456, 1_398, 1_312,
    // Week 4-5: post-spike elevated plateau
    1_198, 1_134, 1_089, 1_045, 1_012, 987, 934,
    912, 889, 867, 845, 834, 812, 798,
    // Week 6-8: natural decay, steady fanbase
    778, 756, 743, 721, 712, 698, 687,
    671, 656, 643, 634, 621, 612, 601,
    589, 578, 567, 556, 548, 537, 521,
    // Week 9-13: current — second content drop boosting numbers
    512, 534, 556, 578, 601, 623, 645,
    667, 689, 712, 734, 756, 778, 801,
    823, 845, 867, 889, 912, 934, 956,
  ]
  for (let i = 0; i < 90; i++) {
    const d = new Date(Date.now() - (89 - i) * 86_400_000)
    cum += daily[i] ?? 500
    pts.push({ timestamp: d.toISOString(), redemption_count: daily[i] ?? 500, cumulative_total: cum })
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

export const KR_MAP_POINTS: MapPoint[] = [
  // ── Jakarta Selatan (kecamatan level) ──────────────────────────────────────
  { district_name: 'Kebayoran Baru',     city: 'Jakarta', province: 'DKI Jakarta',        redemption_count: 3_241, pct_of_total: 6.9, lat: -6.2447, lng: 106.7981 },
  { district_name: 'Setiabudi',          city: 'Jakarta', province: 'DKI Jakarta',        redemption_count: 2_456, pct_of_total: 5.2, lat: -6.2197, lng: 106.8278 },
  { district_name: 'Tebet',              city: 'Jakarta', province: 'DKI Jakarta',        redemption_count: 1_834, pct_of_total: 3.9, lat: -6.2269, lng: 106.8508 },
  { district_name: 'Mampang Prapatan',   city: 'Jakarta', province: 'DKI Jakarta',        redemption_count: 1_234, pct_of_total: 2.6, lat: -6.2519, lng: 106.8258 },
  { district_name: 'Pancoran',           city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   891, pct_of_total: 1.9, lat: -6.2369, lng: 106.8481 },
  { district_name: 'Pasar Minggu',       city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   743, pct_of_total: 1.6, lat: -6.2917, lng: 106.8442 },
  { district_name: 'Cilandak',           city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   567, pct_of_total: 1.2, lat: -6.2939, lng: 106.7983 },
  { district_name: 'Kebayoran Lama',     city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   489, pct_of_total: 1.0, lat: -6.2594, lng: 106.7797 },
  { district_name: 'Jagakarsa',          city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   342, pct_of_total: 0.7, lat: -6.3539, lng: 106.8367 },
  // ── Jakarta Pusat (kecamatan level) ───────────────────────────────────────
  { district_name: 'Menteng',            city: 'Jakarta', province: 'DKI Jakarta',        redemption_count: 2_134, pct_of_total: 4.5, lat: -6.1972, lng: 106.8372 },
  { district_name: 'Tanah Abang',        city: 'Jakarta', province: 'DKI Jakarta',        redemption_count: 1_567, pct_of_total: 3.3, lat: -6.1956, lng: 106.8117 },
  { district_name: 'Gambir',             city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   712, pct_of_total: 1.5, lat: -6.1658, lng: 106.8342 },
  { district_name: 'Senen',              city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   534, pct_of_total: 1.1, lat: -6.1775, lng: 106.8481 },
  { district_name: 'Kemayoran',          city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   478, pct_of_total: 1.0, lat: -6.1606, lng: 106.8600 },
  { district_name: 'Cempaka Putih',      city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   312, pct_of_total: 0.7, lat: -6.1739, lng: 106.8669 },
  // ── Jakarta Barat (kecamatan level) ───────────────────────────────────────
  { district_name: 'Kebon Jeruk',        city: 'Jakarta', province: 'DKI Jakarta',        redemption_count: 2_089, pct_of_total: 4.4, lat: -6.1925, lng: 106.7569 },
  { district_name: 'Grogol Petamburan',  city: 'Jakarta', province: 'DKI Jakarta',        redemption_count: 1_712, pct_of_total: 3.6, lat: -6.1633, lng: 106.7928 },
  { district_name: 'Palmerah',           city: 'Jakarta', province: 'DKI Jakarta',        redemption_count: 1_234, pct_of_total: 2.6, lat: -6.2036, lng: 106.7872 },
  { district_name: 'Tambora',            city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   876, pct_of_total: 1.9, lat: -6.1456, lng: 106.8000 },
  { district_name: 'Cengkareng',         city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   634, pct_of_total: 1.3, lat: -6.1453, lng: 106.7372 },
  { district_name: 'Kembangan',          city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   423, pct_of_total: 0.9, lat: -6.2100, lng: 106.7333 },
  // ── Jakarta Timur (kecamatan level) ───────────────────────────────────────
  { district_name: 'Jatinegara',         city: 'Jakarta', province: 'DKI Jakarta',        redemption_count: 1_456, pct_of_total: 3.1, lat: -6.2153, lng: 106.8736 },
  { district_name: 'Kramat Jati',        city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   978, pct_of_total: 2.1, lat: -6.2714, lng: 106.8681 },
  { district_name: 'Pulo Gadung',        city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   834, pct_of_total: 1.8, lat: -6.1869, lng: 106.8897 },
  { district_name: 'Duren Sawit',        city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   512, pct_of_total: 1.1, lat: -6.2394, lng: 106.9117 },
  { district_name: 'Cakung',             city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   378, pct_of_total: 0.8, lat: -6.1892, lng: 106.9428 },
  { district_name: 'Matraman',           city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   312, pct_of_total: 0.7, lat: -6.2033, lng: 106.8636 },
  // ── Jakarta Utara (kecamatan level) ───────────────────────────────────────
  { district_name: 'Tanjung Priok',      city: 'Jakarta', province: 'DKI Jakarta',        redemption_count: 1_023, pct_of_total: 2.2, lat: -6.1061, lng: 106.8694 },
  { district_name: 'Kelapa Gading',      city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   876, pct_of_total: 1.9, lat: -6.1583, lng: 106.9083 },
  { district_name: 'Penjaringan',        city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   612, pct_of_total: 1.3, lat: -6.1219, lng: 106.8061 },
  { district_name: 'Koja',               city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   389, pct_of_total: 0.8, lat: -6.1219, lng: 106.9019 },
  { district_name: 'Pademangan',         city: 'Jakarta', province: 'DKI Jakarta',        redemption_count:   267, pct_of_total: 0.6, lat: -6.1372, lng: 106.8419 },
  // ── Bodetabek suburbs ─────────────────────────────────────────────────────
  { district_name: 'Ciputat',            city: 'Tangerang Selatan', province: 'Banten',   redemption_count:   987, pct_of_total: 2.1, lat: -6.3175, lng: 106.7447 },
  { district_name: 'Pamulang',           city: 'Tangerang Selatan', province: 'Banten',   redemption_count:   712, pct_of_total: 1.5, lat: -6.3572, lng: 106.7303 },
  { district_name: 'Bekasi Utara',       city: 'Bekasi',            province: 'Jawa Barat', redemption_count: 1_023, pct_of_total: 2.2, lat: -6.2200, lng: 107.0025 },
  { district_name: 'Bekasi Selatan',     city: 'Bekasi',            province: 'Jawa Barat', redemption_count:   634, pct_of_total: 1.3, lat: -6.2750, lng: 107.0072 },
  { district_name: 'Beji',               city: 'Depok',             province: 'Jawa Barat', redemption_count:   934, pct_of_total: 2.0, lat: -6.3706, lng: 106.8278 },
  { district_name: 'Sukmajaya',          city: 'Depok',             province: 'Jawa Barat', redemption_count:   712, pct_of_total: 1.5, lat: -6.3906, lng: 106.8478 },
  { district_name: 'Bogor Tengah',       city: 'Bogor',             province: 'Jawa Barat', redemption_count:   812, pct_of_total: 1.7, lat: -6.5971, lng: 106.8060 },
  // ── Bandung (kecamatan level) ─────────────────────────────────────────────
  { district_name: 'Coblong',            city: 'Bandung', province: 'Jawa Barat',         redemption_count: 1_456, pct_of_total: 3.1, lat: -6.8906, lng: 107.6144 },
  { district_name: 'Kiaracondong',       city: 'Bandung', province: 'Jawa Barat',         redemption_count: 1_123, pct_of_total: 2.4, lat: -6.9383, lng: 107.6503 },
  { district_name: 'Regol',              city: 'Bandung', province: 'Jawa Barat',         redemption_count:   876, pct_of_total: 1.9, lat: -6.9344, lng: 107.6133 },
  { district_name: 'Sumur Bandung',      city: 'Bandung', province: 'Jawa Barat',         redemption_count:   712, pct_of_total: 1.5, lat: -6.9156, lng: 107.6097 },
  { district_name: 'Sukasari',           city: 'Bandung', province: 'Jawa Barat',         redemption_count:   534, pct_of_total: 1.1, lat: -6.8764, lng: 107.5839 },
  { district_name: 'Cicendo',            city: 'Bandung', province: 'Jawa Barat',         redemption_count:   423, pct_of_total: 0.9, lat: -6.8990, lng: 107.6056 },
  // ── Surabaya (kecamatan level) ────────────────────────────────────────────
  { district_name: 'Gubeng',             city: 'Surabaya', province: 'Jawa Timur',        redemption_count: 1_089, pct_of_total: 2.3, lat: -7.2733, lng: 112.7581 },
  { district_name: 'Tegalsari',          city: 'Surabaya', province: 'Jawa Timur',        redemption_count:   878, pct_of_total: 1.9, lat: -7.2700, lng: 112.7336 },
  { district_name: 'Genteng',            city: 'Surabaya', province: 'Jawa Timur',        redemption_count:   743, pct_of_total: 1.6, lat: -7.2617, lng: 112.7419 },
  { district_name: 'Wonokromo',          city: 'Surabaya', province: 'Jawa Timur',        redemption_count:   612, pct_of_total: 1.3, lat: -7.3011, lng: 112.7294 },
  { district_name: 'Sawahan',            city: 'Surabaya', province: 'Jawa Timur',        redemption_count:   489, pct_of_total: 1.0, lat: -7.2781, lng: 112.7258 },
  { district_name: 'Rungkut',            city: 'Surabaya', province: 'Jawa Timur',        redemption_count:   378, pct_of_total: 0.8, lat: -7.3281, lng: 112.7872 },
  // ── Other Java ────────────────────────────────────────────────────────────
  { district_name: 'Semarang Tengah',    city: 'Semarang',  province: 'Jawa Tengah',      redemption_count: 1_234, pct_of_total: 2.6, lat: -6.9932, lng: 110.4203 },
  { district_name: 'Banyumanik',         city: 'Semarang',  province: 'Jawa Tengah',      redemption_count:   712, pct_of_total: 1.5, lat: -7.0694, lng: 110.4283 },
  { district_name: 'Yogyakarta Kota',    city: 'Yogyakarta', province: 'DI Yogyakarta',   redemption_count: 1_623, pct_of_total: 3.4, lat: -7.7972, lng: 110.3688 },
  { district_name: 'Malang Kota',        city: 'Malang',    province: 'Jawa Timur',       redemption_count: 1_234, pct_of_total: 2.6, lat: -7.9797, lng: 112.6304 },
  { district_name: 'Solo Kota',          city: 'Surakarta', province: 'Jawa Tengah',      redemption_count:   876, pct_of_total: 1.9, lat: -7.5755, lng: 110.8243 },
  // ── Sumatra ───────────────────────────────────────────────────────────────
  { district_name: 'Medan Kota',         city: 'Medan',     province: 'Sumatera Utara',   redemption_count: 2_198, pct_of_total: 4.6, lat: 3.5952,  lng: 98.6722  },
  { district_name: 'Medan Baru',         city: 'Medan',     province: 'Sumatera Utara',   redemption_count:   734, pct_of_total: 1.6, lat: 3.5706,  lng: 98.6661  },
  { district_name: 'Palembang Ilir',     city: 'Palembang', province: 'Sumatera Selatan', redemption_count:   987, pct_of_total: 2.1, lat: -2.9761, lng: 104.7754  },
  { district_name: 'Pekanbaru Kota',     city: 'Pekanbaru', province: 'Riau',             redemption_count:   634, pct_of_total: 1.3, lat: 0.5071,  lng: 101.4478  },
  // ── Sulawesi ──────────────────────────────────────────────────────────────
  { district_name: 'Makassar Ujung Pandang', city: 'Makassar', province: 'Sulawesi Selatan', redemption_count: 1_023, pct_of_total: 2.2, lat: -5.1321, lng: 119.4124 },
  { district_name: 'Makassar Tamalanrea',    city: 'Makassar', province: 'Sulawesi Selatan', redemption_count:   534, pct_of_total: 1.1, lat: -5.1214, lng: 119.4889 },
  { district_name: 'Manado Tengah',          city: 'Manado',   province: 'Sulawesi Utara',   redemption_count:   312, pct_of_total: 0.7, lat: 1.4748,  lng: 124.8421 },
  // ── Bali ──────────────────────────────────────────────────────────────────
  { district_name: 'Denpasar Selatan',   city: 'Denpasar',   province: 'Bali',             redemption_count:   743, pct_of_total: 1.6, lat: -8.6705, lng: 115.2126 },
  // ── Kalimantan ────────────────────────────────────────────────────────────
  { district_name: 'Balikpapan Tengah',  city: 'Balikpapan', province: 'Kalimantan Timur', redemption_count:   589, pct_of_total: 1.2, lat: -1.2654, lng: 116.8312 },
  { district_name: 'Banjarmasin Utara',  city: 'Banjarmasin', province: 'Kalimantan Selatan', redemption_count: 478, pct_of_total: 1.0, lat: -3.3194, lng: 114.5908 },
  { district_name: 'Pontianak Kota',     city: 'Pontianak',  province: 'Kalimantan Barat', redemption_count:   412, pct_of_total: 0.9, lat: -0.0263, lng: 109.3425 },
  { district_name: 'Samarinda Ulu',      city: 'Samarinda',  province: 'Kalimantan Timur', redemption_count:   378, pct_of_total: 0.8, lat: -0.5016, lng: 117.1537 },
  // ── Eastern Indonesia ─────────────────────────────────────────────────────
  { district_name: 'Kupang Kota',        city: 'Kupang',     province: 'Nusa Tenggara Timur', redemption_count: 198, pct_of_total: 0.4, lat: -10.1772, lng: 123.6070 },
  { district_name: 'Jayapura Kota',      city: 'Jayapura',   province: 'Papua',            redemption_count:   143, pct_of_total: 0.3, lat: -2.5337, lng: 140.7181 },
]

export const KR_GEO: GeoPoint[] = KR_MAP_POINTS.map(({ lat: _lat, lng: _lng, ...rest }) => rest)

export const KR_VAULT: VaultStatus = {
  STANDARD: { total: 50_000, spent: 42_847, remaining: 7_153 },
  TIER_1:   { total:  5_000, spent:  4_100, remaining:   900 },
  TIER_2:   { total:  3_000, spent:  1_987, remaining: 1_013 },
  TIER_3:   { total:  1_500, spent:    312, remaining: 1_188 },
  VARIETY:  { total:  1_000, spent:     89, remaining:   911 },
}

export const KR_FUNNEL: RewardFunnel = {
  tier1_unlocked: 4_100,
  tier2_unlocked: 1_987,
  tier3_unlocked: 312,
  variety_unlocked: 89,
  users_with_1plus_scan: 31_947,
  conversion_rates: {
    t0_to_t1: 12.8,   // 4100 / 31947
    t1_to_t2: 48.5,   // 1987 / 4100
    t2_to_t3: 15.7,   // 312  / 1987
    variety_completion: 0.3, // 89 / 31947
  },
  sku_distribution: {
    'BC – Gotchard Edition': 19_847,
    'SB – Geats Edition':    16_234,
    'FC – Build Edition':    11_202,
  },
  lucky_draw_total_entries: 47_283,
  lucky_draw_unique_participants: 28_412,
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic fallback data (used when a demo campaign has no specific dataset)
// ─────────────────────────────────────────────────────────────────────────────

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
  TIER_1:   { total:  2_000, spent:   421, remaining: 1_579 },
  TIER_2:   { total:  1_500, spent:   287, remaining: 1_213 },
  TIER_3:   { total:  1_000, spent:    98, remaining:   902 },
  VARIETY:  { total:    500, spent:    13, remaining:   487 },
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
    'FC – Full Cream':   968,
  },
  lucky_draw_total_entries: 4_231,
  lucky_draw_unique_participants: 2_847,
}
