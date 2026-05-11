'use client'
import { useEffect, useRef } from 'react'
import type { MapPoint } from '@/lib/demo-data'

interface Props {
  points: MapPoint[]
  height?: number
}

export default function RedemptionMap({ points, height = 480 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any

    const init = async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css' as string)

      // Prevent double-init on React StrictMode
      if ((containerRef.current as HTMLDivElement & { _leaflet_id?: number })._leaflet_id) return

      map = L.map(containerRef.current!, {
        center: [-2.5, 118.0],
        zoom: 5,
        zoomControl: true,
        scrollWheelZoom: true,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://osm.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      const max = Math.max(...points.map((p) => p.redemption_count), 1)
      // Use sqrt scale so small kecamatan are still visible next to major hubs
      const sqrtMax = Math.sqrt(max)

      points.forEach((point) => {
        const intensity = point.redemption_count / max
        const sqrtIntensity = Math.sqrt(point.redemption_count) / sqrtMax
        const radius = 5 + sqrtIntensity * 32
        const color = intensity > 0.5 ? '#ef4444' : intensity > 0.15 ? '#f59e0b' : intensity > 0.04 ? '#a78bfa' : '#3b82f6'

        const circle = L.circleMarker([point.lat, point.lng], {
          radius,
          fillColor: color,
          color: color,
          weight: 1,
          opacity: 0.35,
          fillOpacity: 0.15 + sqrtIntensity * 0.6,
        })

        circle.bindPopup(
          `<div style="font-family:monospace;font-size:12px;min-width:180px;line-height:1.6">
            <strong style="font-size:13px">${point.district_name}</strong><br/>
            <span style="color:#94a3b8">${point.city}, ${point.province}</span><br/>
            <span style="color:${color};font-weight:700;font-size:14px">${point.redemption_count.toLocaleString()}</span>
            <span style="color:#64748b"> redemptions</span><br/>
            <span style="color:#64748b">${point.pct_of_total}% of total</span>
          </div>`,
          { maxWidth: 220 }
        )

        circle.addTo(map)
      })

      // Legend
      const legend = new L.Control({ position: 'bottomright' })
      legend.onAdd = () => {
        const div = L.DomUtil.create('div')
        div.innerHTML = `
          <div style="background:rgba(15,23,42,0.9);padding:10px 14px;border-radius:6px;border:1px solid #1e293b;font-family:monospace;font-size:11px;color:#94a3b8">
            <div style="font-weight:700;color:#e2e8f0;margin-bottom:6px">Redemption Density</div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span style="width:12px;height:12px;border-radius:50%;background:#ef4444;display:inline-block"></span> Very High (&gt;50%)</div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span style="width:12px;height:12px;border-radius:50%;background:#f59e0b;display:inline-block"></span> High (15–50%)</div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span style="width:12px;height:12px;border-radius:50%;background:#a78bfa;display:inline-block"></span> Medium (4–15%)</div>
            <div style="display:flex;align-items:center;gap:6px"><span style="width:12px;height:12px;border-radius:50%;background:#3b82f6;display:inline-block"></span> Low (&lt;4%)</div>
          </div>`
        return div
      }
      legend.addTo(map)
    }

    init()

    return () => {
      map?.remove()
    }
  }, [points])

  if (points.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-lg bg-muted/20 border border-border text-sm text-muted-foreground"
      >
        No geographic data available
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="rounded-lg overflow-hidden border border-border"
    />
  )
}
