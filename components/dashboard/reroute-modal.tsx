'use client'

import { ArrowRight, Check, CheckCircle2, Clock, DollarSign, Loader2, ShieldAlert, Sparkles, Undo2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { confirmReroute as confirmRerouteApi } from '@/lib/api'
import { formatNumber } from '@/lib/format'
import {
  MODE_LABELS,
  buildRerouteProposal,
  laneRisks,
  type ConfirmedReroute,
  type CurrentLane,
  type RerouteOption,
} from '@/lib/reroute'
import type { ScenarioParams, SimulatedNode } from '@/lib/simulation'
import { NODE_BY_ID, ROUTES, statusFromRisk } from '@/lib/supply-data'
import { cn } from '@/lib/utils'
import { DataBadge } from './data-badge'
import { STATUS_META } from '@/lib/format'

interface RerouteModalProps {
  open: boolean
  initialRouteId: string | null
  nodesById: Record<string, SimulatedNode>
  params: ScenarioParams
  reroutes: Record<string, ConfirmedReroute>
  onClose: () => void
  onConfirm: (reroute: ConfirmedReroute) => void
  onRevert: (routeId: string) => void
}

type Status = { kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string } | { kind: 'done'; reroute: ConfirmedReroute }

const usd = (v: number) => `$${formatNumber(Math.round(v))}`

export function RerouteModal({
  open,
  initialRouteId,
  nodesById,
  params,
  reroutes,
  onClose,
  onConfirm,
  onRevert,
}: RerouteModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const lanes = useMemo(() => laneRisks(nodesById), [nodesById])
  const [routeId, setRouteId] = useState<string | null>(initialRouteId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [lastOpen, setLastOpen] = useState(open)

  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setRouteId(initialRouteId ?? lanes[0]?.route.id ?? null)
      setSelectedId(null)
      setStatus({ kind: 'idle' })
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const route = routeId ? ROUTES.find((r) => r.id === routeId) ?? null : null
  const proposal = useMemo(
    () => (route ? buildRerouteProposal(route, nodesById, params) : null),
    [route, nodesById, params],
  )
  const recommendedId = proposal?.options.find((o) => o.recommended)?.id ?? null
  const activeId = selectedId ?? recommendedId
  const activeOption = proposal?.options.find((o) => o.id === activeId) ?? null
  const existing = routeId ? reroutes[routeId] : undefined

  const handleConfirm = async () => {
    if (!proposal || !activeOption) return
    setStatus({ kind: 'saving' })
    try {
      const result = await confirmRerouteApi(proposal.routeId, activeOption)
      const reroute: ConfirmedReroute = {
        routeId: proposal.routeId,
        riskyNodeId: proposal.riskyNodeId,
        option: activeOption,
        confirmationId: result.data.confirmationId,
        confirmedAt: result.data.confirmedAt,
        source: result.source,
      }
      onConfirm(reroute)
      setStatus({ kind: 'done', reroute })
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Could not confirm reroute' })
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="reroute-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="m-auto max-h-[92dvh] w-[min(960px,calc(100vw-1.5rem))] overflow-hidden rounded-xl border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-background/70 backdrop:backdrop-blur-sm"
    >
      {open ? (
        <div className="flex max-h-[92dvh] flex-col">
          <header className="flex items-start justify-between gap-3 border-b px-4 py-3 md:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="reroute-title" className="text-base font-semibold tracking-tight">
                  Automated rerouting
                </h2>
                <DataBadge kind="simulated" />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Compare three alternatives for a lane. Figures are simulated estimates, not carrier quotes.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X aria-hidden="true" className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-4 px-4 py-4 md:px-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reroute-lane" className="text-xs font-medium text-muted-foreground">
                  Lane
                </label>
                <select
                  id="reroute-lane"
                  value={routeId ?? ''}
                  onChange={(e) => {
                    setRouteId(e.target.value)
                    setSelectedId(null)
                    setStatus({ kind: 'idle' })
                  }}
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                >
                  {lanes.map(({ route: r, risk }) => (
                    <option key={r.id} value={r.id}>
                      {NODE_BY_ID[r.from].city} → {NODE_BY_ID[r.to].city} · {MODE_LABELS[r.mode]} · risk {risk}
                      {reroutes[r.id] ? ' · rerouted' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {proposal ? (
                <>
                  <CurrentLaneCard current={proposal.current} riskyNodeId={proposal.riskyNodeId} />

                  <fieldset>
                    <legend className="mb-2 text-xs font-medium text-muted-foreground">Alternatives</legend>
                    <div role="radiogroup" className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {proposal.options.map((option) => (
                        <OptionCard
                          key={option.id}
                          option={option}
                          current={proposal.current}
                          selected={option.id === activeId}
                          onSelect={() => {
                            setSelectedId(option.id)
                            if (status.kind !== 'saving') setStatus({ kind: 'idle' })
                          }}
                        />
                      ))}
                    </div>
                  </fieldset>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select a lane to see alternatives.</p>
              )}
            </div>
          </div>

          <footer className="flex flex-col gap-3 border-t px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
            <div className="min-w-0 text-xs" aria-live="polite">
              {status.kind === 'done' ? (
                <p className="flex items-center gap-1.5 text-success">
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                  Confirmed {status.reroute.confirmationId}
                  {status.reroute.source === 'demo' ? ' (local demo — not sent to a backend)' : ''}. Map and risk updated.
                </p>
              ) : status.kind === 'error' ? (
                <p className="text-destructive">{status.message}</p>
              ) : existing ? (
                <p className="text-muted-foreground">
                  Currently rerouted via <span className="text-foreground">{existing.option.title}</span> (
                  {existing.confirmationId}).
                </p>
              ) : (
                <p className="text-muted-foreground">Confirmation is stored locally for this session.</p>
              )}
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">
              {existing ? (
                <button
                  type="button"
                  onClick={() => {
                    onRevert(existing.routeId)
                    setStatus({ kind: 'idle' })
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-secondary"
                >
                  <Undo2 aria-hidden="true" className="size-4" />
                  Revert
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-secondary"
              >
                {status.kind === 'done' ? 'Done' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!activeOption || status.kind === 'saving' || existing?.option.id === activeOption.id}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              >
                {status.kind === 'saving' ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <Check aria-hidden="true" className="size-4" />
                )}
                {status.kind === 'saving' ? 'Confirming…' : 'Confirm reroute'}
              </button>
            </div>
          </footer>
        </div>
      ) : null}
    </dialog>
  )
}

function PathLabel({ path }: { path: string[] }) {
  return (
    <span className="flex flex-wrap items-center gap-1 text-xs">
      {path.map((id, i) => (
        <span key={`${id}-${i}`} className="flex items-center gap-1">
          {i > 0 ? <ArrowRight aria-hidden="true" className="size-3 text-muted-foreground" /> : null}
          <span>{NODE_BY_ID[id]?.city ?? id}</span>
        </span>
      ))}
    </span>
  )
}

function CurrentLaneCard({ current, riskyNodeId }: { current: CurrentLane; riskyNodeId: string }) {
  const meta = STATUS_META[statusFromRisk(current.riskScore)]
  return (
    <div className="rounded-lg border bg-background/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Current lane</p>
        <p className="text-[11px] text-muted-foreground">
          Bottleneck: <span className="text-foreground">{NODE_BY_ID[riskyNodeId].name}</span>
        </p>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
        <PathLabel path={current.path} />
        <dl className="flex gap-4 text-xs">
          <Metric label="Mode" value={MODE_LABELS[current.mode]} />
          <Metric label="Transit" value={`${current.transitDays}d`} />
          <Metric label="Cost" value={usd(current.costUsd)} />
          <Metric label="Risk" value={`${current.riskScore}`} valueClass={meta.textClass} />
        </dl>
      </div>
    </div>
  )
}

function Metric({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className={cn('font-mono font-semibold tabular-nums', valueClass)}>{value}</dd>
    </div>
  )
}

function Delta({ value, suffix, format }: { value: number; suffix?: string; format?: (v: number) => string }) {
  if (Math.abs(value) < 0.05) return <span className="text-muted-foreground">±0</span>
  const better = value < 0
  return (
    <span className={better ? 'text-success' : 'text-destructive'}>
      {value > 0 ? '+' : '−'}
      {format ? format(Math.abs(value)) : Math.abs(value).toFixed(1).replace(/\.0$/, '')}
      {suffix}
    </span>
  )
}

function OptionCard({
  option,
  current,
  selected,
  onSelect,
}: {
  option: RerouteOption
  current: CurrentLane
  selected: boolean
  onSelect: () => void
}) {
  const meta = STATUS_META[statusFromRisk(option.riskScore)]
  const rows = [
    { icon: Clock, label: 'Transit', value: `${option.transitDays}d`, delta: <Delta value={option.transitDays - current.transitDays} suffix="d" /> },
    { icon: DollarSign, label: 'Cost', value: usd(option.costUsd), delta: <Delta value={option.costUsd - current.costUsd} format={usd} /> },
    { icon: ShieldAlert, label: 'Risk', value: `${option.riskScore}`, delta: <Delta value={option.riskScore - current.riskScore} />, valueClass: meta.textClass },
  ]
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex h-full flex-col gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-secondary/50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{option.title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{MODE_LABELS[option.mode]}</p>
        </div>
        <span
          aria-hidden="true"
          className={cn(
            'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
            selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
          )}
        >
          {selected ? <Check className="size-3" /> : null}
        </span>
      </div>
      {option.recommended ? (
        <span className="inline-flex w-fit items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
          <Sparkles aria-hidden="true" className="size-3" />
          Recommended
        </span>
      ) : null}
      <PathLabel path={option.path} />
      <dl className="flex flex-col gap-1.5 border-t pt-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2 text-xs">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <row.icon aria-hidden="true" className="size-3.5" />
              {row.label}
            </dt>
            <dd className="flex items-baseline gap-2 font-mono tabular-nums">
              <span className={cn('font-semibold', row.valueClass)}>{row.value}</span>
              <span className="text-[11px]">{row.delta}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-[11px] text-muted-foreground">{option.summary}</p>
      {option.tradeoffs.length ? (
        <ul className="flex flex-col gap-1 text-[11px] text-muted-foreground">
          {option.tradeoffs.map((t) => (
            <li key={t} className="flex gap-1.5">
              <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
              {t}
            </li>
          ))}
        </ul>
      ) : null}
    </button>
  )
}
