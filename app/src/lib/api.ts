const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1'

function getJwt(): string | null {
  return localStorage.getItem('o2o_jwt')
}

function setJwt(token: string) {
  localStorage.setItem('o2o_jwt', token)
}

function clearJwt() {
  localStorage.removeItem('o2o_jwt')
  localStorage.removeItem('o2o_user')
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T | null; error: string | null }> {
  const jwt = getJwt()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      ...options.headers,
    },
  })
  return res.json()
}

export interface AuthResult {
  jwt: string
  user_id: string
  risk_flag: boolean
}

export interface RedeemResult {
  game_code: string
  district_resolved: string
  campaign_name: string
  sku_resolved: string
  tier_rewards_issued: { tier: string; game_code: string }[]
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

export interface ProgressResult {
  total_scans: number
  next_tier: { tier: string; scans_remaining: number } | null
  tier1_rewarded: boolean
  tier2_rewarded: boolean
  tier3_rewarded: boolean
  variety_rewarded: boolean
  scanned_skus: string[]
  lucky_draw_entries: number
  variety_skus_remaining: string[]
}

export const api = {
  auth: {
    googleCallback: async (authCode: string, fingerprintHash: string, redirectUri: string) => {
      const res = await apiFetch<AuthResult>('/auth/oauth/callback', {
        method: 'POST',
        body: JSON.stringify({ provider: 'GOOGLE', auth_code: authCode, fingerprint_hash: fingerprintHash, redirect_uri: redirectUri }),
      })
      if (res.success && res.data) {
        setJwt(res.data.jwt)
        localStorage.setItem('o2o_user', JSON.stringify({ id: res.data.user_id }))
      }
      return res
    },
    logout: clearJwt,
    isLoggedIn: () => !!getJwt(),
  },

  redeem: async (campaignId: string, cartonUid: string, signature: string, fingerprintHash: string) => {
    return apiFetch<RedeemResult>('/redeem', {
      method: 'POST',
      body: JSON.stringify({ campaign_id: campaignId, carton_uid: cartonUid, signature, fingerprint_hash: fingerprintHash }),
    })
  },

  history: async (campaignId?: string) => {
    const q = campaignId ? `?campaign_id=${campaignId}` : ''
    return apiFetch<RedeemResult[]>(`/user/history${q}`)
  },

  progress: async (campaignId: string) => {
    return apiFetch<ProgressResult>(`/user/progress/${campaignId}`)
  },
}

export function getGoogleOAuthUrl(campaignId?: string): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const redirectUri = `${window.location.origin}/auth/callback`
  const state = campaignId ? btoa(JSON.stringify({ campaignId })) : ''
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    ...(state ? { state } : {}),
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}
