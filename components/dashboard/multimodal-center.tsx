'use client'

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  Filter,
  Fuel,
  Gauge,
  Layers,
  Leaf,
  Navigation,
  Plane,
  RefreshCw,
  Route,
  Shield,
  Ship,
  Sliders,
  Train,
  Truck,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  LOGISTICS_MODES_META,
  NODE_BY_ID,
  ROUTES,
  statusFromRisk,
  type TransportMode,
} from '@/lib/supply-data'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Panel } from './panel'

interface MultimodalCenterProps {
  onOpenRerouteForLane?: (fromId: string, toId: string) => void
  onFilterMapMode?: (mode: TransportMode | 'all') => void
}

const MODE_ICONS: Record<TransportMode, LucideIcon> = {
  sea: Ship,
  air: Plane,
  rail: Train,
  road: Truck,
}

// Representative sample corridors for the modal shift calculator
const SAMPLE_CORRIDORS = [
  {
    id: 'c-asia-europe',
    name: 'East Asia → Northern Europe',
    from: 'Shanghai Port (China)',
    to: 'Port of Rotterdam (Netherlands)',
    distanceKm: 19800,
    fromId: 'shanghai-port',
    toId: 'rotterdam-port',
  },
  {
    id: 'c-transpacific',
    name: 'Trans-Pacific Express Corridor',
    from: 'Shenzhen Hub (China)',
    to: 'Port of Los Angeles (USA)',
    distanceKm: 11600,
    fromId: 'shenzhen-supplier',
    toId: 'la-port',
  },
  {
    id: 'c-transcon-us',
    name: 'US Continental Overland Spine',
    from: 'Port of Los Angeles (USA)',
    to: 'Chicago Logistics Hub (USA)',
    distanceKm: 3300,
    fromId: 'la-port',
    toId: 'chicago-wh',
  },
  {
    id: 'c-pan-euro',
    name: 'Rhine-Alpine European Core',
    from: 'Port of Rotterdam (Netherlands)',
    to: 'Stuttgart Assembly Plant (Germany)',
    distanceKm: 620,
    fromId: 'rotterdam-port',
    toId: 'stuttgart-plant',
  },
]

