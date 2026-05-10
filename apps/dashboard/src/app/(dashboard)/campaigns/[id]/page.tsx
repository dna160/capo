'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  campaignsApi, dashboardApi, vaultApi, batchmapApi, luckyDrawApi,
  type CampaignDetail, type CampaignSummary, type TimeseriesPoint,
  type GeoPoint, type VaultStatus, type RewardFunnel,
} from '@/lib/api'
import { formatDate, formatNum, statusBg } from '@/lib/utils'

type Tab = 'overview' | 'timeseries' | 'geo' | 'funnel' | 'vault' | 'batchmap' | 'draw'

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-semibold text-foreground tabular-nums">{typeof value === 'number' ? formatNum(value) : value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

function UploadPanel({ campaignId, type }: { campaignId: string; type: 'vault' | 'batchmap' }) {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<{ imported: number; rejected: number; errors: { row: number; reason: string }[] } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    const res = type === 'vault'
      ? await vaultApi.uploadCsv(campaignId, file)
      : await batchmapApi.upload(campaignId, file)
    setLoading(false)
    if (res.success && res.data) setResult(res.data)
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 border border-border rounded-lg p-4 text-xs text-muted-foreground space-y-1 font-mono">
        {type === 'vault' ? (
          <>
            <p className="text-foreground font-medium mb-2">Expected CSV columns:</p>
            <p>game_code, reward_tier (optional — STANDARD|TIER_1|TIER_2|TIER_3|VARIETY)</p>
          </>
        ) : (
          <>
            <p className="text-foreground font-medium mb-2">Expected CSV columns:</p>
            <p>serial_start, serial_end, district_name, city, province, batch_label</p>
          </>
        )}
      </div>

      <div className="flex gap-3 items-center">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:border file:border-border file:rounded file:bg-secondary file:text-foreground file:text-xs file:cursor-pointer"
        />
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:text-blue-400 text-white text-sm rounded-md transition-colors whitespace-nowrap"
        >
          {loading ? 'Uploading...' : 'Upload CSV'}
        </button>
      </div>

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

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [summary, setSummary] = useState<CampaignSummary | null>(null)
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([])
  const [geo, setGeo] = useState<GeoPoint[]>([])
  const [vault, setVault] = useState<VaultStatus | null>(null)
  const [funnel, setFunnel] = useState<RewardFunnel | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    const loadBase = async () => {
      const [c, s, ts, g, v, f] = await Promise.allSettled([
        campaignsApi.get(id),
        dashboardApi.summary(id),
        dashboardApi.timeseries(id),
        dashboardApi.geo(id),
        vaultApi.status(id),
        dashboardApi.rewardFunnel(id),
      ])
      if (c.status === 'fulfilled' && c.value.data) setCampaign(c.value.data)
      if (s.status === 'fulfilled' && s.value.data) setSummary(s.value.data)
      if (ts.status === 'fulfilled' && ts.value.data) setTimeseries(ts.value.data)
      if (g.status === 'fulfilled' && g.value.data) setGeo(g.value.data)
      if (v.status === 'fulfilled' && v.value.data) setVault(v.value.data)
      if (f.status === 'fulfilled' && f.value.data) setFunnel(f.value.data)
    }
    loadBase()
  }, [id])

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true)
    const res = await campaignsApi.setStatus(id, newStatus)
    setUpdatingStatus(false)
    if (res.success && campaign) {
      setCampaign({ ...campaign, status: newStatus as CampaignDetail['status'] })
    }
  }

  const handleExport = async () => {
    const res = await dashboardApi.exportCsv(id)
    if (res.success && res.data) {
      const blob = new Blob([res.data as unknown as string], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `redemptions-${id}.csv`
      a.click()
    }
  }

  const NEXT_STATUS: Record<string, string[]> = {
    DRAFT: ['ACTIVE'],
    ACTIVE: ['PAUSED', 'COMPLETED'],
    PAUSED: ['ACTIVE', 'COMPLETED'],
    COMPLETED: ['ARCHIVED'],
    ARCHIVED: [],
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'timeseries', label: 'Timeseries' },
    { id: 'geo', label: 'Geography' },
    { id: 'funnel', label: 'Reward Funnel' },
    { id: 'vault', label: 'Vault' },
    { id: 'batchmap', label: 'Batch Map' },
    { id: 'draw', label: 'Lucky Draw' },
  ]

  if (!campaign) {
    return <div className="p-6 text-sm text-muted-foreground">Loading campaign…</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.push('/campaigns')} className="text-xs text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1">
            ← All Campaigns
          </button>
          <h1 className="text-xl font-semibold text-foreground">{campaign.campaign_name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBg(campaign.status)}`}>
              {campaign.status}
            </span>
            <span className="text-xs text-muted-foreground">{campaign.ip_holder_name} · {campaign.game_type}</span>
            <span className="text-xs text-muted-foreground">{formatDate(campaign.start_date)} – {formatDate(campaign.end_date)}</span>
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button onClick={handleExport} className="px-3 py-1.5 border border-border text-xs text-muted-foreground hover:text-foreground rounded-md transition-colors">
            Export CSV
          </button>
          {(NEXT_STATUS[campaign.status] ?? []).map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={updatingStatus}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white text-xs font-medium rounded-md transition-colors"
            >
              → {s}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-0 -mb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${tab === t.id ? 'border-blue-500 text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ──────────────────────────────────────────────────────── */}
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
              <p className="text-sm font-medium text-foreground mb-4">Redemptions by Hour (last 48h)</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={summary.redemptions_by_hour.slice().reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => new Date(v).toLocaleTimeString('en', { hour: '2-digit' })} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Timeseries ────────────────────────────────────────────────────── */}
      {tab === 'timeseries' && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm font-medium text-foreground mb-4">Redemption Velocity</p>
          {timeseries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet</p>
          ) : (
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
                <Area type="monotone" dataKey="redemption_count" stroke="#10b981" fill="none" strokeWidth={1.5} strokeDasharray="4 2" name="Per Period" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ── Geography ─────────────────────────────────────────────────────── */}
      {tab === 'geo' && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-foreground">District-Level Redemption Density</p>
          </div>
          {geo.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No geographic data yet</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['District', 'City', 'Province', 'Redemptions', '% of Total'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {geo.map((g) => (
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
          )}
        </div>
      )}

      {/* ── Reward Funnel ─────────────────────────────────────────────────── */}
      {tab === 'funnel' && funnel && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Tier 1 Unlocked" value={funnel.tier1_unlocked} />
            <StatCard label="Tier 2 Unlocked" value={funnel.tier2_unlocked} />
            <StatCard label="Tier 3 Unlocked" value={funnel.tier3_unlocked} />
            <StatCard label="Variety Unlocked" value={funnel.variety_unlocked} />
          </div>

          {funnel.conversion_rates && (
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Conversion Rates</p>
              {[
                { label: 'T0 → T1', value: funnel.conversion_rates.t0_to_t1 },
                { label: 'T1 → T2', value: funnel.conversion_rates.t1_to_t2 },
                { label: 'T2 → T3', value: funnel.conversion_rates.t2_to_t3 },
                { label: 'Variety Completion', value: funnel.conversion_rates.variety_completion },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-32">{label}</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${value}%` }} />
                  </div>
                  <span className="text-xs text-foreground tabular-nums w-12 text-right">{value}%</span>
                </div>
              ))}
            </div>
          )}

          {funnel.sku_distribution && (
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm font-medium text-foreground mb-3">SKU Distribution</p>
              {Object.entries(funnel.sku_distribution).map(([sku, count]) => (
                <div key={sku} className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-muted-foreground font-mono w-20">{sku}</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${funnel.lucky_draw_total_entries ? (count / funnel.lucky_draw_total_entries) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs text-foreground tabular-nums">{formatNum(count)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Vault ─────────────────────────────────────────────────────────── */}
      {tab === 'vault' && (
        <div className="space-y-6">
          {vault && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {Object.entries(vault).map(([tier, stats]) => (
                <div key={tier} className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs font-mono text-muted-foreground mb-2">{tier}</p>
                  <p className="text-xl font-semibold text-foreground tabular-nums">{formatNum(stats.remaining)}</p>
                  <p className="text-xs text-muted-foreground">remaining</p>
                  <div className="mt-2 h-1 bg-muted rounded-full">
                    <div className="h-1 rounded-full bg-blue-500" style={{ width: `${stats.total ? (stats.spent / stats.total) * 100 : 0}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stats.spent}/{stats.total} spent</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-foreground mb-4">Upload Vault CSV</h3>
            <UploadPanel campaignId={id} type="vault" />
          </div>
        </div>
      )}

      {/* ── Batch Map ─────────────────────────────────────────────────────── */}
      {tab === 'batchmap' && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Upload Batch Mapping CSV</h3>
          <UploadPanel campaignId={id} type="batchmap" />
        </div>
      )}

      {/* ── Lucky Draw ────────────────────────────────────────────────────── */}
      {tab === 'draw' && <LuckyDrawTab campaignId={id} />}
    </div>
  )
}

function LuckyDrawTab({ campaignId }: { campaignId: string }) {
  const [numWinners, setNumWinners] = useState(1)
  const [prize, setPrize] = useState('')
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<unknown>(null)

  const execute = async () => {
    setExecuting(true)
    const res = await luckyDrawApi.execute(campaignId, numWinners, prize)
    setExecuting(false)
    if (res.success) setResult(res.data)
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-4 max-w-lg">
        <h3 className="text-sm font-medium text-foreground mb-4">Execute Lucky Draw</h3>
        <p className="text-xs text-muted-foreground mb-4">Campaign must be in COMPLETED status. Draw can only be executed once per campaign.</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">Number of Winners</label>
            <input type="number" min={1} value={numWinners} onChange={(e) => setNumWinners(parseInt(e.target.value))} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">Prize Label</label>
            <input value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="Exclusive Character Skin Bundle" className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <button onClick={execute} disabled={executing || !prize} className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:text-blue-400 text-white text-sm rounded-md transition-colors">
            {executing ? 'Executing…' : 'Execute Draw'}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-card border border-border rounded-lg p-4">
          <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
