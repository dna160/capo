'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, RefreshCw } from 'lucide-react'
import { campaignsApi, type Campaign } from '@/lib/api'
import { formatDate, statusBg } from '@/lib/utils'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await campaignsApi.list()
    if (res.success && res.data) setCampaigns(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const active = campaigns.filter((c) => c.status === 'ACTIVE').length
  const total_redemptions = campaigns.reduce((s, c) => s + c._count.redemptions, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Manage all O2O redemption campaigns</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href="/campaigns/new" className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors">
            <Plus className="w-4 h-4" />
            New Campaign
          </Link>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Campaigns" value={campaigns.length} />
        <StatCard label="Active" value={active} />
        <StatCard label="Total Redemptions" value={total_redemptions.toLocaleString()} />
        <StatCard label="Total Vault Codes" value={campaigns.reduce((s, c) => s + c._count.vault, 0).toLocaleString()} />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium text-foreground">All Campaigns</p>
        </div>
        {loading ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : campaigns.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">No campaigns yet. Create one to get started.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Campaign', 'IP Holder', 'Game', 'Status', 'Redemptions', 'Window', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{c.campaign_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{c.id.slice(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{c.ip_holder_name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{c.game_type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBg(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground tabular-nums">{c._count.redemptions.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(c.start_date)} – {formatDate(c.end_date)}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/campaigns/${c.id}`} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