export function MultimodalCenter({
  onOpenRerouteForLane,
  onFilterMapMode,
}: MultimodalCenterProps) {
  const [activeModeTab, setActiveModeTab] = useState<TransportMode | 'all'>('all')
  const [selectedCorridorIndex, setSelectedCorridorIndex] = useState(0)
  const [cargoVolumeTeu, setCargoVolumeTeu] = useState(150) // TEU consignment

  const currentCorridor = SAMPLE_CORRIDORS[selectedCorridorIndex]

  // Filtered routes list based on selected mode
  const filteredRoutes = useMemo(() => {
    if (activeModeTab === 'all') return ROUTES
    return ROUTES.filter((r) => r.mode === activeModeTab)
  }, [activeModeTab])

  // Aggregate stats across all modes
  const modeAggregates = useMemo(() => {
    return (['sea', 'air', 'rail', 'road'] as const).map((mode) => {
      const modeRoutes = ROUTES.filter((r) => r.mode === mode)
      const totalShipments = modeRoutes.reduce((s, r) => s + r.shipments, 0)
      const avgTransit =
        modeRoutes.reduce((s, r) => s + r.transitDays, 0) / (modeRoutes.length || 1)
      const meta = LOGISTICS_MODES_META[mode]
      return {
        mode,
        meta,
        routesCount: modeRoutes.length,
        totalShipments,
        avgTransit: avgTransit.toFixed(1),
      }
    })
  }, [])

  // Comparative calculations for Modal Shift Calculator
  const modalShiftComparison = useMemo(() => {
    const dist = currentCorridor.distanceKm
    const tons = cargoVolumeTeu * 14 // standard ~14 tons payload per TEU

    return (['sea', 'rail', 'road', 'air'] as const).map((m) => {
      const meta = LOGISTICS_MODES_META[m]
      // Estimated transit days based on distance & realistic terminal transfer dwell
      let transitDays = 0
      let costTotal = 0
      let co2Tons = 0

      if (m === 'sea') {
        transitDays = Math.round((dist / (meta.avgSpeedKmh * 24)) * 1.35) + 3 // +3d port dwell
        costTotal = Math.round(tons * dist * meta.costPerTonKm)
        co2Tons = Math.round((tons * dist * meta.co2PerTonKm) / 1_000_000)
      } else if (m === 'air') {
        transitDays = Math.max(1, Math.round((dist / (meta.avgSpeedKmh * 24)) * 1.2)) + 1 // +1d customs/ramp
        costTotal = Math.round(tons * dist * meta.costPerTonKm)
        co2Tons = Math.round((tons * dist * meta.co2PerTonKm) / 1_000_000)
      } else if (m === 'rail') {
        transitDays = Math.round((dist / (meta.avgSpeedKmh * 24)) * 1.25) + 2 // +2d ramp clearance
        costTotal = Math.round(tons * dist * meta.costPerTonKm)
        co2Tons = Math.round((tons * dist * meta.co2PerTonKm) / 1_000_000)
      } else {
        // road
        transitDays = Math.round((dist / (meta.avgSpeedKmh * 18)) * 1.1) + 1 // driver rest HOS
        costTotal = Math.round(tons * dist * meta.costPerTonKm)
        co2Tons = Math.round((tons * dist * meta.co2PerTonKm) / 1_000_000)
      }

      return {
        mode: m,
        meta,
        transitDays,
        costTotal,
        co2Tons,
        costPerTeu: Math.round(costTotal / cargoVolumeTeu),
        reliabilityPct: meta.reliabilityPct,
      }
    })
  }, [currentCorridor, cargoVolumeTeu])

  return (
    <Panel
      id="multimodal-center"
      title="Multimodal Logistics Operations"
      description="Cross-modal monitoring and comparative trade-offs across Waterways, Airways, Railways, and Roadways"
      className="border-primary/20 shadow-xl"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Mode Filters */}
          <div
            role="group"
            aria-label="Filter logistics mode"
            className="flex items-center rounded-lg border border-border bg-card p-0.5 text-xs"
          >
            <button
              type="button"
              onClick={() => {
                setActiveModeTab('all')
                onFilterMapMode?.('all')
              }}
              className={cn(
                'rounded-md px-2.5 py-1 font-medium transition-colors',
                activeModeTab === 'all'
                  ? 'bg-secondary text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All Modes
            </button>
            {(['sea', 'air', 'rail', 'road'] as const).map((m) => {
              const meta = LOGISTICS_MODES_META[m]
              const Icon = MODE_ICONS[m]
              const active = activeModeTab === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setActiveModeTab(m)
                    onFilterMapMode?.(m)
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors',
                    active
                      ? `${meta.bgClass} ${meta.textClass} shadow-sm border ${meta.borderClass}`
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{meta.label}</span>
                </button>
              )
            })}
          </div>

          <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {ROUTES.length} active corridors
          </span>
        </div>
      }
      bodyClassName="flex flex-col gap-6 p-4 md:p-6"
    >
      {/* 4 Mode Operational Command Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {modeAggregates.map(({ mode, meta, routesCount, totalShipments, avgTransit }) => {
          const Icon = MODE_ICONS[mode]
          const isSelected = activeModeTab === mode
          return (
            <article
              key={mode}
              onClick={() => {
                setActiveModeTab(mode)
                onFilterMapMode?.(mode)
              }}
              className={cn(
                'group relative flex flex-col justify-between rounded-xl border p-4 transition-all cursor-pointer',
                isSelected
                  ? `ring-2 ring-primary/40 ${meta.borderClass} ${meta.bgClass}`
                  : 'border-border bg-card/70 hover:border-border/90 hover:bg-card'
              )}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'flex size-8 items-center justify-center rounded-lg border',
                        meta.bgClass,
                        meta.borderClass,
                        meta.textClass
                      )}
                    >
                      <Icon className="size-4.5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{meta.label}</h3>
                      <p className="text-[11px] text-muted-foreground">{meta.sublabel}</p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                      meta.bgClass,
                      meta.textClass,
                      meta.borderClass,
                      'border'
                    )}
                  >
                    {meta.reliabilityPct}% on-time
                  </span>
                </div>

                <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {meta.tagline}
                </p>

                {/* Key Metrics Grid */}
                <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
                  <div className="rounded-lg bg-background/60 p-2">
                    <dt className="text-[10px] text-muted-foreground">{meta.activeUnitsLabel}</dt>
                    <dd className={cn('mt-0.5 font-mono text-xs font-bold', meta.textClass)}>
                      {meta.activeUnitsCount}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-background/60 p-2">
                    <dt className="text-[10px] text-muted-foreground">{meta.activeVolumeLabel}</dt>
                    <dd className="mt-0.5 font-mono text-xs font-bold text-foreground">
                      {meta.activeVolumeValue}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-background/60 p-2">
                    <dt className="text-[10px] text-muted-foreground">Active Corridors</dt>
                    <dd className="mt-0.5 font-mono text-xs font-semibold text-foreground">
                      {routesCount} lanes ({totalShipments} shipments)
                    </dd>
                  </div>
                  <div className="rounded-lg bg-background/60 p-2">
                    <dt className="text-[10px] text-muted-foreground">Avg Transit</dt>
                    <dd className="mt-0.5 font-mono text-xs font-semibold text-foreground">
                      {avgTransit} days
                    </dd>
                  </div>
                </dl>

                {/* Fuel & Chokepoint badge */}
                <div className="mt-3 flex flex-col gap-1 rounded-md bg-secondary/30 p-2 text-[10px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Fuel className="size-3 text-amber-400 shrink-0" />
                    <span className="font-mono text-foreground/90 truncate">{meta.fuelMetric}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Compass className="size-3 text-primary shrink-0" />
                    <span className="truncate">Chokepoints: {meta.chokepoints.slice(0, 2).join(', ')}</span>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[11px]">
                <span className="text-muted-foreground font-mono">
                  ${meta.costPerTonKm}/t-km · {meta.co2PerTonKm}g CO₂
                </span>
                <span className={cn('font-semibold flex items-center gap-1', meta.textClass)}>
                  Explore Lanes <ArrowRight className="size-3" />
                </span>
              </div>
            </article>
          )
        })}
      </div>

      {/* Interactive Modal Shift & Carbon Trade-Off Simulator */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-card/90 to-background p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-border/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Sliders className="size-4" />
              </span>
              <h3 className="text-sm font-bold text-foreground">
                Modal Shift & Decarbonization Trade-Off Simulator
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Evaluate real-time trade-offs between Waterways, Airways, Railways, and Roadways for freight consignment shifts.
            </p>
          </div>

          {/* Corridor Selection & Consignment Slider */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Corridor:</span>
              <select
                value={selectedCorridorIndex}
                onChange={(e) => setSelectedCorridorIndex(Number(e.target.value))}
                className="h-8 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-foreground"
              >
                {SAMPLE_CORRIDORS.map((c, idx) => (
                  <option key={c.id} value={idx}>
                    {c.name} ({formatNumber(c.distanceKm)} km)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-2.5 py-1 text-xs">
              <span className="text-muted-foreground">Volume:</span>
              <span className="font-mono font-bold text-primary">{cargoVolumeTeu} TEU</span>
              <input
                type="range"
                min={20}
                max={500}
                step={10}
                value={cargoVolumeTeu}
                onChange={(e) => setCargoVolumeTeu(Number(e.target.value))}
                className="h-1.5 w-24 cursor-pointer appearance-none rounded bg-secondary accent-primary"
              />
            </div>
          </div>
        </div>

        {/* 4 Mode Comparative Matrix Cards */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {modalShiftComparison.map((item) => {
            const Icon = MODE_ICONS[item.mode]
            const isFastest = item.mode === 'air'
            const isLowestCost = item.mode === 'sea'
            const isLowestCarbon = item.mode === 'sea'
            const isBalanced = item.mode === 'rail'

            return (
              <div
                key={item.mode}
                className={cn(
                  'flex flex-col justify-between rounded-xl border p-4 transition-all',
                  item.meta.bgClass,
                  item.meta.borderClass
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <Icon className={cn('size-4', item.meta.textClass)} />
                      {item.meta.label}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                        isFastest
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          : isLowestCost
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isBalanced
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-secondary text-muted-foreground'
                      )}
                    >
                      {isFastest
                        ? 'Fastest Transit'
                        : isLowestCost
                        ? 'Lowest Cost & CO₂'
                        : isBalanced
                        ? 'Balanced Spine'
                        : 'Door-to-Door'}
                    </span>
                  </div>

                  <dl className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between rounded bg-background/50 px-2 py-1.5">
                      <dt className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="size-3 text-muted-foreground" /> Transit Time
                      </dt>
                      <dd className="font-mono font-bold text-foreground">
                        ~{item.transitDays} days
                      </dd>
                    </div>

                    <div className="flex items-center justify-between rounded bg-background/50 px-2 py-1.5">
                      <dt className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="size-3 text-muted-foreground" /> Total Freight
                      </dt>
                      <dd className="font-mono font-bold text-foreground">
                        ${formatNumber(item.costTotal)}
                        <span className="text-[10px] font-normal text-muted-foreground ml-1">
                          (${formatNumber(item.costPerTeu)}/TEU)
                        </span>
                      </dd>
                    </div>

                    <div className="flex items-center justify-between rounded bg-background/50 px-2 py-1.5">
                      <dt className="flex items-center gap-1 text-muted-foreground">
                        <Leaf className="size-3 text-emerald-400" /> Carbon Footprint
                      </dt>
                      <dd className="font-mono font-bold text-emerald-400">
                        {formatNumber(item.co2Tons)} t CO₂
                      </dd>
                    </div>

                    <div className="flex items-center justify-between rounded bg-background/50 px-2 py-1.5">
                      <dt className="flex items-center gap-1 text-muted-foreground">
                        <Shield className="size-3 text-primary" /> Reliability
                      </dt>
                      <dd className="font-mono font-bold text-success">
                        {item.reliabilityPct}%
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-4 border-t border-border/50 pt-2">
                  <button
                    type="button"
                    onClick={() => onOpenRerouteForLane?.(currentCorridor.fromId, currentCorridor.toId)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card/80 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                  >
                    <Route className="size-3 text-primary" />
                    Simulate Reroute to {item.meta.label}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filtered Active Corridors Live Table */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Layers className="size-3.5 text-primary" />
              Active Corridors Matrix ({filteredRoutes.length} Lanes Displayed)
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Real-time lane velocity, assigned carrier modes, and active container consignments
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Filter Mode:</span>
            <select
              value={activeModeTab}
              onChange={(e) => {
                const val = e.target.value as TransportMode | 'all'
                setActiveModeTab(val)
                onFilterMapMode?.(val)
              }}
              className="h-7 rounded border border-border bg-card px-2 text-xs font-semibold text-foreground"
            >
              <option value="all">All Modes ({ROUTES.length})</option>
              <option value="sea">Waterways ({ROUTES.filter((r) => r.mode === 'sea').length})</option>
              <option value="air">Airways ({ROUTES.filter((r) => r.mode === 'air').length})</option>
              <option value="rail">Railways ({ROUTES.filter((r) => r.mode === 'rail').length})</option>
              <option value="road">Roadways ({ROUTES.filter((r) => r.mode === 'road').length})</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-3 py-2.5">Corridor Lane</th>
                <th className="px-3 py-2.5">Transport Mode</th>
                <th className="px-3 py-2.5">Active Shipments</th>
                <th className="px-3 py-2.5">Transit Velocity</th>
                <th className="px-3 py-2.5">Endpoint Health</th>
                <th className="px-3 py-2.5 text-right">Dispatch Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              {filteredRoutes.map((route) => {
                const fromNode = NODE_BY_ID[route.from]
                const toNode = NODE_BY_ID[route.to]
                const meta = LOGISTICS_MODES_META[route.mode]
                const Icon = MODE_ICONS[route.mode]
                const fromStatus = statusFromRisk(fromNode?.riskScore || 20)
                const toStatus = statusFromRisk(toNode?.riskScore || 20)
                const hasCritical = fromStatus === 'critical' || toStatus === 'critical'

                return (
                  <tr key={route.id} className="hover:bg-card/80 transition-colors">
                    <td className="px-3 py-2.5 font-sans font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[140px] sm:max-w-none">
                          {fromNode?.name || route.from}
                        </span>
                        <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[140px] sm:max-w-none">
                          {toNode?.name || route.to}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-sans">
                        {fromNode?.city} ({fromNode?.country}) → {toNode?.city} ({toNode?.country})
                      </span>
                    </td>

                    <td className="px-3 py-2.5 font-sans">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                          meta.bgClass,
                          meta.borderClass,
                          meta.textClass
                        )}
                      >
                        <Icon className="size-3" />
                        {meta.label}
                      </span>
                    </td>

                    <td className="px-3 py-2.5 font-semibold text-foreground">
                      {route.shipments} <span className="text-[10px] font-normal text-muted-foreground">TEU</span>
                    </td>

                    <td className="px-3 py-2.5 font-semibold text-foreground">
                      {route.transitDays} <span className="text-[10px] font-normal text-muted-foreground">days</span>
                    </td>

                    <td className="px-3 py-2.5 font-sans">
                      {hasCritical ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive">
                          <AlertTriangle className="size-3" />
                          Bottleneck Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                          <CheckCircle2 className="size-3" />
                          Normal Flow
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => onOpenRerouteForLane?.(route.from, route.to)}
                        className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Route className="size-3" />
                        Reroute
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  )
}
