'use client'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('dash_jwt')
}

export function setToken(token: string) {
  localStorage.setItem('dash_jwt', token)
}

export function clearToken() {
  localStorage.removeItem('dash_jwt')
  localStorage.removeItem('dash_admin')
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T | null; error: string | null }> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok && res.status === 401) {
    clearToken()
    window.location.href = '/login'
  }
  if (options.headers && (options.headers as Record<string, string>)['Accept'] === 'text/csv') {
    const text = await res.text()
    return { success: true, data: text as unknown as T, error: null }
  }
  return res.json()
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ jwt: string; admin_id: string; role: string; display_name: string }>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
}

// ── Campaigns ─────────────────────────────────────────────────────────────────
export const campaignsApi = {
  list: () => apiFetch<Campaign[]>('/admin/campaigns'),
  get: (id: string) => apiFetch<CampaignDetail>(`/admin/campaigns/${id}`),
  create: (data: CreateCampaignInput) =>
    apiFetch<{ campaign_id: string }>('/admin/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  setStatus: (id: string, status: string) =>
    apiFetch<{ status: string }>(`/admin/campaigns/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  setRewardConfig: (id: string, data: RewardConfigInput) =>
    apiFetch(`/admin/campaigns/${id}/reward-config`, { method: 'POST', body: JSON.stringify(data) }),
}

// ── Vault ─────────────────────────────────────────────────────────────────────
export const vaultApi = {
  uploadCsv: (campaignId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiFetch<UploadResult>(`/admin/campaigns/${campaignId}/vault/upload`, {
      method: 'POST',
      body: form,
      headers: {},
    })
  },
  status: (campaignId: string) => apiFetch<VaultStatus>(`/admin/campaigns/${campaignId}/vault/status`),
}

// ── Batch Map ─────────────────────────────────────────────────────────────────
export const batchmapApi = {
  upload: (campaignId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiFetch<UploadResult>(`/admin/campaigns/${campaignId}/batchmap/upload`, {
      method: 'POST',
      body: form,
      headers: {},
    })
  },
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  summary: (id: string) => apiFetch<CampaignSummary>(`/dashboard/campaigns/${id}/summary`),
  timeseries: (id: string, granularity: string = 'day') =>
    apiFetch<TimeseriesPoint[]>(`/dashboard/campaigns/${id}/timeseries?granularity=${granularity}`),
  geo: (id: string) => apiFetch<GeoPoint[]>(`/dashboard/campaigns/${id}/geo`),
  rewardFunnel: (id: string) => apiFetch<RewardFunnel>(`/dashboard/campaigns/${id}/reward-funnel`),
  exportCsv: (id: string) =>
    apiFetch<string>(`/dashboard/campaigns/${id}/export`, { headers: { Accept: 'text/csv' } }),
}

// ── Lucky Draw ────────────────────────────────────────────────────────────────
export const luckyDrawApi = {
  execute: (id: string, numWinners: number, prizeLabel: string) =>
    apiFetch(`/admin/campaigns/${id}/lucky-draw/execute`, {
      method: 'POST',
      body: JSON.stringify({ num_winners: numWinners, prize_label: prizeLabel }),
    }),
  entries: (id: string, page: number = 1) =>
    apiFetch<DrawEntry[]>(`/admin/campaigns/${id}/lucky-draw/entries?page=${page}`),
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Campaign {
  id: string
  campaign_name: string
  ip_holder_name: string
  game_type: string
  start_date: string
  end_date: string
  status: string
  created_at: string
  _count: { redemptions: number; vault: number }
}

export interface CampaignDetail extends Campaign {
  rewardConfig: RewardConfigInput | null
}

export interface CreateCampaignInput {
  campaign_name: string
  ip_holder_name: string
  game_type: string
  start_date: string
  end_date: string
  max_per_user: number
  vault_watermark: number
}

export interface RewardConfigInput {
  tier1_threshold: number
  tier2_threshold: number
  tier3_threshold: number
  variety_skus_required: string[]
  lucky_draw_enabled: boolean
  lucky_draw_prize_label?: string
}

export interface UploadResult {
  imported: number
  rejected: number
  errors: { row: number; reason: string }[]
}

export interface VaultStatus {
  STANDARD: { total: number; spent: number; remaining: number }
  TIER_1: { total: number; spent: number; remaining: number }
  TIER_2: { total: number; spent: number; remaining: number }
  TIER_3: { total: number; spent: number; remaining: number }
  VARIETY: { total: number; spent: number; remaining: number }
}

export interface CampaignSummary {
  total_redemptions: number
  vault_remaining: number
  vault_spent_pct: number
  unique_users?: number
  risk_flagged_count?: number
  redemptions_by_district?: { district_name: string; city: string; count: number }[]
  redemptions_by_hour?: { hour: string; count: number }[]
  redemptions_by_city?: { city: string; count: number }[]
}

export interface TimeseriesPoint {
  timestamp: string
  redemption_count: number
  cumulative_total: number
}

export interface GeoPoint {
  district_name: string
  city: string
  province: string
  redemption_count: number
  pct_of_total: number
}

export interface RewardFunnel {
  tier1_unlocked: number
  tier2_unlocked: number
  tier3_unlocked: number
  variety_unlocked: number
  users_with_1plus_scan?: number
  conversion_rates?: { t0_to_t1: number; t1_to_t2: number; t2_to_t3: number; variety_completion: number }
  sku_distribution?: Record<string, number>
  lucky_draw_total_entries?: number
  lucky_draw_unique_participants?: number
}

export interface DrawEntry {
  user_id: string
  display_name: string
  entry_count: number
  scans_by_sku: Record<string, number>
}
