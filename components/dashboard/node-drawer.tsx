'use client'

import { ArrowDownRight, ArrowUpRight, Check, Navigation, UserRound, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { STATUS_META, formatNumber } from '@/lib/format'
import {
  NODE_TYPE_LABELS,
  generateNodeRiskSeries,
  getConnections,
  statusFromRisk,
  type RiskFactor,
  type SupplyAlert,
  type SupplyNode,
} from '@/lib/supply-data'
import { cn } from '@/lib/utils'
import { NodeTypeIcon } from './node-type-icon'
import { StatusBadge } from './status-badge'

interface NodeDrawerProps {
  node: SupplyNode | null
  alerts: SupplyAlert[]
  onClose: () => void
  onSelectNode: (id: string) => void
}

const IMPACT_CLASS: Record<RiskFactor['impact'], string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-warning/10 text-warning',
  low: 'bg-secondary text-muted-foreground',
}

export function NodeDrawer({ node, alerts, onClose, onSelectNode }: NodeDrawerProps) {
  const open = node !== null
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const [lastNode, setLastNode] = useState<SupplyNode | null>(node)
  const [acknowledged, setAcknowledged] = useState<Set<string>>(() => new Set())

  if (node && node !== lastNode) setLastNode(node)
  const displayNode = node ?? lastNode

  useEffect(() => {
    if (!open) return
    returnFocusRef.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      returnFocusRef.current?.focus?.()
    }
  }, [open, onClose])

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-[1300] bg-black/50 backdrop-blur-[2px] transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        inert={!open}
        className={cn(
          'fixed inset-y-0 right-0 z-[1400] flex w-full flex-col border-l bg-card shadow-2xl transition-transform duration-300 ease-out sm:max-w-md',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {displayNode ? (
          <DrawerContent
            node={displayNode}
            alerts={alerts.filter((a) => a.nodeId === displayNode.id)}
            titleId={titleId}
            closeRef={closeRef}
            onClose={onClose}
            onSelectNode={onSelectNode}
            acknowledged={acknowledged.has(displayNode.id)}
            onAcknowledge={() =>
              setAcknowledged((prev) => {
                const next = new Set(prev)
                if (next.has(displayNode.id)) next.delete(displayNode.id)
                else next.add(displayNode.id)
                return next
              })
            }
          />
        ) : null}
      </aside>
    </>
  )
}

