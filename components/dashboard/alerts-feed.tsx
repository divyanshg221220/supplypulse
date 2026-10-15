'use client'

import {
  CircleAlert,
  CloudLightning,
  Info,
  Landmark,
  OctagonAlert,
  Package,
  Pause,
  Play,
  ScanSearch,
  Ship,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { formatRelative } from '@/lib/format'
import { NODE_BY_ID, type AlertCategory, type AlertSeverity, type SupplyAlert } from '@/lib/supply-data'
import { cn } from '@/lib/utils'
import { Panel } from './panel'

type SeverityFilter = 'all' | AlertSeverity

const SEVERITY_META: Record<AlertSeverity, { label: string; icon: LucideIcon; className: string; bar: string }> = {
  critical: { label: 'Critical', icon: OctagonAlert, className: 'text-destructive bg-destructive/10', bar: 'bg-destructive' },
  warning: { label: 'Warning', icon: TriangleAlert, className: 'text-warning bg-warning/10', bar: 'bg-warning' },
  info: { label: 'Info', icon: Info, className: 'text-primary bg-primary/10', bar: 'bg-primary' },
}

const CATEGORY_META: Record<AlertCategory, { label: string; icon: LucideIcon }> = {
  weather: { label: 'Weather', icon: CloudLightning },
  congestion: { label: 'Congestion', icon: Ship },
  supplier: { label: 'Supplier', icon: Package },
  transit: { label: 'Transit', icon: CircleAlert },
  quality: { label: 'Quality', icon: ScanSearch },
  geopolitical: { label: 'Geopolitical', icon: Landmark },
}

const FILTERS: SeverityFilter[] = ['all', 'critical', 'warning', 'info']

interface AlertsFeedProps {
  alerts: SupplyAlert[]
  now: number
  paused: boolean
  onTogglePaused: () => void
  readIds: Set<string>
  onMarkAllRead: () => void
  onSelectAlert: (alert: SupplyAlert) => void
}

export function AlertsFeed({
  alerts,
  now,
  paused,
  onTogglePaused,
  readIds,
  onMarkAllRead,
  onSelectAlert,
}: AlertsFeedProps) {
  const [filter, setFilter] = useState<SeverityFilter>('all')
  const visible = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter)
  const unread = alerts.filter((a) => !readIds.has(a.id)).length

  return (
    <Panel
      id="alerts"
      title="Live Alerts"
      description={paused ? 'Feed paused' : 'Streaming simulated disruption signals'}
      className="h-[520px] xl:h-[520px]"
      actions={
        <>
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={unread === 0}
            className="rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={onTogglePaused}
            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-secondary"
          >
            {paused ? <Play aria-hidden="true" className="size-3" /> : <Pause aria-hidden="true" className="size-3" />}
            {paused ? 'Resume' : 'Pause'}
          </button>
        </>
      }
      bodyClassName="flex min-h-0 flex-col"
    >
      <div role="group" aria-label="Filter alerts by severity" className="flex gap-1 border-b px-4 py-2 md:px-5">
        {FILTERS.map((value) => {
          const count = value === 'all' ? alerts.length : alerts.filter((a) => a.severity === value).length
          return (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors',
                filter === value ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {value}
              <span className="font-mono text-[10px] text-muted-foreground">{count}</span>
            </button>
          )
        })}
      </div>

      <ol aria-live="polite" aria-relevant="additions" className="min-h-0 flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <li className="px-5 py-10 text-center text-sm text-muted-foreground">No alerts match this filter.</li>
        ) : (
          visible.map((alert) => {
            const severity = SEVERITY_META[alert.severity]
            const category = CATEGORY_META[alert.category]
            const SeverityIcon = severity.icon
            const CategoryIcon = category.icon
            const node = NODE_BY_ID[alert.nodeId]
            const isUnread = !readIds.has(alert.id)
            return (
              <li key={alert.id} className="border-b last:border-b-0 animate-in fade-in slide-in-from-top-1 duration-300">
                <button
                  type="button"
                  onClick={() => onSelectAlert(alert)}
                  className="group relative flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 md:px-5"
                >
                  {isUnread ? (
                    <span aria-hidden="true" className={cn('absolute inset-y-3 left-0 w-0.5 rounded-r', severity.bar)} />
                  ) : null}
                  <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md', severity.className)}>
                    <SeverityIcon aria-hidden="true" className="size-3.5" />
                    <span className="sr-only">{severity.label}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className={cn('text-sm leading-snug', isUnread ? 'font-semibold' : 'font-medium text-foreground/85')}>
                        {alert.title}
                      </span>
                      <time className="shrink-0 pt-0.5 font-mono text-[10px] text-muted-foreground">
                        {formatRelative(alert.createdAt, now)}
                      </time>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                      {alert.description}
                    </span>
                    <span className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CategoryIcon aria-hidden="true" className="size-3" />
                        {category.label}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate group-hover:text-primary">{node?.name}</span>
                    </span>
                  </span>
                </button>
              </li>
            )
          })
        )}
      </ol>
    </Panel>
  )
}
