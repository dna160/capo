'use client'
import { useState, useEffect } from 'react'
import { campaignsApi, vaultApi, type Campaign, type VaultStatus } from '@/lib/api'
import Link from 'next/link'
import { formatNum, statusBg } from '@/lib/utils'
import { DEMO_CAMPAIGNS, KR_VAULT } from '@/lib/demo-data'

export default function VaultPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [vaultMap, setVaultMap] = useState<Record<string, VaultStatus>>({})
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    campaignsApi.list().then(async (r) => {
      const hasReal = r.success && r.data && r.data.length > 0
      const list = hasReal ? r.data! : DEMO_CAMPAIGNS
      setCampaigns(list)
      setIsDemo(!hasReal)

      if (!hasReal) {
        // Inject KR vault stats for the demo campaign
        setVaultMap({ 'demo-kamen-rider': KR_VAULT })
      } else {
        // Fetch vault status for each real campaign in parallel
        const entries = await Promise.all(
          list.map(async (c) => {
            const res = await vaultApi.status(c.id)
            return res.success && res.data ? [c.id, res.data] as const : null
          })
        )
        setVaultMap(Object.fromEntries(entries.filter(Boolean) as [string, VaultStatus][]))
      }

      setLoading(false)
    })
  }, [])

  const TIER_KEYS: (keyof VaultStatus)[] = ['STANDARD', 'TIER_1', 'TIER_2', 'TIER_3', 'VARIETY']

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Vault Management</h1>
          <p className="text-sm text-muted-foreground">Upload and monitor code vaults per campaign</p>
        </div>
        {isDemo && (
          <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-xs font-medium text-amber-400">
            Demo Data
          </span>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium text-foreground">Campaigns</p>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Campaign', 'Status', 'Standard', 'Tier 1', 'Tier 2', 'Tier 3', 'Variety', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map((c) => {
                const vs = vaultMap[c.id]
                return (
                  <tr key={c.id} className="hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{c.campaign_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{c.id.slice(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBg(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    {vs ? TIER_KEYS.map((tier) => {
                      const s = vs[tier]
                      const pct = s.total > 0 ? (s.spent / s.total) * 100 : 0
                      return (
                        <td key={tier} className="px-4 py-3">
                          <p className="text-sm tabular-nums text-foreground">{formatNum(s.remaining)}</p>
                          <div className="mt-1 h-1 w-16 bg-muted rounded-full">
                            <div
                              className="h-1 rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#3b82f6',
                              }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground tabular-nums">{pct.toFixed(0)}% spent</p>
                        </td>
                      )
                    }) : TIER_KEYS.map((tier) => (
                      <td key={tier} className="px-4 py-3 text-xs text-muted-foreground">—</td>
                    ))}
                    <td className="px-4 py-3">
                      <Link href={`/campaigns/${c.id}?tab=vault`} className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap">
                        Manage →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary totals */}
      {!loading && Object.keys(vaultMap).length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {TIER_KEYS.map((tier) => {
            const totals = Object.values(vaultMap).reduce(
              (acc, vs) => ({ total: acc.total + vs[tier].total, spent: acc.spent + vs[tier].spent, remaining: acc.remaining + vs[tier].remaining }),
              { total: 0, spent: 0, remaining: 0 }
            )
            const pct = totals.total > 0 ? (totals.spent / totals.total) * 100 : 0
            return (
              <div key={tier} className="bg-card border border-border rounded-lg p-3">
                <p className="text-xs font-mono text-muted-foreground mb-2">{tier}</p>
                <p className="text-xl font-semibold text-foreground tabular-nums">{formatNum(totals.remaining)}</p>
                <p className="text-xs text-muted-foreground">remaining</p>
                <div className="mt-2 h-1 bg-muted rounded-full">
                  <div
                    className="h-1 rounded-full"
                    style={{ width: `${pct}%`, background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#3b82f6' }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{formatNum(totals.spent)}/{formatNum(totals.total)} spent</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
