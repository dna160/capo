'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  campaignsApi, dashboardApi, vaultApi, batchmapApi, luckyDrawApi,
  type CampaignDetail, type CampaignSummary, type TimeseriesPoint,
  type GeoPoint, type VaultStatus, type RewardFunnel,
} from '@/lib/api'
import { formatDate, formatNum, statusBg } from '@/lib/utils'
import {
  DEMO_SUMMARY, DEMO_TIMESERIES, DEMO_GEO, DEMO_VAULT, DEMO_FUNNEL, DEMO_MAP_POINTS,
  KR_SUMMARY, KR_TIMESERIES, KR_GEO, KR_VAULT, KR_FUNNEL, KR_MAP_POINTS,
  type MapPoint,
} from '@/lib/demo-data'

const RedemptionMap = dynamic(() => import('@/components/RedemptionMap'), { ssr: false })

type Tab = 'overview' | 'timeseries' | 'geo' | 'funnel' | 'vault' | 'batchmap' | 'draw'

const CITY_COORDS: Record<string, [number, number]> = {
  Jakarta: [-6.1751, 106.865], Bandung: [-6.9175, 107.6191], Surabaya: [-7.2575, 112.7521],
  Medan: [3.5952, 98.6722], Semarang: [-6.9932, 110.4203], Makassar: [-5.1477, 119.4327],
  Yogyakarta: [-7.7972, 110.3688], Malang: [-7.9797, 112.6304], Palembang: [-2.9761, 104.7754],
  Tangerang: [-6.1702, 106.6402], Depok: [-6.4025, 106.7942], Bekasi: [-6.2383, 107.0],
}

