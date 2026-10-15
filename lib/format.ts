import { BASE_TIME, type NodeStatus } from './supply-data'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatNumber(value: number) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function formatCompact(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return value.toString()
}

export function formatHourOffset(hour: number) {
  const date = new Date(BASE_TIME + hour * 3_600_000)
  const hh = date.getUTCHours().toString().padStart(2, '0')
  return `${DAYS[date.getUTCDay()]} ${hh}:00`
}

export function formatRelative(createdAt: number, now: number) {
  const minutes = Math.max(0, Math.floor((now - createdAt) / 60_000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

export const STATUS_META: Record<
  NodeStatus,
  { label: string; hex: string; badgeClass: string; dotClass: string; textClass: string }
> = {
  healthy: {
    label: 'Healthy',
    hex: '#34d399',
    badgeClass: 'bg-success/10 text-success ring-success/25',
    dotClass: 'bg-success',
    textClass: 'text-success',
  },
  watch: {
    label: 'Watch',
    hex: '#fbbf24',
    badgeClass: 'bg-warning/10 text-warning ring-warning/25',
    dotClass: 'bg-warning',
    textClass: 'text-warning',
  },
  critical: {
    label: 'Critical',
    hex: '#f87171',
    badgeClass: 'bg-destructive/10 text-destructive ring-destructive/25',
    dotClass: 'bg-destructive',
    textClass: 'text-destructive',
  },
}
