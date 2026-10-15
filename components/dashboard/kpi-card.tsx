'use client'

import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import { useId } from 'react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import { cn } from '@/lib/utils'

export interface KpiCardProps {
  label: string
  value: string
  unit?: string
  delta: number
  deltaSuffix?: string
  /** When true, a decrease is considered an improvement (e.g. risk). */
  lowerIsBetter?: boolean
  icon: LucideIcon
  sparkline: { index: number; value: number }[]
  caption: string
}

export function KpiCard({
  label,
  value,
  unit,
  delta,
  deltaSuffix = '',
  lowerIsBetter,
  icon: Icon,
  sparkline,
  caption,
}: KpiCardProps) {
  const gradientId = useId().replace(/:/g, '')
  const isUp = delta >= 0
  const isGood = lowerIsBetter ? !isUp : isUp
  const trendColor = Math.abs(delta) < 0.05 ? 'var(--muted-foreground)' : isGood ? 'var(--success)' : 'var(--destructive)'
  const DeltaIcon = isUp ? ArrowUpRight : ArrowDownRight

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-xs font-medium text-muted-foreground">{label}</h3>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
          <Icon aria-hidden="true" className="size-3.5" />
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
            {value}
            {unit ? <span className="ml-0.5 text-sm font-medium text-muted-foreground">{unit}</span> : null}
          </p>
          <p
            className={cn(
              'mt-1 inline-flex items-center gap-0.5 text-xs font-medium',
              Math.abs(delta) < 0.05 ? 'text-muted-foreground' : isGood ? 'text-success' : 'text-destructive',
            )}
          >
            <DeltaIcon aria-hidden="true" className="size-3.5" />
            <span className="font-mono tabular-nums">
              {isUp ? '+' : ''}
              {delta.toFixed(1)}
              {deltaSuffix}
            </span>
            <span className="ml-1 font-normal text-muted-foreground">{caption}</span>
          </p>
        </div>
        <div className="h-10 w-20 shrink-0" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={trendColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={trendColor}
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </article>
  )
}
