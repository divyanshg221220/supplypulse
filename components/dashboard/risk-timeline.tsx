'use client'

import { useId, useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { formatHourOffset } from '@/lib/format'
import { simulateTimeline, type Scenario, type SimulatedTimelinePoint } from '@/lib/simulation'
import { REGION_LABELS, generateRiskTimeline, type RegionFilter } from '@/lib/supply-data'
import { DataBadge } from './data-badge'
import { cn } from '@/lib/utils'
import { Panel } from './panel'

const THRESHOLD = 70

type DriverKey = 'weather' | 'congestion' | 'supplier' | 'geopolitical'

const DRIVERS: { key: DriverKey; label: string; color: string }[] = [
  { key: 'weather', label: 'Weather', color: 'var(--chart-2)' },
  { key: 'congestion', label: 'Port congestion', color: 'var(--chart-3)' },
  { key: 'supplier', label: 'Supplier', color: 'var(--chart-4)' },
  { key: 'geopolitical', label: 'Geopolitical', color: 'var(--chart-5)' },
]

export function RiskTimeline({
  region,
  scenario,
  simulated,
}: {
  region: RegionFilter
  scenario: Scenario
  simulated: boolean
}) {
  const gradientId = useId().replace(/:/g, '')
  const data = useMemo(
    () => simulateTimeline(generateRiskTimeline(region), scenario, region),
    [region, scenario],
  )
  const [visible, setVisible] = useState<Record<DriverKey, boolean>>({
    weather: true,
    congestion: true,
    supplier: false,
    geopolitical: false,
  })

  const stats = useMemo(() => {
    const peak = data.reduce((max, p) => (p.composite > max.composite ? p : max), data[0])
    const hoursAbove = data.filter((p) => p.composite >= THRESHOLD).length
    const avg = data.reduce((s, p) => s + p.composite, 0) / data.length
    const simPeak = data.reduce((max, p) => (p.simulated > max.simulated ? p : max), data[0])
    const simHoursAbove = data.filter((p) => p.simulated >= THRESHOLD).length
    const simAvg = data.reduce((s, p) => s + p.simulated, 0) / data.length
    return simulated
      ? { peak: { hour: simPeak.hour, composite: simPeak.simulated }, hoursAbove: simHoursAbove, avg: simAvg, baseAvg: avg }
      : { peak, hoursAbove, avg, baseAvg: avg }
  }, [data, simulated])

  return (
    <Panel
      id="risk-timeline"
      title="72-Hour Risk Forecast"
      description={`${REGION_LABELS[region]} composite disruption risk with 80% confidence band`}
      actions={
        <div role="group" aria-label="Toggle risk drivers" className="flex flex-wrap items-center gap-1">
          <DataBadge kind="demo" />
          {simulated ? <DataBadge kind="simulated" /> : null}
          {DRIVERS.map((driver) => (
            <button
              key={driver.key}
              type="button"
              aria-pressed={visible[driver.key]}
              onClick={() => setVisible((v) => ({ ...v, [driver.key]: !v[driver.key] }))}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                visible[driver.key] ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ background: driver.color }} />
              {driver.label}
            </button>
          ))}
        </div>
      }
      bodyClassName="flex flex-col gap-4 p-4 md:p-5"
    >
      <dl className="grid grid-cols-3 gap-3">
        <Stat label="Peak risk" value={stats.peak.composite.toFixed(0)} hint={formatHourOffset(stats.peak.hour)} tone={stats.peak.composite >= THRESHOLD ? 'danger' : 'default'} />
        <Stat label="Hours above threshold" value={`${stats.hoursAbove}h`} hint={`Threshold ${THRESHOLD}`} tone={stats.hoursAbove > 0 ? 'warning' : 'default'} />
        <Stat
          label="72h average"
          value={stats.avg.toFixed(1)}
          hint={simulated ? `Baseline ${stats.baseAvg.toFixed(1)} · simulated` : 'Composite index'}
          tone={simulated && stats.avg > stats.baseAvg + 0.5 ? 'warning' : 'default'}
        />
      </dl>

      <div className="h-64 w-full md:h-72" role="img" aria-label={`Risk forecast chart. Peak ${stats.peak.composite.toFixed(0)} at ${formatHourOffset(stats.peak.hour)}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="hour"
              type="number"
              domain={[0, 72]}
              ticks={[0, 12, 24, 36, 48, 60, 72]}
              tickFormatter={(h: number) => (h === 0 ? 'Now' : `+${h}h`)}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceArea y1={THRESHOLD} y2={100} fill="var(--destructive)" fillOpacity={0.05} />
            <ReferenceLine
              y={THRESHOLD}
              stroke="var(--destructive)"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              label={{ value: 'Critical', position: 'insideTopRight', fill: 'var(--destructive)', fontSize: 10 }}
            />
            <ReferenceLine
              x={stats.peak.hour}
              stroke="var(--muted-foreground)"
              strokeDasharray="2 4"
              label={{ value: 'Peak', position: 'top', fill: 'var(--muted-foreground)', fontSize: 10 }}
            />
            <Tooltip content={TimelineTooltip} cursor={{ stroke: 'var(--muted-foreground)', strokeOpacity: 0.4 }} />
            <Area dataKey="band" stroke="none" fill="var(--chart-1)" fillOpacity={0.08} isAnimationActive={false} />
            <Area
              type="monotone"
              dataKey="composite"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />
            {simulated ? (
              <Line
                type="monotone"
                dataKey="simulated"
                stroke="var(--warning)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={false}
              />
            ) : null}
            {DRIVERS.filter((d) => visible[d.key]).map((driver) => (
              <Line
                key={driver.key}
                type="monotone"
                dataKey={driver.key}
                stroke={driver.color}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  hint: string
  tone?: 'default' | 'warning' | 'danger'
}) {
  return (
    <div className="rounded-lg border bg-background/40 px-3 py-2">
      <dt className="truncate text-[11px] text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 font-mono text-lg font-semibold tabular-nums',
          tone === 'danger' && 'text-destructive',
          tone === 'warning' && 'text-warning',
        )}
      >
        {value}
      </dd>
      <dd className="truncate text-[11px] text-muted-foreground">{hint}</dd>
    </div>
  )
}

function TimelineTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as SimulatedTimelinePoint
  const showSim = Math.abs(point.simulated - point.composite) > 0.05
  return (
    <div className="min-w-44 rounded-lg border bg-popover px-3 py-2 text-xs shadow-xl">
      <p className="font-medium">
        {point.hour === 0 ? 'Now' : `+${point.hour}h`}{' '}
        <span className="text-muted-foreground">· {formatHourOffset(point.hour)} UTC</span>
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-chart-1" aria-hidden="true" />
          Composite
        </span>
        <span className="font-mono font-semibold tabular-nums">{point.composite.toFixed(1)}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Range {point.band[0].toFixed(0)}–{point.band[1].toFixed(0)}
      </p>
      {showSim ? (
        <div className="mt-1 flex items-center justify-between gap-4 text-warning">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-2.5 rounded-full bg-warning" aria-hidden="true" />
            Simulated
          </span>
          <span className="font-mono font-semibold tabular-nums">{point.simulated.toFixed(1)}</span>
        </div>
      ) : null}
      <div className="mt-1.5 flex flex-col gap-0.5 border-t pt-1.5">
        {DRIVERS.map((d) => (
          <div key={d.key} className="flex items-center justify-between gap-4 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-2.5 rounded-full" style={{ background: d.color }} aria-hidden="true" />
              {d.label}
            </span>
            <span className="font-mono tabular-nums text-foreground">{point[d.key].toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
