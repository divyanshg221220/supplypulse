'use client'

import dynamic from 'next/dynamic'
import { Plane, Route, Ship, Train, Truck } from 'lucide-react'
import { useState } from 'react'
import { STATUS_META } from '@/lib/format'
import {
  LOGISTICS_MODES_META,
  NODES,
  ROUTES,
  statusFromRisk,
  type NodeStatus,
  type RegionFilter,
  type SupplyNode,
  type TransportMode,
} from '@/lib/supply-data'
import { cn } from '@/lib/utils'
import { Panel } from './panel'

const LogisticsMap = dynamic(() => import('./logistics-map'), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-background/40">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
        Loading network map…
      </div>
    </div>
  ),
})

import { type SimulatedNode } from '@/lib/simulation-engine'

const STATUSES: NodeStatus[] = ['critical', 'watch', 'healthy']
const MODES: TransportMode[] = ['sea', 'air', 'rail', 'road']

const MODE_ICON_MAP = {
  sea: Ship,
  air: Plane,
  rail: Train,
  road: Truck,
}

interface MapPanelProps {
  nodes: (SupplyNode | SimulatedNode)[]
  region: RegionFilter
  selectedNodeId: string | null
  onSelectNode: (id: string) => void
  isSimulated?: boolean
  forcedMode?: TransportMode | 'all'
}

export function MapPanel({
  nodes,
  region,
  selectedNodeId,
  onSelectNode,
  isSimulated = false,
  forcedMode,
}: MapPanelProps) {
  const [showRoutes, setShowRoutes] = useState(true)
  const [statusFilter, setStatusFilter] = useState<Record<NodeStatus, boolean>>({
    critical: true,
    watch: true,
    healthy: true,
  })
  const [modeFilter, setModeFilter] = useState<Record<TransportMode, boolean>>({
    sea: true,
    air: true,
    rail: true,
    road: true,
  })

  // Effective mode filter taking into account forcedMode if set
  const effectiveModeFilter = forcedMode && forcedMode !== 'all'
    ? {
        sea: forcedMode === 'sea',
        air: forcedMode === 'air',
        rail: forcedMode === 'rail',
        road: forcedMode === 'road',
      }
    : modeFilter

  const counts = STATUSES.reduce(
    (acc, status) => {
      acc[status] = nodes.filter((n) => {
        const risk = 'simulatedRiskScore' in n && isSimulated ? n.simulatedRiskScore : n.riskScore
        return statusFromRisk(risk) === status
      }).length
      return acc
    },
    {} as Record<NodeStatus, number>,
  )

  const toggleMode = (m: TransportMode) => {
    setModeFilter((prev) => ({
      ...prev,
      [m]: !prev[m],
    }))
  }

  return (
    <Panel
      id="network-map"
      title={isSimulated ? 'Logistics Network (Simulated)' : 'Logistics Network'}
      description={`${nodes.length} nodes · ${ROUTES.length} active lanes across Waterways, Airways, Railways & Roadways`}
      className="h-[480px] xl:h-[540px]"
      actions={
        <>
          <div role="group" aria-label="Filter nodes by status" className="flex items-center gap-1">
            {STATUSES.map((status) => {
              const meta = STATUS_META[status]
              const active = statusFilter[status]
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter((prev) => ({ ...prev, [status]: !prev[status] }))}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                    active ? 'bg-secondary text-foreground' : 'text-muted-foreground opacity-60 hover:opacity-100',
                  )}
                >
                  <span aria-hidden="true" className={cn('size-2 rounded-full', meta.dotClass)} />
                  {meta.label}
                  <span className="font-mono text-muted-foreground">{counts[status]}</span>
                </button>
              )
            })}
          </div>
          <button
            type="button"
            aria-pressed={showRoutes}
            onClick={() => setShowRoutes((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
              showRoutes ? 'bg-secondary text-foreground' : 'text-muted-foreground',
            )}
          >
            <Route aria-hidden="true" className="size-3.5" />
            Lanes
          </button>
        </>
      }
      bodyClassName="relative overflow-hidden rounded-b-xl"
    >
      <LogisticsMap
        nodes={nodes}
        region={region}
        selectedNodeId={selectedNodeId}
        onSelectNode={onSelectNode}
        showRoutes={showRoutes}
        statusFilter={statusFilter}
        isSimulated={isSimulated}
        modeFilter={effectiveModeFilter}
      />

      {/* Interactive Transport Mode Filter HUD */}
      <div className="absolute bottom-3 left-3 z-[500] rounded-xl border border-border/80 bg-background/90 p-2.5 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 mb-1.5 border-b border-border/60 pb-1">
          <p className="text-[11px] font-bold text-foreground">Logistics Modes</p>
          <button
            type="button"
            onClick={() =>
              setModeFilter({
                sea: true,
                air: true,
                rail: true,
                road: true,
              })
            }
            className="text-[10px] text-primary hover:underline font-medium"
          >
            Show All
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {MODES.map((mode) => {
            const meta = LOGISTICS_MODES_META[mode]
            const Icon = MODE_ICON_MAP[mode]
            const active = effectiveModeFilter[mode]
            const count = ROUTES.filter((r) => r.mode === mode).length

            return (
              <button
                key={mode}
                type="button"
                onClick={() => toggleMode(mode)}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-left text-[11px] font-medium transition-all',
                  active
                    ? 'bg-secondary/80 text-foreground'
                    : 'text-muted-foreground opacity-40 hover:opacity-80'
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    style={{ backgroundColor: active ? meta.colorHex : 'transparent' }}
                    className="flex size-4 items-center justify-center rounded text-black"
                  >
                    <Icon className="size-2.5" />
                  </span>
                  <span>{meta.label}</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">{count} lanes</span>
              </button>
            )
          })}
        </div>
      </div>
    </Panel>
  )
}

