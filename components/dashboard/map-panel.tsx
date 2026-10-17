'use client'

import dynamic from 'next/dynamic'
import { Route, Shuffle } from 'lucide-react'
import { useState } from 'react'
import { STATUS_META } from '@/lib/format'
import type { ConfirmedReroute } from '@/lib/reroute'
import type { SimulatedNode } from '@/lib/simulation'
import { NODES, ROUTES, statusFromRisk, type NodeStatus, type RegionFilter } from '@/lib/supply-data'
import { DataBadge } from './data-badge'
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

const STATUSES: NodeStatus[] = ['critical', 'watch', 'healthy']

interface MapPanelProps {
  nodes: SimulatedNode[]
  nodesById: Record<string, SimulatedNode>
  reroutes: Record<string, ConfirmedReroute>
  simulated: boolean
  region: RegionFilter
  selectedNodeId: string | null
  onSelectNode: (id: string) => void
  onOpenReroute: () => void
}

export function MapPanel({
  nodes,
  nodesById,
  reroutes,
  simulated,
  region,
  selectedNodeId,
  onSelectNode,
  onOpenReroute,
}: MapPanelProps) {
  const [showRoutes, setShowRoutes] = useState(true)
  const [statusFilter, setStatusFilter] = useState<Record<NodeStatus, boolean>>({
    critical: true,
    watch: true,
    healthy: true,
  })

  const counts = STATUSES.reduce(
    (acc, status) => {
      acc[status] = NODES.filter((n) => statusFromRisk(nodesById[n.id].riskScore) === status).length
      return acc
    },
    {} as Record<NodeStatus, number>,
  )

  return (
    <Panel
      id="network-map"
      title="Logistics Network"
      description={`${NODES.length} nodes · ${ROUTES.length} active lanes · click a node for details`}
      className="h-[460px] xl:h-[520px]"
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
          <button
            type="button"
            onClick={onOpenReroute}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Shuffle aria-hidden="true" className="size-3.5" />
            Reroute
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
        nodesById={nodesById}
        reroutes={reroutes}
      />
      <div className="pointer-events-none absolute right-3 top-3 z-[500] flex flex-col items-end gap-1">
        <DataBadge kind="demo" className="bg-background/85 backdrop-blur" />
        {simulated ? <DataBadge kind="simulated" label="SIMULATED RISK" className="bg-background/85 backdrop-blur" /> : null}
        {Object.keys(reroutes).length > 0 ? (
          <span className="rounded bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-primary ring-1 ring-inset ring-primary/30 backdrop-blur">
            {Object.keys(reroutes).length} reroute{Object.keys(reroutes).length === 1 ? '' : 's'} applied
          </span>
        ) : null}
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] hidden rounded-lg border bg-background/85 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur sm:block">
        <p className="mb-1 font-medium text-foreground">Lane mode</p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
          <LegendLine label="Sea" dash="5 4" />
          <LegendLine label="Air" dash="1.5 4" />
          <LegendLine label="Rail" dash="8 3" />
          <LegendLine label="Road" />
        </ul>
      </div>
    </Panel>
  )
}

function LegendLine({ label, dash }: { label: string; dash?: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <svg width="22" height="6" aria-hidden="true">
        <line x1="0" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray={dash} />
      </svg>
      {label}
    </li>
  )
}
