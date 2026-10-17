'use client'

import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpDown,
  CircleAlert,
  CloudLightning,
  DollarSign,
  Filter,
  Info,
  Landmark,
  MapPin,
  Package,
  Route,
  Search,
  Ship,
  Sparkles,
  Sliders,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  MOCK_ANOMALIES,
  type AnomalyItem,
} from '@/lib/api'
import { formatNumber, formatRelative } from '@/lib/format'
import {
  REGION_LABELS,
  type AlertCategory,
  type AlertSeverity,
  type RegionFilter,
} from '@/lib/supply-data'
import { type SimulationParameters } from '@/lib/simulation-engine'
import { cn } from '@/lib/utils'
import { Panel } from './panel'

interface AnomalyCenterProps {
  onTriggerReroute: (nodeId: string) => void
  onApplySimParams: (params: Partial<SimulationParameters>) => void
  onSelectNode: (nodeId: string) => void
  selectedRegion?: RegionFilter
}

type SortField = 'risk' | 'financial' | 'shipments' | 'recent'

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { label: string; badgeClass: string; icon: LucideIcon }
> = {
  critical: {
    label: 'Critical',
    badgeClass: 'bg-destructive/15 text-destructive border-destructive/30',
    icon: AlertOctagon,
  },
  warning: {
    label: 'Warning',
    badgeClass: 'bg-warning/15 text-warning border-warning/30',
    icon: AlertTriangle,
  },
  info: {
    label: 'Info',
    badgeClass: 'bg-primary/15 text-primary border-primary/30',
    icon: Info,
  },
}

const CATEGORY_ICONS: Record<AlertCategory, LucideIcon> = {
  weather: CloudLightning,
  congestion: Ship,
  supplier: Package,
  transit: CircleAlert,
  quality: AlertTriangle,
  geopolitical: Landmark,
}