function DrawerContent({
  node,
  alerts,
  titleId,
  closeRef,
  onClose,
  onSelectNode,
  acknowledged,
  onAcknowledge,
}: {
  node: SupplyNode
  alerts: SupplyAlert[]
  titleId: string
  closeRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  onSelectNode: (id: string) => void
  acknowledged: boolean
  onAcknowledge: () => void
}) {
  const status = statusFromRisk(node.riskScore)
  const meta = STATUS_META[status]
  const series = useMemo(() => generateNodeRiskSeries(node), [node])
  const { inbound, outbound } = useMemo(() => getConnections(node.id), [node.id])
  const gradientId = useId().replace(/:/g, '')
  const forecastEnd = series[series.length - 1].risk
  const forecastDelta = forecastEnd - node.riskScore

  const metrics = [
    { label: 'Throughput', value: formatNumber(node.throughput), unit: node.throughputUnit },
    { label: 'Capacity used', value: `${node.capacityUtilization}`, unit: '%' },
    { label: 'Buffer cover', value: `${node.bufferDays}`, unit: 'days' },
    { label: 'On-time rate', value: node.onTimeRate.toFixed(1), unit: '%' },
    { label: 'Lead time', value: `${node.leadTimeDays}`, unit: 'days' },
    { label: 'Active shipments', value: `${node.activeShipments}`, unit: '' },
  ]

  return (
    <>
      <header className="flex items-start gap-3 border-b p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          <NodeTypeIcon type={node.type} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {NODE_TYPE_LABELS[node.type]} · {node.city}, {node.country}
          </p>
          <h2 id={titleId} className="mt-0.5 text-base font-semibold leading-snug text-balance">
            {node.name}
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={status} />
            {acknowledged ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                <Check aria-hidden="true" className="size-3" /> Acknowledged
              </span>
            ) : null}
          </div>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X aria-hidden="true" className="size-4" />
          <span className="sr-only">Close node details</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <section aria-label="Risk score" className="border-b p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Composite risk score</p>
              <p className={cn('font-mono text-4xl font-semibold tabular-nums', meta.textClass)}>
                {node.riskScore}
                <span className="text-base font-medium text-muted-foreground">/100</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">72h forecast</p>
              <p
                className={cn(
                  'inline-flex items-center gap-0.5 font-mono text-sm font-semibold tabular-nums',
                  forecastDelta > 0 ? 'text-destructive' : 'text-success',
                )}
              >
                {forecastDelta > 0 ? (
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                ) : (
                  <ArrowDownRight aria-hidden="true" className="size-4" />
                )}
                {forecastEnd} ({forecastDelta > 0 ? '+' : ''}
                {forecastDelta})
              </p>
            </div>
          </div>
          <div className="mt-3 h-28" role="img" aria-label={`Node risk forecast from ${node.riskScore} to ${forecastEnd} over 72 hours`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: -28 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={meta.hex} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={meta.hex} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="hour"
                  type="number"
                  domain={[0, 72]}
                  ticks={[0, 24, 48, 72]}
                  tickFormatter={(h: number) => (h === 0 ? 'Now' : `+${h}h`)}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReferenceLine y={70} stroke="var(--destructive)" strokeDasharray="3 3" strokeOpacity={0.6} />
                <Tooltip
                  cursor={{ stroke: 'var(--muted-foreground)', strokeOpacity: 0.4 }}
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'var(--muted-foreground)' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                  labelFormatter={(h) => (h === 0 ? 'Now' : `+${h}h`)}
                  formatter={(value) => [value, 'Risk']}
                />
                <Area type="monotone" dataKey="risk" stroke={meta.hex} strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section aria-labelledby={`${titleId}-metrics`} className="border-b p-5">
          <h3 id={`${titleId}-metrics`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Operating metrics
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border bg-background/40 px-3 py-2">
                <dt className="text-[11px] text-muted-foreground">{metric.label}</dt>
                <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                  {metric.value}
                  {metric.unit ? <span className="ml-1 text-[11px] font-normal text-muted-foreground">{metric.unit}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby={`${titleId}-factors`} className="border-b p-5">
          <h3 id={`${titleId}-factors`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Risk drivers
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {node.riskFactors.map((factor) => (
              <li key={factor.label} className="flex items-start justify-between gap-3 text-sm">
                <span className="leading-snug">{factor.label}</span>
                <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase', IMPACT_CLASS[factor.impact])}>
                  {factor.impact}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby={`${titleId}-lanes`} className="border-b p-5">
          <h3 id={`${titleId}-lanes`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Connected lanes
          </h3>
          <ul className="mt-3 flex flex-col gap-1">
            {[...inbound.map((c) => ({ ...c, dir: 'in' as const })), ...outbound.map((c) => ({ ...c, dir: 'out' as const }))].map(
              ({ route, node: peer, dir }) => {
                const peerStatus = statusFromRisk(peer.riskScore)
                return (
                  <li key={route.id}>
                    <button
                      type="button"
                      onClick={() => onSelectNode(peer.id)}
                      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-accent/60"
                    >
                      <span
                        className={cn(
                          'w-14 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-medium uppercase',
                          dir === 'in' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground',
                        )}
                      >
                        {dir === 'in' ? 'Inbound' : 'Outbound'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{peer.name}</span>
                        <span className="block text-[11px] capitalize text-muted-foreground">
                          {route.mode} · {route.transitDays}d transit · {route.shipments} shipments
                        </span>
                      </span>
                      <span aria-label={STATUS_META[peerStatus].label} className={cn('size-2 shrink-0 rounded-full', STATUS_META[peerStatus].dotClass)} />
                    </button>
                  </li>
                )
              },
            )}
          </ul>
        </section>

        <section aria-labelledby={`${titleId}-alerts`} className="p-5">
          <h3 id={`${titleId}-alerts`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent alerts
          </h3>
          {alerts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No alerts for this node in the current session.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {alerts.slice(0, 4).map((alert) => (
                <li key={alert.id} className="rounded-lg border bg-background/40 px-3 py-2">
                  <p className="text-sm font-medium leading-snug">{alert.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{alert.description}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <footer className="flex items-center gap-3 border-t p-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted-foreground">
          <UserRound aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">
            Owner: <span className="text-foreground">{node.manager}</span>
          </span>
        </div>
        <a
          href={`https://www.openstreetmap.org/?mlat=${node.lat}&mlon=${node.lng}#map=8/${node.lat}/${node.lng}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
        >
          <Navigation aria-hidden="true" className="size-3.5" />
          OSM
        </a>
        <button
          type="button"
          onClick={onAcknowledge}
          aria-pressed={acknowledged}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
            acknowledged ? 'bg-secondary text-foreground hover:bg-accent' : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          <Check aria-hidden="true" className="size-3.5" />
          {acknowledged ? 'Acknowledged' : 'Acknowledge'}
        </button>
      </footer>
    </>
  )
}
