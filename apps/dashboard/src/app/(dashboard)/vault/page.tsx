'use client'
import { useState, useEffect } from 'react'
import { campaignsApi, type Campaign } from '@/lib/api'
import Link from 'next/link'
import { formatNum } from '@/lib/utils'

export default function VaultPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    campaignsApi.list().then((r) => {
      if (r.success && r.data) setCampaigns(r.data)
      setLoading(false)
    })
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Vault Management</h1>
        <p className="text-sm text-muted-foreground">Upload and monitor code vaults per campaign</p>
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
                {['Campaign', 'Status', 'Vault Codes', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{c.campaign_name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.status}</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-foreground">{formatNum(c._count.vault)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/campaigns/${c.id}?tab=vault`} className="text-xs text-blue-400 hover:text-blue-300">Manage Vault →</Link>
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
