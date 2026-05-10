'use client'
import { useState, useEffect } from 'react'
import { campaignsApi, type Campaign } from '@/lib/api'
import Link from 'next/link'
import { formatNum } from '@/lib/utils'

export default function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    campaignsApi.list().then((r) => {
      if (r.success && r.data) setCampaigns(r.data)
      setLoading(false)
    })
  }, [])

  const totalRedemptions = campaigns.reduce((s, c) => s + c._count.redemptions, 0)
  const totalVault = campaigns.reduce((s, c) => s + c._count.vault, 0)
  const active = campaigns.filter((c) => c.status === 'ACTIVE')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Analytics Overview</h1>
        <p className="text-sm text-muted-foreground">Cross-campaign performance summary</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Campaigns', value: campaigns.length },
          { label: 'Active Campaigns', value: active.length },
          { label: 'Total Redemptions', value: formatNum(totalRedemptions) },
          { label: 'Total Vault Codes', value: formatNum(totalVault) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium text-foreground">Campaign Performance</p>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Campaign', 'Status', 'Redemptions', 'Vault Utilization', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map((c) => {
                const utilPct = c._count.vault > 0 ? ((c._count.redemptions / c._count.vault) * 100).toFixed(1) : '0'
                return (
                  <tr key={c.id} className="hover:bg-accent/30">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{c.campaign_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.status}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-foreground">{formatNum(c._count.redemptions)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${utilPct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{utilPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/campaigns/${c.id}`} className="text-xs text-blue-400 hover:text-blue-300">Details →</Link>
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
