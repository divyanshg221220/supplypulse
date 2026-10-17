'use client'

import { CircleCheck, Info, Loader2, RefreshCw, WifiOff } from 'lucide-react'
import type { BackendHealth } from '@/lib/api'
import { cn } from '@/lib/utils'

export function BackendStatusBanner({
  health,
  loading,
  validating,
  onRecheck,
}: {
  health: BackendHealth | undefined
  loading: boolean
  validating: boolean
  onRecheck: () => void
}) {
  if (loading || !health) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground" role="status">
        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
        Checking backend connection…
      </div>
    )
  }

  const Icon = health.status === 'online' ? CircleCheck : health.status === 'offline' ? WifiOff : Info
  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs',
        health.status === 'online' && 'border-success/30 bg-success/5 text-success',
        health.status === 'offline' && 'border-warning/30 bg-warning/5 text-warning',
        health.status === 'not-configured' && 'bg-card text-muted-foreground',
      )}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1">
        {health.message}
        {health.status === 'not-configured' ? (
          <>
            . Set <code className="font-mono text-foreground">NEXT_PUBLIC_API_BASE_URL</code> to connect a live API.
          </>
        ) : health.latencyMs !== null ? (
          ` · ${health.latencyMs}ms`
        ) : null}
      </span>
      {health.status !== 'not-configured' ? (
        <button
          type="button"
          onClick={onRecheck}
          disabled={validating}
          className="inline-flex items-center gap-1 rounded-md border border-current/30 px-2 py-0.5 text-[11px] font-medium hover:bg-secondary disabled:opacity-50"
        >
          <RefreshCw aria-hidden="true" className={cn('size-3', validating && 'animate-spin')} />
          Retry
        </button>
      ) : null}
    </div>
  )
}
