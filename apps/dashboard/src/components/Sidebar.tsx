'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Boxes, LogOut, Layers, Settings } from 'lucide-react'
import { clearToken } from '@/lib/api'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/campaigns', label: 'Campaigns', icon: Layers },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/vault', label: 'Vault', icon: Boxes },
]

export function Sidebar() {
  const path = usePathname()

  const handleLogout = () => {
    clearToken()
    window.location.href = '/login'
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-card border-r border-border flex flex-col z-30">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 bg-blue-500 rounded-full" />
          <div>
            <p className="text-xs font-mono text-blue-400 tracking-widest uppercase leading-none">Storytellers</p>
            <p className="text-sm font-medium text-foreground leading-tight">Engine</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-accent text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-border space-y-0.5">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}
