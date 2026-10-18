'use client'

import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Fuel,
  Info,
  Loader2,
  Navigation,
  Plane,
  RefreshCw,
  Route,
  Shield,
  Ship,
  Train,
  Truck,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import {
  confirmReroute,
  getRouteAlternatives,
  type RerouteConfirmation,
  type ReroutePlan,
  type RouteAlternative,
} from '@/lib/api'
import { formatNumber } from '@/lib/format'
import { NODES, type TransportMode } from '@/lib/supply-data'
import { cn } from '@/lib/utils'

interface RerouteModalProps {
  open: boolean
  onClose: () => void
  initialFromNodeId?: string
  initialToNodeId?: string
  onRerouteConfirmed?: (confirmation: RerouteConfirmation) => void
}

const MODE_ICON: Record<string, LucideIcon> = {
  sea: Ship,
  air: Plane,
  rail: Train,
  road: Truck,
  intermodal: Navigation,
}

export function RerouteModal({
  open,
  onClose,
  initialFromNodeId = 'shanghai-port',
  initialToNodeId = 'rotterdam-port',
  onRerouteConfirmed,
}: RerouteModalProps) {
  const [fromNodeId, setFromNodeId] = useState(initialFromNodeId)
  const [toNodeId, setToNodeId] = useState(initialToNodeId)
  const [plan, setPlan] = useState<ReroutePlan | null>(null)
  const [selectedAltId, setSelectedAltId] = useState<string>('alt-coastal-feeder')
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [confirmation, setConfirmation] = useState<RerouteConfirmation | null>(null)
  const titleId = useId()

  // Sync initial props when opened
  useEffect(() => {
    if (open) {
      const validFrom = initialFromNodeId
      let validTo = initialToNodeId
      if (validTo === validFrom) {
        validTo = NODES.find((n) => n.id !== validFrom)?.id || 'rotterdam-port'
      }
      setFromNodeId(validFrom)
      setToNodeId(validTo)
      setConfirmation(null)
      loadAlternatives(validFrom, validTo)
    }
  }, [open, initialFromNodeId, initialToNodeId])

  const loadAlternatives = async (from: string, to: string) => {
    setLoading(true)
    try {
      const res = await getRouteAlternatives(from, to)
      setPlan(res.data)
      if (res.data.alternatives.length > 0) {
        setSelectedAltId(res.data.alternatives[1]?.id || res.data.alternatives[0].id)
      }
    } catch (e) {
      console.error('Failed to load route alternatives', e)
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteReroute = async () => {
    if (!plan) return
    const selectedAlt = plan.alternatives.find((a) => a.id === selectedAltId)
    if (!selectedAlt) return

    setExecuting(true)
    try {
      // Simulate real-time dispatch handshake
      await new Promise((r) => setTimeout(r, 900))
      const res = await confirmReroute({
        laneId: plan.laneId,
        selectedAlternativeId: selectedAlt.id,
        selectedAlternativeName: selectedAlt.name,
        shipmentsCount: plan.currentRoute.shipments,
      })
      setConfirmation(res.data)
      onRerouteConfirmed?.(res.data)
    } catch (e) {
      console.error('Failed to execute reroute', e)
    } finally {
      setExecuting(false)
    }
  }

  if (!open) return null

  const selectedAlt = plan?.alternatives.find((a) => a.id === selectedAltId)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[1500] flex items-center justify-center p-3 sm:p-4 md:p-6"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border bg-secondary/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-inset ring-primary/30">
              <Route aria-hidden="true" className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id={titleId} className="text-base font-semibold tracking-tight text-foreground">
                  Automated Rerouting Engine
                </h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  Multi-Criteria Solver
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Evaluates transit time, freight cost, carbon emissions, and meteorological risk trade-offs.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Close reroute modal</span>
          </button>
        </header>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Lane selection & current bottleneck info */}
          <div className="mb-5 rounded-xl border border-border bg-background/50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Corridor:</span>
                <select
                  value={fromNodeId}
                  onChange={(e) => {
                    const newFrom = e.target.value
                    setFromNodeId(newFrom)
                    let nextTo = toNodeId
                    if (nextTo === newFrom) {
                      const altTo = NODES.find((n) => n.id !== newFrom)?.id || ''
                      nextTo = altTo
                      setToNodeId(altTo)
                    }
                    loadAlternatives(newFrom, nextTo)
                  }}
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground"
                >
                  {NODES.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.city})
                    </option>
                  ))}
                </select>
                <ArrowRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
                <select
                  value={toNodeId}
                  onChange={(e) => {
                    setToNodeId(e.target.value)
                    loadAlternatives(fromNodeId, e.target.value)
                  }}
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground"
                >
                  {NODES.filter((n) => n.id !== fromNodeId).map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.city})
                    </option>
                  ))}
                </select>
              </div>

              {plan ? (
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                    <AlertTriangle aria-hidden="true" className="size-3" />
                    Current Risk: {plan.currentRoute.currentRisk}/100
                  </span>
                  <span className="text-muted-foreground">
                    Active Shipments: <strong className="text-foreground">{plan.currentRoute.shipments}</strong>
                  </span>
                </div>
              ) : null}
            </div>

            {plan ? (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive/90 border border-destructive/15">
                <Info aria-hidden="true" className="size-4 shrink-0" />
                <span>
                  <strong>Identified Disruption:</strong> {plan.currentRoute.bottleneck}. Baseline transit: {plan.currentRoute.transitDays} days.
                </span>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <Loader2 aria-hidden="true" className="size-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Calculating optimal corridor diversions...</p>
            </div>
          ) : confirmation ? (
            /* Confirmation View */
            <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-center animate-in fade-in zoom-in-95">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/20 text-success">
                <CheckCircle2 aria-hidden="true" className="size-7" />
              </div>
              <h3 className="mt-3 text-lg font-semibold text-foreground">
                Reroute Plan Confirmed & Dispatched
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Electronic dispatch manifest committed locally to active tracking stream.
              </p>

              <div className="mx-auto mt-5 max-w-lg divide-y divide-border rounded-lg border border-border bg-card p-4 text-left text-xs">
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Tracking ID</span>
                  <span className="font-mono font-semibold text-primary">{confirmation.trackingId}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Selected Alternative</span>
                  <span className="font-medium text-foreground">{confirmation.selectedAlternativeName}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Dispatched Volume</span>
                  <span className="font-medium text-foreground">{confirmation.dispatchedShipments} containers</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Estimated Arrival</span>
                  <span className="font-mono text-foreground">
                    {new Date(confirmation.estimatedArrival).toLocaleDateString()} UTC
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Dispatch Authority</span>
                  <span className="font-medium text-foreground">{confirmation.operator}</span>
                </div>
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmation(null)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary"
                >
                  Select Another Alternative
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : plan ? (
            /* Three Route Alternatives Selection */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  3 Route Alternatives (Select to Compare)
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Ranked by composite cost/risk resilience score
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
                {plan.alternatives.map((alt) => {
                  const isSelected = alt.id === selectedAltId
                  const Icon = MODE_ICON[alt.mode] || Navigation
                  return (
                    <article
                      key={alt.id}
                      onClick={() => setSelectedAltId(alt.id)}
                      className={cn(
                        'relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all',
                        isSelected
                          ? 'border-primary bg-primary/[0.04] ring-2 ring-primary/40 shadow-lg'
                          : 'border-border bg-card/60 hover:border-border/80 hover:bg-accent/40'
                      )}
                    >
                      {/* Top badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                              alt.badge === 'Recommended'
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : alt.badge === 'Fastest Express'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            )}
                          >
                            {alt.badge}
                          </span>
                          <span className="rounded bg-secondary/80 px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase text-muted-foreground flex items-center gap-1">
                            <Icon className="size-2.5" />
                            {alt.mode === 'sea'
                              ? 'Waterway'
                              : alt.mode === 'air'
                              ? 'Airway'
                              : alt.mode === 'rail'
                              ? 'Railway'
                              : alt.mode === 'road'
                              ? 'Roadway'
                              : 'Intermodal'}
                          </span>
                        </div>

                        <div
                          className={cn(
                            'flex size-5 items-center justify-center rounded-full border transition-colors',
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/30 bg-transparent'
                          )}
                        >
                          {isSelected ? <Check aria-hidden="true" className="size-3" /> : null}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-start gap-2">
                          <Icon aria-hidden="true" className="size-4 text-primary shrink-0 mt-0.5" />
                          <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 min-h-[2.5rem]">
                            {alt.name}
                          </h4>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {alt.tradeoffSummary}
                        </p>
                      </div>

                      {/* Trade-off metrics grid */}
                      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-3">
                        <div className="rounded-lg bg-background/60 p-2 flex flex-col justify-between min-w-0">
                          <dt className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                            <Clock aria-hidden="true" className="size-3 shrink-0" />
                            <span className="truncate">Transit</span>
                          </dt>
                          <dd className="mt-1 flex flex-col min-w-0">
                            <span className="font-mono text-xs font-bold text-foreground truncate">
                              {alt.transitDays}d
                            </span>
                            <span
                              className={cn(
                                'text-[10px] font-mono leading-none mt-0.5 font-medium truncate',
                                alt.transitDaysDelta <= 0 ? 'text-success' : 'text-destructive'
                              )}
                            >
                              {alt.transitDaysDelta > 0 ? '+' : ''}{alt.transitDaysDelta}d
                            </span>
                          </dd>
                        </div>

                        <div className="rounded-lg bg-background/60 p-2 flex flex-col justify-between min-w-0">
                          <dt className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                            <DollarSign aria-hidden="true" className="size-3 shrink-0" />
                            <span className="truncate">Cost</span>
                          </dt>
                          <dd className="mt-1 flex flex-col min-w-0">
                            <span className="font-mono text-xs font-bold text-foreground truncate">
                              ${formatNumber(alt.costEstimateUsd)}
                            </span>
                            <span
                              className={cn(
                                'text-[10px] font-mono leading-none mt-0.5 font-medium truncate',
                                alt.costDeltaPct <= 0 ? 'text-success' : 'text-amber-400'
                              )}
                            >
                              {alt.costDeltaPct > 0 ? '+' : ''}{alt.costDeltaPct}%
                            </span>
                          </dd>
                        </div>

                        <div className="rounded-lg bg-background/60 p-2 flex flex-col justify-between min-w-0">
                          <dt className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                            <Shield aria-hidden="true" className="size-3 shrink-0" />
                            <span className="truncate">Risk</span>
                          </dt>
                          <dd className="mt-1 flex flex-col min-w-0">
                            <span className="font-mono text-xs font-bold text-success truncate">
                              {alt.riskScore}/100
                            </span>
                            <span className="text-[10px] font-mono leading-none mt-0.5 text-success font-medium truncate">
                              {alt.riskDelta} pts
                            </span>
                          </dd>
                        </div>
                      </dl>
                    </article>
                  )
                })}
              </div>

              {/* Detailed Path & Benefit Breakdown for Selected Alternative */}
              {selectedAlt ? (
                <div className="mt-2 rounded-xl border border-border bg-secondary/20 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Selected Strategy</p>
                      <h4 className="text-sm font-semibold text-foreground">{selectedAlt.name}</h4>
                      <p className="text-xs text-muted-foreground">Primary Carrier: <span className="text-foreground">{selectedAlt.carrier}</span></p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div>
                        <span className="text-muted-foreground">CO2 Emissions: </span>
                        <strong className="text-foreground">{selectedAlt.co2Tons} tons</strong>
                        <span className={cn('ml-1 text-[11px]', selectedAlt.co2DeltaPct <= 0 ? 'text-success' : 'text-amber-400')}>
                          ({selectedAlt.co2DeltaPct > 0 ? '+' : ''}{selectedAlt.co2DeltaPct}%)
                        </span>
                      </div>
                      <div className="border-l border-border pl-4">
                        <span className="text-muted-foreground">Reliability: </span>
                        <strong className="text-success">{selectedAlt.reliabilityPct}%</strong>
                      </div>
                    </div>
                  </div>

                  {/* Waypoint Itinerary */}
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Optimized Itinerary & Waypoint Clearance
                    </p>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {selectedAlt.checkpoints.map((cp, idx) => (
                        <div key={cp.name} className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-background/50 p-2.5">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[10px] font-semibold text-muted-foreground">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-foreground">{cp.name}</p>
                            <p className="text-[11px] text-muted-foreground">{cp.type}</p>
                            <p className="mt-0.5 text-[10px] font-mono text-primary">Dwell est: ~{cp.dwellHours}h</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Benefits */}
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Operational Guarantees
                    </p>
                    <ul className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-3">
                      {selectedAlt.keyBenefits.map((b) => (
                        <li key={b} className="flex items-center gap-2 text-xs text-foreground/90">
                          <Check className="size-3.5 shrink-0 text-success" />
                          <span className="truncate">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {!confirmation ? (
          <footer className="flex items-center justify-between border-t border-border bg-secondary/30 px-5 py-3.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-primary" />
              <span>Deterministic cost-risk frontier applied</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReroute}
                disabled={executing || !selectedAlt}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {executing ? (
                  <>
                    <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                    Committing Dispatch...
                  </>
                ) : (
                  <>
                    <Check aria-hidden="true" className="size-3.5" />
                    Confirm & Execute Reroute
                  </>
                )}
              </button>
            </div>
          </footer>
        ) : null}
      </div>
    </div>
  )
}
