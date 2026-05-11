'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { campaignsApi, type Campaign } from '@/lib/api'
import Link from 'next/link'
import { formatNum } from '@/lib/utils'
import { DEMO_CAMPAIGNS, KR_MAP_POINTS, type MapPoint } from '@/lib/demo-data'

const RedemptionMap = dynamic(() => import('@/components/RedemptionMap'), { ssr: false })

const CITY_COORDS: Record<string, [number, number]> = {
  Jakarta: [-6.1751, 106.865],
  Bandung: [-6.9175, 107.6191],
  Surabaya: [-7.2575, 112.7521],
  Medan: [3.5952, 98.6722],
  Semarang: [-6.9932, 110.4203],
  Makassar: [-5.1477, 119.4327],
  Yogyakarta: [-7.7972, 110.3688],
  Malang: [-7.9797, 112.6304],
  Palembang: [-2.9761, 104.7754],
  Tangerang: [-6.1702, 106.6402],
  Depok: [-6.4025, 106.7942],
  Bekasi: [-6.2383, 107.0],
  Bogor: [-6.5971, 106.806],
}

export default function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    campaignsApi.list().then((r) => {
      const hasReal = r.success && r.data && r.data.length > 0
      const list = hasReal ? r.data! : DEMO_CAMPAIGNS
      setCampaigns(list)
      setIsDemo(!hasReal)

      if (!hasReal) {
        setMapPoints(KR_MAP_POINTS)
      } else {
        const pts: MapPoint[] = list.flatMap((c) => {
          const city = Object.keys(CITY_COORDS).find((k) => c.campaign_name.includes(k))
          if (!city) return []
          const [lat, lng] = CITY_COORDS[city]
          return [{ district_name: c.campaign_name, city, province: '', redemption_count: c._count.redemptions, pct_of_total: 0, lat, lng }]
        })
        const total = pts.reduce((s, p) => s + p.redemption_count, 0)
        pts.forEach((p) => { p.pct_of_total = total > 0 ? +((p.redemption_count / total) * 100).toFixed(1) : 0 })
        setMapPoints(pts.length > 0 ? pts : KR_MAP_POINTS)
      }
      setLoading(false)
    })
  }, [])

  const totalRedemptions = campaigns.reduce((s, c) => s + c._count.redemptions, 0)
  const totalVault = campaigns.reduce((s, c) => s + c._count.vault, 0)
  const active = campaigns.filter((c) => c.status === 'ACTIVE')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Analytics Overview</h1>
          <p className="text-sm text-muted-foreground">Cross-campaign performance & redemption geography</p>
        </div>
        {isDemo && (
          <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-xs font-medium text-amber-400">
            Demo Data
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Campaigns', value: campaigns.length },
          { label: 'Active Campaigns', value: active.length },
          { label: 'Total Redemptions', value: formatNum(totalRedemptions) },
          { label: 'Total Vault Codes', value: formatNum(totalVault) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Interactive Heatmap */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Redemption Heatmap — Indonesia</p>
            <p className="text-xs text-muted-foreground">Click any circle to view district details · scroll to zoom</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Very High</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />High</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-400 inline-block" />Medium</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />Low</span>
          </div>
        </div>
        <div className="p-2">
          {loading ? (
            <div className="h-[480px] flex items-center justify-center text-sm text-muted-foreground">Loading map…</div>
          ) : (
            <RedemptionMap points={mapPoints} height={480} />
          )}
        </div>
      </div>

      {/* Top Districts Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium text-foreground">Top Redemption Districts</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['#', 'District', 'City', 'Province', 'Redemptions', 'Share'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mapPoints.slice(0, 10).map((p, i) => (
              <tr key={p.district_name} className="hover:bg-accent/30">
                <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                <td className="px-4 py-2.5 text-sm text-foreground">{p.district_name}</td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground">{p.city}</td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground">{p.province}</td>
                <td className="px-4 py-2.5 text-sm tabular-nums text-foreground">{formatNum(p.redemption_count)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-1.5 min-w-[60px]">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${p.pct_of_total}%`,
                          background: p.pct_of_total > 30 ? '#ef4444' : p.pct_of_total > 10 ? '#f59e0b' : '#3b82f6',
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{p.pct_of_total}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Campaign Performance */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium text-foreground">Campaign Performance</p>
        </div>
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
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      c.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                      c.status === 'COMPLETED' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-zinc-500/10 text-zinc-400'
                    }`}>{c.status}</span>
                  </td>
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
      </div>
    </div>
  )
}
