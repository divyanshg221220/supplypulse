'use client'

import { useCallback, useMemo, useState } from 'react'
import { useSimulatedAlerts } from '@/hooks/use-simulated-alerts'
import { NODE_BY_ID, REGION_LABELS, filterNodesByRegion, type RegionFilter, type SupplyAlert } from '@/lib/supply-data'
import { formatHourOffset } from '@/lib/format'
import { AlertsFeed } from './alerts-feed'
import { AtRiskNodes } from './at-risk-nodes'
import { KpiGrid } from './kpi-grid'
import { MapPanel } from './map-panel'
import { NodeDrawer } from './node-drawer'
import { RiskTimeline } from './risk-timeline'
import { Sidebar } from './sidebar'
import { TopNav } from './top-nav'

export function DashboardShell() {
  const [region, setRegion] = useState<RegionFilter>('all')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { alerts, now, paused, togglePaused, readIds, markRead, markAllRead } = useSimulatedAlerts()

  const nodes = useMemo(() => filterNodesByRegion(region), [region])
  const regionAlerts = useMemo(
    () => (region === 'all' ? alerts : alerts.filter((a) => NODE_BY_ID[a.nodeId]?.region === region)),
    [alerts, region],
  )
  const unreadAlerts = regionAlerts.filter((a) => !readIds.has(a.id)).length

  const closeDrawer = useCallback(() => setSelectedNodeId(null), [])
  const handleSelectAlert = useCallback(
    (alert: SupplyAlert) => {
      markRead(alert.id)
      setSelectedNodeId(alert.nodeId)
    },
    [markRead],
  )

  const openAlerts = () => {
    document.getElementById('alerts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const selectedNode = selectedNodeId ? NODE_BY_ID[selectedNodeId] ?? null : null

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} unreadAlerts={unreadAlerts} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav
          region={region}
          onRegionChange={setRegion}
          onOpenSidebar={() => setSidebarOpen(true)}
          onSelectNode={setSelectedNodeId}
          unreadAlerts={unreadAlerts}
          onOpenAlerts={openAlerts}
        />

        <main id="overview" className="flex flex-col gap-4 p-4 md:gap-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-balance md:text-2xl">
                {REGION_LABELS[region]} supply network
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Snapshot as of {formatHourOffset(0)} UTC · {nodes.length} nodes monitored
              </p>
            </div>
          </div>

          <KpiGrid nodes={nodes} region={region} />

          <div className="grid grid-cols-1 gap-4 md:gap-5 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-8">
              <MapPanel
                nodes={nodes}
                region={region}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            </div>
            <div className="min-w-0 xl:col-span-4">
              <AlertsFeed
                alerts={regionAlerts}
                now={now}
                paused={paused}
                onTogglePaused={togglePaused}
                readIds={readIds}
                onMarkAllRead={markAllRead}
                onSelectAlert={handleSelectAlert}
              />
            </div>
            <div className="min-w-0 xl:col-span-8">
              <RiskTimeline region={region} />
            </div>
            <div className="min-w-0 xl:col-span-4">
              <AtRiskNodes nodes={nodes} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />
            </div>
          </div>
        </main>
      </div>

      <NodeDrawer node={selectedNode} alerts={alerts} onClose={closeDrawer} onSelectNode={setSelectedNodeId} />
    </div>
  )
}
