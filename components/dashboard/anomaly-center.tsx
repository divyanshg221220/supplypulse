'use client'

import { ArrowDownWideNarrow, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { METRIC_LABELS, detectAnomalies, type Anomaly, type AnomalyMetric, type AnomalySeverity } from '@/lib/anomalies'
import { formatRelative } from '@/lib/format'
import type { SimulatedNode } from '@/lib/simulation'
import { BASE_TIME, REGION_LABELS } from '@/lib/supply-data'
import { cn } from '@/lib/utils'
import { DataBadge } from './data-badge'
import { Panel } from './panel'

type SortKey = 'severity' | 'deviation' | 'recent' | 'node'
const SEVERITY_RANK: Record<AnomalySeverity, number> = { critical: 3, warning: 2, info: 1 }
const SEVERITY_META: Record<AnomalySeverity, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-destructive/10 text-destructive ring-destructive/25' },
  warning: { label: 'Warning', className: 'bg-warning/10 text-warning ring-warning/25' },
  info: { label: 'Info', className: 'bg-chart-2/10 text-chart-2 ring-chart-2/25' },
}
const SORT_LABELS: Record<SortKey, string> = {
  severity: 'Severity',
  deviation: 'Deviation (σ)',
  recent: 'Most recent',
  node: 'Node name',
}

const selectClass = 'h-8 rounded-md border bg-background px-2 text-xs'

export function AnomalyCenter({
  nodes,
  onSelectNode,
}: {
  nodes: SimulatedNode[]
  onSelectNode: (id: string) => void
}) {
  const anomalies = useMemo(() => detectAnomalies(nodes), [nodes])
  const [severity, setSeverity] = useState<AnomalySeverity | 'all'>('all')
  const [metric, setMetric] = useState<AnomalyMetric | 'all'>('all')
  const [simOnly, setSimOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('severity')

  const visible = useMemo(() => {
    const filtered = anomalies.filter(
      (a) =>
        (severity === 'all' || a.severity === severity) &&
        (metric === 'all' || a.metric === metric) &&
        (!simOnly || a.simulated),
    )
    const compare: Record<SortKey, (a: Anomaly, b: Anomaly) => number> = {
      severity: (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.deviation - a.deviation,
      deviation: (a, b) => b.deviation - a.deviation,
      recent: (a, b) => b.detectedAt - a.detectedAt,
      node: (a, b) => a.nodeName.localeCompare(b.nodeName),
    }
    return [...filtered].sort(compare[sort])
  }, [anomalies, severity, metric, simOnly, sort])

  const counts = useMemo(
    () => ({
      critical: anomalies.filter((a) => a.severity === 'critical').length,
      warning: anomalies.filter((a) => a.severity === 'warning').length,
      info: anomalies.filter((a) => a.severity === 'info').length,
    }),
    [anomalies],
  )

  return (
    <Panel
      id="anomalies"
      title="Anomaly Center"
      description={`${anomalies.length} anomalies detected via z-score against expected baselines`}
      className="xl:h-[520px]"
      bodyClassName="flex min-h-0 flex-col"
      actions={<DataBadge kind="demo" />}
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5 md:px-5">
        <div role="group" aria-label="Filter by severity" className="flex items-center gap-1">
          {(['all', 'critical', 'warning', 'info'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={severity === s}
              onClick={() => setSeverity(s)}
              className={cn(
                'rounded-md px-2 py-1 text-[11px] font-medium capitalize transition-colors',
                severity === s ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s}
              {s !== 'all' ? <span className="ml-1 font-mono tabular-nums opacity-70">{counts[s]}</span> : null}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="anomaly-metric">
          Metric
        </label>
        <select
          id="anomaly-metric"
          value={metric}
          onChange={(e) => setMetric(e.target.value as AnomalyMetric | 'all')}
          className={selectClass}
        >
          <option value="all">All metrics</option>
          {(Object.keys(METRIC_LABELS) as AnomalyMetric[]).map((m) => (
            <option key={m} value={m}>
              {METRIC_LABELS[m]}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
          <ArrowDownWideNarrow aria-hidden="true" className="size-3.5 text-muted-foreground" />
          <label className="sr-only" htmlFor="anomaly-sort">
            Sort by
          </label>
          <select id="anomaly-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selectClass}>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <label className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={simOnly}
            onChange={(e) => setSimOnly(e.target.checked)}
            className="size-3.5 accent-[var(--primary)]"
          />
          Simulated only
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <SearchX aria-hidden="true" className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">No anomalies match these filters</p>
          <p className="text-xs text-muted-foreground">Adjust filters or run a scenario to surface new anomalies.</p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto" aria-label="Anomalies">
          {visible.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onSelectNode(a.nodeId)}
                className="flex w-full flex-col gap-1.5 px-4 py-3 text-left hover:bg-secondary/50 focus-visible:bg-secondary/50 focus-visible:outline-none md:px-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
                      SEVERITY_META[a.severity].className,
                    )}
                  >
                    {SEVERITY_META[a.severity].label}
                  </span>
                  <span className="text-sm font-medium">{a.metricLabel}</span>
                  {a.simulated ? <DataBadge kind="simulated" label="SIM" /> : null}
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {formatRelative(a.detectedAt, BASE_TIME)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground">{a.nodeName}</span> · {REGION_LABELS[a.region]}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums">
                  <span>
                    Observed <span className="font-semibold text-foreground">{a.observed}</span> {a.unit}
                  </span>
                  <span className="text-muted-foreground">
                    Expected {a.expected} {a.unit}
                  </span>
                  <span className="text-warning">{a.deviation.toFixed(1)}σ</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{a.cause}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