export function AnomalyCenter({
  onTriggerReroute,
  onApplySimParams,
  onSelectNode,
  selectedRegion = 'all',
}: AnomalyCenterProps) {
  const [severityFilter, setSeverityFilter] = useState<'all' | AlertSeverity>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | AlertCategory>('all')
  const [regionFilter, setRegionFilter] = useState<RegionFilter>(selectedRegion)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('risk')
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>(MOCK_ANOMALIES)

  // Keep in sync when user switches regional scope in top nav
  useEffect(() => {
    setRegionFilter(selectedRegion)
  }, [selectedRegion])

  // Filtered and Sorted list
  const filteredAnomalies = useMemo(() => {
    let list = [...anomalies]

    if (severityFilter !== 'all') {
      list = list.filter((a) => a.severity === severityFilter)
    }

    if (categoryFilter !== 'all') {
      list = list.filter((a) => a.category === categoryFilter)
    }

    if (regionFilter !== 'all') {
      list = list.filter((a) => a.region === regionFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.nodeName.toLowerCase().includes(q) ||
          a.nodeCity.toLowerCase().includes(q) ||
          a.rootCause.toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'risk':
          return b.riskImpact - a.riskImpact
        case 'financial':
          return b.financialImpactUsd - a.financialImpactUsd
        case 'shipments':
          return b.affectedShipments - a.affectedShipments
        case 'recent':
        default:
          return b.timestamp - a.timestamp
      }
    })

    return list
  }, [anomalies, severityFilter, categoryFilter, regionFilter, searchQuery, sortBy])

  const totalFinancialAtRisk = useMemo(() => {
    return filteredAnomalies.reduce((sum, a) => sum + a.financialImpactUsd, 0)
  }, [filteredAnomalies])

  return (
    <Panel
      id="anomaly-center"
      title="Anomaly Center"
      description="Root-cause classification, disruption telemetry, and automated remediation"
      actions={
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            DEMO DATA
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {filteredAnomalies.length} active anomalies
          </span>
        </div>
      }
      bodyClassName="flex flex-col gap-4 p-4 md:p-5"
    >
      {/* Top Controls: Filter & Sort Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/50 p-3.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search anomalies by node, port, or root cause..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-primary"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <ArrowUpDown className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-[11px] text-muted-foreground">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="h-8 rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground"
            >
              <option value="risk">Risk Impact (High to Low)</option>
              <option value="financial">Financial Exposure ($)</option>
              <option value="shipments">Affected Shipments</option>
              <option value="recent">Most Recent</option>
            </select>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2.5">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Filter className="size-3" /> Severity:
          </div>
          {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(sev)}
              className={cn(
                'rounded-md px-2 py-0.5 text-xs font-medium capitalize transition-colors',
                severityFilter === sev
                  ? 'bg-secondary text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {sev}
            </button>
          ))}

          <span className="text-border">|</span>

          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            Region:
          </div>
          {(['all', 'americas', 'emea', 'apac'] as const).map((reg) => (
            <button
              key={reg}
              type="button"
              onClick={() => setRegionFilter(reg)}
              className={cn(
                'rounded-md px-2 py-0.5 text-xs font-medium capitalize transition-colors',
                regionFilter === reg
                  ? 'bg-secondary text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {REGION_LABELS[reg]}
            </button>
          ))}

          <span className="text-border">|</span>

          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            Category:
          </div>
          {(['all', 'congestion', 'weather', 'supplier', 'geopolitical', 'transit'] as const).map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'rounded-md px-2 py-0.5 text-xs font-medium capitalize transition-colors',
                  categoryFilter === cat
                    ? 'bg-secondary text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {cat}
              </button>
            )
          )}
        </div>
      </div>

      {/* Aggregate Financial & Volume Exposure Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card/60 px-4 py-2 text-xs border border-border/80">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-muted-foreground">Total Filtered Exposure: </span>
            <strong className="font-mono text-destructive">
              ${formatNumber(totalFinancialAtRisk)} USD
            </strong>
          </div>
          <div className="border-l border-border pl-4">
            <span className="text-muted-foreground">Shipments at Risk: </span>
            <strong className="font-mono text-foreground">
              {filteredAnomalies.reduce((s, a) => s + a.affectedShipments, 0)} containers
            </strong>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Showing {filteredAnomalies.length} items
        </span>
      </div>

      {/* Anomaly List */}
      <div className="flex flex-col gap-3">
        {filteredAnomalies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            No active anomalies match your filter criteria.
          </div>
        ) : (
          filteredAnomalies.map((anomaly) => {
            const sev = SEVERITY_CONFIG[anomaly.severity]
            const SevIcon = sev.icon
            const CatIcon = CATEGORY_ICONS[anomaly.category] || Info

            return (
              <article
                key={anomaly.id}
                className="group flex flex-col justify-between gap-3 rounded-xl border border-border bg-card/70 p-4 transition-all hover:border-border/90 hover:bg-card"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  {/* Left info */}
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border',
                        sev.badgeClass
                      )}
                    >
                      <CatIcon className="size-4" />
                    </span>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                            sev.badgeClass
                          )}
                        >
                          {anomaly.severity}
                        </span>
                        <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                          {anomaly.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {REGION_LABELS[anomaly.region]}
                        </span>
                      </div>

                      <h4 className="mt-1 text-sm font-semibold text-foreground leading-snug">
                        {anomaly.title}
                      </h4>

                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => onSelectNode(anomaly.nodeId)}
                          className="flex items-center gap-1 hover:text-primary transition-colors font-medium text-foreground"
                        >
                          <MapPin className="size-3 text-primary" />
                          {anomaly.nodeName} ({anomaly.nodeCity})
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right metrics */}
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Risk Impact</p>
                      <p className="font-mono text-base font-bold text-destructive">
                        {anomaly.riskImpact}
                        <span className="text-xs font-normal text-muted-foreground">/100</span>
                      </p>
                    </div>

                    <div className="border-l border-border pl-3">
                      <p className="text-[10px] text-muted-foreground">Financial Exposure</p>
                      <p className="font-mono text-xs font-semibold text-foreground">
                        ${formatNumber(anomaly.financialImpactUsd)}
                      </p>
                    </div>

                    <div className="border-l border-border pl-3">
                      <p className="text-[10px] text-muted-foreground">Containers</p>
                      <p className="font-mono text-xs font-semibold text-foreground">
                        {anomaly.affectedShipments} TEU
                      </p>
                    </div>
                  </div>
                </div>

                {/* Root cause & recommendation */}
                <div className="rounded-lg bg-background/50 p-2.5 text-xs space-y-1 border border-border/50">
                  <p className="text-muted-foreground">
                    <strong className="text-foreground">Root Cause: </strong>
                    {anomaly.rootCause}
                  </p>
                  <p className="text-muted-foreground">
                    <strong className="text-primary">Recommended Mitigation: </strong>
                    {anomaly.recommendedAction}
                  </p>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
                  <span className="text-[11px] text-muted-foreground">
                    Status: <span className="capitalize font-medium text-foreground">{anomaly.status}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    {anomaly.suggestedSimParams ? (
                      <button
                        type="button"
                        onClick={() => onApplySimParams(anomaly.suggestedSimParams!)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors"
                      >
                        <Sliders className="size-3" />
                        Simulate Incident
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => onTriggerReroute(anomaly.nodeId)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Route className="size-3" />
                      Auto-Reroute Lane
                    </button>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </Panel>
  )
}