function geoToMapPoints(geo: GeoPoint[]): MapPoint[] {
  if (!geo.length) return DEMO_MAP_POINTS
  return geo.flatMap((g) => {
    const coords = CITY_COORDS[g.city]
    if (!coords) return []
    return [{ ...g, lat: coords[0], lng: coords[1] }]
  })
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-semibold text-foreground tabular-nums">
        {typeof value === 'number' ? formatNum(value) : value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

// ── Upload Panel: CSV file upload + paste-codes mode ─────────────────────────
function UploadPanel({ campaignId, type }: { campaignId: string; type: 'vault' | 'batchmap' }) {
  const [file, setFile] = useState<File | null>(null)
  const [pasteMode, setPasteMode] = useState(false)
  const [pasted, setPasted] = useState('')
  const [result, setResult] = useState<{ imported: number; rejected: number; errors: { row: number; reason: string }[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const buildFileFromPaste = (): File => {
    let csv: string
    if (type === 'vault') {
      const lines = pasted.trim().split('\n').filter(Boolean)
      csv = 'game_code,reward_tier\n' + lines.map((l) => {
        const parts = l.trim().split(/[\t,]/)
        const code = (parts[0] ?? '').trim()
        const rawTier = (parts[1] ?? '').trim().toUpperCase()
        const tier = ['STANDARD', 'TIER_1', 'TIER_2', 'TIER_3', 'VARIETY'].includes(rawTier) ? rawTier : 'STANDARD'
        return `${code},${tier}`
      }).join('\n')
    } else {
      csv = pasted
    }
    return new File([csv], 'pasted.csv', { type: 'text/csv' })
  }

  const handleUpload = async () => {
    setError('')
    const uploadFile = pasteMode ? buildFileFromPaste() : file
    if (!uploadFile) return
    setLoading(true)
    const res = type === 'vault'
      ? await vaultApi.uploadCsv(campaignId, uploadFile)
      : await batchmapApi.upload(campaignId, uploadFile)
    setLoading(false)
    if (res.success && res.data) setResult(res.data)
    else setError(res.error ?? 'Upload failed')
  }

  const lineCount = pasted.trim().split('\n').filter(Boolean).length
  const canSubmit = pasteMode ? lineCount > 0 : !!file

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {(['file', 'paste'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setPasteMode(m === 'paste')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              (m === 'paste') === pasteMode
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {m === 'file' ? 'Upload CSV' : 'Paste Codes'}
          </button>
        ))}
      </div>

      {/* Format hint */}
      <div className="bg-muted/30 border border-border rounded-lg p-4 text-xs text-muted-foreground font-mono space-y-1">
        {type === 'vault' ? (
          <>
            <p className="text-foreground font-medium mb-2">{pasteMode ? 'One code per line — tier is optional:' : 'CSV columns:'}</p>
            {pasteMode ? (
              <>
                <p className="text-muted-foreground/80">GNSHN-ABCD-1234              ← defaults to STANDARD</p>
                <p className="text-muted-foreground/80">GNSHN-WXYZ-5678, TIER_1      ← explicit tier</p>
                <p className="text-muted-foreground/60 mt-1">Valid tiers: STANDARD · TIER_1 · TIER_2 · TIER_3 · VARIETY</p>
              </>
            ) : (
              <p>game_code, reward_tier (STANDARD|TIER_1|TIER_2|TIER_3|VARIETY)</p>
            )}
          </>
        ) : (
          <>
            <p className="text-foreground font-medium mb-2">CSV columns:</p>
            <p>serial_start, serial_end, district_name, city, province, batch_label</p>
          </>
        )}
      </div>

      {/* Input */}
      {pasteMode ? (
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder={
            type === 'vault'
              ? 'GNSHN-ABCD-1234\nGNSHN-WXYZ-5678, TIER_1\nGNSHN-EFGH-9012, TIER_2\n...'
              : '1000,1999,Jakarta Pusat,Jakarta,DKI Jakarta,Batch A\n2000,2999,Bandung Kota,Bandung,Jawa Barat,Batch B'
          }
          rows={8}
          className="w-full px-3 py-2.5 bg-background border border-border rounded-md text-sm text-foreground font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
        />
      ) : (
        <div className="flex gap-3 items-center">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:border file:border-border file:rounded file:bg-secondary file:text-foreground file:text-xs file:cursor-pointer"
          />
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!canSubmit || loading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:text-blue-400 text-white text-sm rounded-md transition-colors"
      >
        {loading ? 'Uploading...' : pasteMode ? `Upload ${lineCount} code${lineCount !== 1 ? 's' : ''}` : 'Upload CSV'}
      </button>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {result && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
          <div className="flex gap-6">
            <span className="text-sm text-emerald-400">✓ Imported: {result.imported}</span>
            <span className="text-sm text-red-400">✗ Rejected: {result.rejected}</span>
          </div>
          {result.errors.slice(0, 10).map((e) => (
            <p key={e.row} className="text-xs text-muted-foreground font-mono">Row {e.row}: {e.reason}</p>
          ))}
          {result.errors.length > 10 && <p className="text-xs text-muted-foreground">…and {result.errors.length - 10} more errors</p>}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [summary, setSummary] = useState<CampaignSummary | null>(null)
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([])
  const [geo, setGeo] = useState<GeoPoint[]>([])
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([])
  const [vault, setVault] = useState<VaultStatus | null>(null)
  const [funnel, setFunnel] = useState<RewardFunnel | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    const load = async () => {
      const demo = id.startsWith('demo-')
      setIsDemo(demo)

      if (demo) {
        // Per-campaign demo datasets
        if (id === 'demo-kamen-rider') {
          setCampaign({
            id,
            campaign_name: 'Ultra Milk × Kamen Rider: Gotchard',
            ip_holder_name: 'Toei Company',
            game_type: 'KAMEN_RIDER',
            status: 'ACTIVE',
            start_date: '2026-02-01T00:00:00Z',
            end_date: '2026-07-31T23:59:59Z',
            created_at: '2026-01-10T00:00:00Z',
            _count: { redemptions: 47_283, vault: 60_500 },
            rewardConfig: {
              tier1_threshold: 3,
              tier2_threshold: 6,
              tier3_threshold: 12,
              variety_skus_required: ['BC', 'SB', 'FC'],
              lucky_draw_enabled: true,
              lucky_draw_prize_label: 'Signed Kamen Rider Gotchard Merchandise Bundle',
            },
          })
          setSummary(KR_SUMMARY)
          setTimeseries(KR_TIMESERIES)
          setGeo(KR_GEO)
          setMapPoints(KR_MAP_POINTS)
          setVault(KR_VAULT)
          setFunnel(KR_FUNNEL)
          return
        }

        // Other generic demo campaigns
        const name = id === 'demo-genshin-q1' ? 'Ultra Milk × Genshin Impact Q1 2026'
          : id === 'demo-wuwa-launch' ? 'Ultra Milk × Wuthering Waves Launch'
          : 'Ultra Milk × Monster Hunter Wilds'
        const ip = id === 'demo-genshin-q1' ? 'HoYoverse' : id === 'demo-wuwa-launch' ? 'Kuro Games' : 'Capcom'
        const gt = id === 'demo-genshin-q1' ? 'GENSHIN' : id === 'demo-wuwa-launch' ? 'WUWA' : 'MONSTER_HUNTER'
        const status = id === 'demo-genshin-q1' ? 'COMPLETED' : id === 'demo-wuwa-launch' ? 'ACTIVE' : 'DRAFT'
        const redemptions = id === 'demo-genshin-q1' ? 18_432 : id === 'demo-wuwa-launch' ? 4_231 : 0
        const vault_total = id === 'demo-genshin-q1' ? 25_000 : id === 'demo-wuwa-launch' ? 15_000 : 0

        setCampaign({
          id, campaign_name: name, ip_holder_name: ip, game_type: gt, status: status as CampaignDetail['status'],
          start_date: '2026-01-01T00:00:00Z', end_date: '2026-03-31T23:59:59Z', created_at: '2025-12-15T00:00:00Z',
          _count: { redemptions, vault: vault_total },
          rewardConfig: { tier1_threshold: 3, tier2_threshold: 6, tier3_threshold: 12, variety_skus_required: ['BC', 'SB', 'FC'], lucky_draw_enabled: true, lucky_draw_prize_label: 'Exclusive Character Skin Bundle' },
        })
        setSummary(DEMO_SUMMARY)
        setTimeseries(DEMO_TIMESERIES)
        setGeo(DEMO_GEO)
        setMapPoints(DEMO_MAP_POINTS)
        setVault(DEMO_VAULT)
        setFunnel(DEMO_FUNNEL)
        return
      }

      const [c, s, ts, g, v, f] = await Promise.allSettled([
        campaignsApi.get(id),
        dashboardApi.summary(id),
        dashboardApi.timeseries(id),
        dashboardApi.geo(id),
        vaultApi.status(id),
        dashboardApi.rewardFunnel(id),
      ])
      if (c.status === 'fulfilled' && c.value.data) setCampaign(c.value.data)
      if (s.status === 'fulfilled' && s.value.data) setSummary(s.value.data ?? DEMO_SUMMARY)
      if (ts.status === 'fulfilled') setTimeseries(ts.value.data?.length ? ts.value.data : DEMO_TIMESERIES)
      if (g.status === 'fulfilled') {
        const data = g.value.data ?? []
        setGeo(data)
        setMapPoints(data.length ? geoToMapPoints(data) : DEMO_MAP_POINTS)
      }
      if (v.status === 'fulfilled' && v.value.data) setVault(v.value.data)
      if (f.status === 'fulfilled' && f.value.data) setFunnel(f.value.data)
    }
    load()
  }, [id])

  const handleStatusChange = async (newStatus: string) => {
    if (isDemo) return
    setUpdatingStatus(true)
    const res = await campaignsApi.setStatus(id, newStatus)
    setUpdatingStatus(false)
    if (res.success && campaign) setCampaign({ ...campaign, status: newStatus as CampaignDetail['status'] })
  }

  const handleExport = async () => {
    const res = await dashboardApi.exportCsv(id)
    if (res.success && res.data) {
      const blob = new Blob([res.data as unknown as string], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `redemptions-${id}.csv`; a.click()
    }
  }

  const NEXT_STATUS: Record<string, string[]> = {
    DRAFT: ['ACTIVE'], ACTIVE: ['PAUSED', 'COMPLETED'], PAUSED: ['ACTIVE', 'COMPLETED'],
    COMPLETED: ['ARCHIVED'], ARCHIVED: [],
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' }, { id: 'timeseries', label: 'Timeseries' },
    { id: 'geo', label: 'Geography' }, { id: 'funnel', label: 'Reward Funnel' },
    { id: 'vault', label: 'Vault' }, { id: 'batchmap', label: 'Batch Map' }, { id: 'draw', label: 'Lucky Draw' },
  ]

  if (!campaign) return <div className="p-6 text-sm text-muted-foreground">Loading campaign…</div>

  const vaultData = vault ?? DEMO_VAULT
  const funnelData = funnel ?? DEMO_FUNNEL

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.push('/campaigns')} className="text-xs text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1">
            ← All Campaigns
          </button>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-semibold text-foreground">{campaign.campaign_name}</h1>
            {isDemo && <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-xs font-medium text-amber-400">Demo</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBg(campaign.status)}`}>{campaign.status}</span>
            <span className="text-xs text-muted-foreground">{campaign.ip_holder_name} · {campaign.game_type}</span>
            <span className="text-xs text-muted-foreground">{formatDate(campaign.start_date)} – {formatDate(campaign.end_date)}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={handleExport} className="px-3 py-1.5 border border-border text-xs text-muted-foreground hover:text-foreground rounded-md transition-colors">Export CSV</button>
          {!isDemo && (NEXT_STATUS[campaign.status] ?? []).map((s) => (
            <button key={s} onClick={() => handleStatusChange(s)} disabled={updatingStatus}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white text-xs font-medium rounded-md transition-colors">
              → {s}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-0 -mb-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${tab === t.id ? 'border-blue-500 text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Redemptions" value={summary.total_redemptions} />
            <StatCard label="Vault Remaining" value={summary.vault_remaining} sub={`${summary.vault_spent_pct}% spent`} />
            <StatCard label="Unique Users" value={summary.unique_users ?? '—'} />
            <StatCard label="Risk Flagged" value={summary.risk_flagged_count ?? '—'} />
          </div>
          {summary.redemptions_by_hour && summary.redemptions_by_hour.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm font-medium text-foreground mb-4">Redemptions by Hour (last 24h)</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={summary.redemptions_by_hour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => new Date(v).toLocaleTimeString('en', { hour: '2-digit' })} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {campaign.rewardConfig && (
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm font-medium text-foreground mb-3">Reward Configuration</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div><p className="text-muted-foreground mb-0.5">Tier 1 Threshold</p><p className="text-foreground font-mono">{campaign.rewardConfig.tier1_threshold} scans</p></div>
                <div><p className="text-muted-foreground mb-0.5">Tier 2 Threshold</p><p className="text-foreground font-mono">{campaign.rewardConfig.tier2_threshold} scans</p></div>
                <div><p className="text-muted-foreground mb-0.5">Tier 3 Threshold</p><p className="text-foreground font-mono">{campaign.rewardConfig.tier3_threshold} scans</p></div>
                <div><p className="text-muted-foreground mb-0.5">Lucky Draw</p><p className="text-foreground font-mono">{campaign.rewardConfig.lucky_draw_enabled ? '✓ Enabled' : 'Disabled'}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground mb-0.5">Variety SKUs Required</p><p className="text-foreground font-mono">{campaign.rewardConfig.variety_skus_required.join(' · ')}</p></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Timeseries ───────────────────────────────────────────────────── */}
      {tab === 'timeseries' && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm font-medium text-foreground mb-4">Redemption Velocity (30 days)</p>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={timeseries}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
              <Area type="monotone" dataKey="cumulative_total" stroke="#3b82f6" fill="url(#grad)" strokeWidth={2} name="Cumulative" />
              <Area type="monotone" dataKey="redemption_count" stroke="#10b981" fill="none" strokeWidth={1.5} strokeDasharray="4 2" name="Per Day" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-6 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> Cumulative</span>
            <span className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-emerald-500 inline-block" /> Per Day</span>
          </div>
        </div>
      )}

      {/* ── Geography ────────────────────────────────────────────────────── */}
      {tab === 'geo' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-medium text-foreground">Redemption Heatmap</p>
              <p className="text-xs text-muted-foreground">Click circles for district detail · scroll to zoom</p>
            </div>
            <div className="p-2"><RedemptionMap points={mapPoints} height={380} /></div>
          </div>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border"><p className="text-sm font-medium text-foreground">District Breakdown</p></div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['District', 'City', 'Province', 'Redemptions', '% of Total'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(geo.length > 0 ? geo : DEMO_GEO).map((g) => (
                  <tr key={`${g.district_name}-${g.city}`} className="hover:bg-accent/30">
                    <td className="px-4 py-2.5 text-sm text-foreground">{g.district_name}</td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{g.city}</td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{g.province}</td>
                    <td className="px-4 py-2.5 text-sm tabular-nums text-foreground">{formatNum(g.redemption_count)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${g.pct_of_total}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{g.pct_of_total}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Reward Funnel ────────────────────────────────────────────────── */}
      {tab === 'funnel' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Tier 1 Unlocked" value={funnelData.tier1_unlocked} />
            <StatCard label="Tier 2 Unlocked" value={funnelData.tier2_unlocked} />
            <StatCard label="Tier 3 Unlocked" value={funnelData.tier3_unlocked} />
            <StatCard label="Variety Unlocked" value={funnelData.variety_unlocked} />
          </div>
          {funnelData.conversion_rates && (
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Conversion Rates</p>
              {[
                { label: 'Scanned → Tier 1', value: funnelData.conversion_rates.t0_to_t1 },
                { label: 'Tier 1 → Tier 2', value: funnelData.conversion_rates.t1_to_t2 },
                { label: 'Tier 2 → Tier 3', value: funnelData.conversion_rates.t2_to_t3 },
                { label: 'Variety Completion', value: funnelData.conversion_rates.variety_completion },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-36">{label}</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${value}%` }} />
                  </div>
                  <span className="text-xs text-foreground tabular-nums w-12 text-right">{value}%</span>
                </div>
              ))}
            </div>
          )}
          {funnelData.sku_distribution && (
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm font-medium text-foreground mb-3">SKU Distribution</p>
              {Object.entries(funnelData.sku_distribution).map(([sku, count]) => {
                const total = Object.values(funnelData.sku_distribution!).reduce((a, b) => a + b, 0)
                const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0'
                return (
                  <div key={sku} className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-muted-foreground font-mono w-36">{sku}</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-foreground tabular-nums w-24 text-right">{formatNum(count)} ({pct}%)</span>
                  </div>
                )
              })}
            </div>
          )}
          {funnelData.lucky_draw_total_entries != null && (
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Lucky Draw Entries" value={funnelData.lucky_draw_total_entries} />
              <StatCard label="Unique Participants" value={funnelData.lucky_draw_unique_participants ?? '—'} />
            </div>
          )}
        </div>
      )}

      {/* ── Vault ───────────────────────────────────────────────────────── */}
      {tab === 'vault' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {(Object.entries(vaultData) as [keyof VaultStatus, VaultStatus[keyof VaultStatus]][]).map(([tier, stats]) => (
              <div key={tier} className="bg-card border border-border rounded-lg p-3">
                <p className="text-xs font-mono text-muted-foreground mb-2">{tier}</p>
                <p className="text-xl font-semibold text-foreground tabular-nums">{formatNum(stats.remaining)}</p>
                <p className="text-xs text-muted-foreground">remaining</p>
                <div className="mt-2 h-1 bg-muted rounded-full">
                  <div className="h-1 rounded-full bg-blue-500" style={{ width: `${stats.total ? (stats.spent / stats.total) * 100 : 0}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{formatNum(stats.spent)}/{formatNum(stats.total)} spent</p>
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-foreground mb-4">Upload Vault Codes</h3>
            <UploadPanel campaignId={id} type="vault" />
          </div>
        </div>
      )}

      {/* ── Batch Map ────────────────────────────────────────────────────── */}
      {tab === 'batchmap' && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Upload Batch Mapping</h3>
          <UploadPanel campaignId={id} type="batchmap" />
        </div>
      )}

      {/* ── Lucky Draw ───────────────────────────────────────────────────── */}
      {tab === 'draw' && <LuckyDrawTab campaignId={id} isDemo={isDemo} />}
    </div>
  )
}

function LuckyDrawTab({ campaignId, isDemo }: { campaignId: string; isDemo: boolean }) {
  const [numWinners, setNumWinners] = useState(3)
  const [prize, setPrize] = useState(isDemo ? 'Exclusive Character Skin Bundle' : '')
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<unknown>(null)

  const execute = async () => {
    if (isDemo) {
      setResult({
        winners: [
          { user_id: 'usr_demo1', display_name: 'Budi Santoso', entry_count: 12, scans_by_sku: { BC: 5, SB: 4, FC: 3 } },
          { user_id: 'usr_demo2', display_name: 'Siti Rahayu', entry_count: 8, scans_by_sku: { BC: 3, SB: 3, FC: 2 } },
          { user_id: 'usr_demo3', display_name: 'Ahmad Fauzi', entry_count: 6, scans_by_sku: { BC: 2, SB: 2, FC: 2 } },
        ],
        prize_label: prize,
        drawn_at: new Date().toISOString(),
        total_entries_pool: 4_231,
      })
      return
    }
    setExecuting(true)
    const res = await luckyDrawApi.execute(campaignId, numWinners, prize)
    setExecuting(false)
    if (res.success) setResult(res.data)
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-4 max-w-lg">
        <h3 className="text-sm font-medium text-foreground mb-1">Execute Lucky Draw</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {isDemo ? 'Demo mode — draw is simulated.' : 'Campaign must be COMPLETED. Executable once per campaign.'}
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">Number of Winners</label>
            <input type="number" min={1} value={numWinners} onChange={(e) => setNumWinners(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">Prize Label</label>
            <input value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="Exclusive Character Skin Bundle"
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <button onClick={execute} disabled={executing || !prize}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:text-blue-400 text-white text-sm rounded-md transition-colors">
            {executing ? 'Executing…' : isDemo ? '🎲 Simulate Draw' : 'Execute Draw'}
          </button>
        </div>
      </div>
      {Boolean(result) && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm font-medium text-foreground mb-3">Draw Results</p>
          <pre className="text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
