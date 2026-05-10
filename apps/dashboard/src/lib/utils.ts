import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatNum(n: number) {
  return n.toLocaleString('en-US')
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'text-zinc-400',
    ACTIVE: 'text-emerald-400',
    PAUSED: 'text-yellow-400',
    COMPLETED: 'text-blue-400',
    ARCHIVED: 'text-zinc-600',
  }
  return map[status] ?? 'text-zinc-400'
}

export function statusBg(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'bg-zinc-800 text-zinc-300',
    ACTIVE: 'bg-emerald-950 text-emerald-300 border border-emerald-800',
    PAUSED: 'bg-yellow-950 text-yellow-300 border border-yellow-800',
    COMPLETED: 'bg-blue-950 text-blue-300 border border-blue-800',
    ARCHIVED: 'bg-zinc-900 text-zinc-500',
  }
  return map[status] ?? 'bg-zinc-800 text-zinc-300'
}
