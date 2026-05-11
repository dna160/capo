'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, RefreshCw } from 'lucide-react'
import { campaignsApi, type Campaign } from '@/lib/api'
import { formatDate, statusBg, formatNum } from '@/lib/utils'
import { DEMO_CAMPAIGNS } from '@/lib/demo-data'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  )
}

const GAME_LABEL: Record<string, string> = {
  GENSHIN: 'Genshin Impact',
  WUWA: 'Wuthering Waves',
  MONSTER_HUNTER: 'Monster Hunter',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await campaignsApi.list()
    if (res.success && res.data && res.data.length > 0) {
      setCampaigns(res.data)
      setIsDemo(false)
    } else {
      setCampaigns(DEMO_CAMPAIGNS)
      setIsDemo(true)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const active = campaigns.filter((c) => c.status === 'ACTIVE').length
  const total_redemptions = campaigns.reduce((s, c) => s + c._count.redemptions, 0)
  const total_vault = campaigns.reduce((s, c) => s + c._count.vault, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Manage all O2O redemption campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          {isDemo && (
            <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-xs font-medium text-amber-400">
              Demo Data
            </span>
          )}
          <button
            onClick={load}
            className="p-2 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href="/campaigns/new"
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </Link>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Campaigns" value={campaigns.length} />
        <StatCard label="Active" value={active} />
        <StatCard label="Total Redemptions" value={formatNum(total_redemptions)} />
        <StatCard label="Total Vault Codes" value={formatNum(total_vault)} />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium text-foreground">All Campaigns</p>
        </div>
        {loading ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Campaign', 'IP Holder', 'Game', 'Status', 'Redemptions', 'Vault Usage', 'Window', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map((c) => {
                const utilPct = c._count.vault > 0
                  ? ((c._count.redemptions / c._count.vault) * 100).toFixed(1)
                  : '0'
                return (
                  <tr key={c.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{c.campaign_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{c.id.slice(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.ip_holder_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{GAME_LABEL[c.game_type] ?? c.game_type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBg(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground tabular-nums">{formatNum(c._count.redemptions)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <div className="flex-1 bg-muted rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${utilPct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">{utilPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(c.start_date)} – {formatDate(c.end_date)}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/campaigns/${c.id}`} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
