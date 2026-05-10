'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { campaignsApi, type CreateCampaignInput } from '@/lib/api'

export default function NewCampaignPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState<CreateCampaignInput>({
    campaign_name: '',
    ip_holder_name: '',
    game_type: 'GENSHIN',
    start_date: '',
    end_date: '',
    max_per_user: 1,
    vault_watermark: 500,
  })

  const set = (k: keyof CreateCampaignInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await campaignsApi.create(form)
    setLoading(false)
    if (res.success && res.data) {
      router.push(`/campaigns/${res.data.campaign_id}`)
    } else {
      setError(res.error ?? 'Failed to create campaign')
    }
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )

  const inputCls = 'w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500'

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">New Campaign</h1>
        <p className="text-sm text-muted-foreground">Create a new O2O redemption campaign</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Campaign Name">
            <input className={inputCls} required value={form.campaign_name} onChange={(e) => set('campaign_name', e.target.value)} placeholder="Ultra Milk × Genshin Q1 2026" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="IP Holder">
              <input className={inputCls} required value={form.ip_holder_name} onChange={(e) => set('ip_holder_name', e.target.value)} placeholder="HoYoverse" />
            </Field>
            <Field label="Game Type">
              <select className={inputCls} value={form.game_type} onChange={(e) => set('game_type', e.target.value)}>
                <option value="GENSHIN">Genshin Impact</option>
                <option value="WUWA">Wuthering Waves</option>
                <option value="MONSTER_HUNTER">Monster Hunter</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date">
              <input type="datetime-local" className={inputCls} required value={form.start_date} onChange={(e) => set('start_date', new Date(e.target.value).toISOString())} />
            </Field>
            <Field label="End Date">
              <input type="datetime-local" className={inputCls} required value={form.end_date} onChange={(e) => set('end_date', new Date(e.target.value).toISOString())} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Max Redemptions / User">
              <input type="number" min={1} className={inputCls} value={form.max_per_user} onChange={(e) => set('max_per_user', parseInt(e.target.value, 10))} />
            </Field>
            <Field label="Vault Low Watermark Alert">
              <input type="number" min={1} className={inputCls} value={form.vault_watermark} onChange={(e) => set('vault_watermark', parseInt(e.target.value, 10))} />
            </Field>
          </div>

          {error && (
            <div className="px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-md">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-border text-sm text-muted-foreground hover:text-foreground rounded-md transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white text-sm font-medium rounded-md transition-colors">
              {loading ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
