'use client'
import { useState } from 'react'
import { authApi, setToken } from '@/lib/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await authApi.login(email, password)
    setLoading(false)

    if (res.success && res.data) {
      setToken(res.data.jwt)
      localStorage.setItem('dash_admin', JSON.stringify({ role: res.data.role, name: res.data.display_name }))
      window.location.href = '/campaigns'
    } else {
      setError(res.error ?? 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-2 h-6 bg-blue-500 rounded-sm" />
            <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Storytellers</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Engine Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">O2O Campaign Management</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 tracking-wide uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="admin@storytellers.id"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 tracking-wide uppercase">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-md">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:text-blue-400 text-white text-sm font-medium rounded-md transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Internal access only · Storytellers Creative Solutions
        </p>
      </div>
    </div>
  )
}
