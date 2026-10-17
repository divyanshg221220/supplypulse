'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  CloudLightning,
  RotateCcw,
  Route,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react'
import { useSimulatedAlerts } from '@/hooks/use-simulated-alerts'
import {
  DEFAULT_SIMULATION_PARAMS,
  isSimulationActive,
  recalculateNetworkSimulation,
  type PresetScenario,
  type SimulationParameters,
} from '@/lib/simulation-engine'
import {
  NODE_BY_ID,
  NODES,
  REGION_LABELS,
  filterNodesByRegion,
  type RegionFilter,
  type SupplyAlert,
  type TransportMode,
} from '@/lib/supply-data'
import { formatHourOffset } from '@/lib/format'
import { cn } from '@/lib/utils'
import { type RerouteConfirmation } from '@/lib/api'
import { AlertsFeed } from './alerts-feed'
import { AnomalyCenter } from './anomaly-center'
import { AtRiskNodes } from './at-risk-nodes'
import { EventIntelligence } from './event-intelligence'
import { KpiGrid } from './kpi-grid'
import { MapPanel } from './map-panel'
import { MultimodalCenter } from './multimodal-center'
import { NodeDrawer } from './node-drawer'
import { RerouteModal } from './reroute-modal'
import { RiskTimeline } from './risk-timeline'
import { ScenarioSimulator } from './scenario-simulator'
import { Sidebar } from './sidebar'
import { TopNav } from './top-nav'

export function DashboardShell() {
  const [region, setRegion] = useState<RegionFilter>('all')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { alerts, now, paused, togglePaused, readIds, markRead, markAllRead } =
    useSimulatedAlerts()

  // What-If Simulation State
  const [simParams, setSimParams] = useState<SimulationParameters>(DEFAULT_SIMULATION_PARAMS)
  const [activePresetId, setActivePresetId] = useState<string | null>(null)

  // Automated Rerouting Modal State
  const [rerouteModalOpen, setRerouteModalOpen] = useState(false)
  const [rerouteFromNodeId, setRerouteFromNodeId] = useState('shanghai-port')
  const [rerouteToNodeId, setRerouteToNodeId] = useState('rotterdam-port')
  const [lastRerouteNotice, setLastRerouteNotice] = useState<RerouteConfirmation | null>(null)

  // Active view section tab filter for fast jumping
  const [activeTab, setActiveTab] = useState<'all' | 'overview' | 'multimodal' | 'simulator' | 'anomalies' | 'ai'>('all')

  // Transport Mode Filter synced with map
  const [mapMode, setMapMode] = useState<TransportMode | 'all'>('all')

  const openRerouteForLane = (fromId: string, toId: string) => {
    setRerouteFromNodeId(fromId)
    setRerouteToNodeId(toId)
    setRerouteModalOpen(true)
  }

  // Deterministic Recalculation Engine
  const simulationResult = useMemo(
    () => recalculateNetworkSimulation(NODES, simParams),
    [simParams]
  )
  const isSimulated = simulationResult.isModified

  // Filter nodes by current region and simulated overrides
  const baseRegionNodes = useMemo(() => filterNodesByRegion(region), [region])
  const activeNodes = useMemo(() => {
    if (!isSimulated) return baseRegionNodes
    return simulationResult.nodes.filter((n) => region === 'all' || n.region === region)
  }, [baseRegionNodes, isSimulated, simulationResult.nodes, region])

  const regionAlerts = useMemo(
    () => (region === 'all' ? alerts : alerts.filter((a) => NODE_BY_ID[a.nodeId]?.region === region)),
    [alerts, region]
  )
  const unreadAlerts = regionAlerts.filter((a) => !readIds.has(a.id)).length

  const closeDrawer = useCallback(() => setSelectedNodeId(null), [])
  const handleSelectAlert = useCallback(
    (alert: SupplyAlert) => {
      markRead(alert.id)
      setSelectedNodeId(alert.nodeId)
    },
    [markRead]
  )

  const openAlerts = () => {
    document.getElementById('alerts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openRerouteForNode = (nodeId: string) => {
    setRerouteFromNodeId(nodeId)
    // Pick suitable peer node
    const peerId = nodeId === 'shanghai-port' ? 'rotterdam-port' : 'shanghai-port'
    setRerouteToNodeId(peerId)
    setRerouteModalOpen(true)
  }

  const handleApplySimParams = (params: Partial<SimulationParameters>) => {
    setSimParams((prev) => ({
      ...prev,
      ...params,
    }))
    setActivePresetId(null)
    document.getElementById('scenario-simulator')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleApplyFullSimParams = (params: SimulationParameters) => {
    setSimParams(params)
    setActivePresetId(null)
    document.getElementById('scenario-simulator')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleResetSimulation = () => {
    setSimParams(DEFAULT_SIMULATION_PARAMS)
    setActivePresetId(null)
  }

  // Selected node taking into account simulation state
  const selectedNode = selectedNodeId
    ? isSimulated
      ? simulationResult.nodeById[selectedNodeId] || NODE_BY_ID[selectedNodeId] || null
      : NODE_BY_ID[selectedNodeId] || null
    : null

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        unreadAlerts={unreadAlerts}
        onOpenRerouteModal={() => setRerouteModalOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav
          region={region}
          onRegionChange={setRegion}
          onOpenSidebar={() => setSidebarOpen(true)}
          onSelectNode={setSelectedNodeId}
          unreadAlerts={unreadAlerts}
          onOpenAlerts={openAlerts}
          onOpenRerouteModal={() => setRerouteModalOpen(true)}
          isSimulated={isSimulated}
          onOpenSimulator={() =>
            document.getElementById('scenario-simulator')?.scrollIntoView({ behavior: 'smooth' })
          }
        />

        {/* Global Reroute Confirmation Toast Banner */}
        {lastRerouteNotice ? (
          <div className="mx-4 mt-4 flex items-center justify-between rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-xs text-success shadow-lg md:mx-6 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>
                <strong>Reroute Dispatched:</strong> Tracking manifest <code>{lastRerouteNotice.trackingId}</code> confirmed for {lastRerouteNotice.selectedAlternativeName}.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLastRerouteNotice(null)}
              className="rounded p-1 hover:bg-success/20 text-success"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}

        {/* Active Simulation Warning Banner */}
        {isSimulated ? (
          <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300 md:mx-6 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0 text-amber-400 animate-pulse" />
              <span>
                <strong>WHAT-IF SCENARIO ACTIVE:</strong> Stress vectors applied. Map markers, risk ratings, and KPI metrics are visibly updated with simulated values.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRerouteModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/30 transition-colors"
              >
                <Route className="size-3" />
                Test Corridor Reroute
              </button>
              <button
                type="button"
                onClick={handleResetSimulation}
                className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/30 transition-colors"
              >
                <RotateCcw className="size-3" />
                Reset to Baseline
              </button>
            </div>
          </div>
        ) : null}

        <main id="overview" className="flex flex-col gap-5 p-4 md:gap-6 md:p-6">
          {/* Header Title & Section Quick Tabs */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-balance md:text-2xl text-foreground">
                  {REGION_LABELS[region]} Supply Network Command
                </h2>
                {isSimulated ? (
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/30">
                    SIMULATED RUN
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Snapshot as of {formatHourOffset(0)} UTC · {activeNodes.length} nodes monitored · {isSimulated ? 'Recalculated under simulated stress' : 'Live operational telemetry'}
              </p>
            </div>

            {/* Quick Section Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('all')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  activeTab === 'all'
                    ? 'bg-secondary text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                All Views
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('overview')
                  document.getElementById('network-map')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  activeTab === 'overview'
                    ? 'bg-secondary text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Network Map
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('multimodal')
                  document.getElementById('multimodal-center')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  activeTab === 'multimodal'
                    ? 'bg-secondary text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Logistics Modes
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('simulator')
                  document.getElementById('scenario-simulator')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  activeTab === 'simulator'
                    ? 'bg-secondary text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                What-If Simulator
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('anomalies')
                  document.getElementById('anomaly-center')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  activeTab === 'anomalies'
                    ? 'bg-secondary text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Anomaly Center
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ai')
                  document.getElementById('event-intelligence')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  activeTab === 'ai'
                    ? 'bg-secondary text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                AI Intelligence
              </button>
            </div>
          </div>

          {/* Key KPI Cards Grid */}
          <KpiGrid nodes={activeNodes} region={region} isSimulated={isSimulated} />

          {/* Logistics Map & Live Alerts Grid */}
          <div id="network-map" className="grid grid-cols-1 gap-4 md:gap-5 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-8">
              <MapPanel
                nodes={activeNodes}
                region={region}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                isSimulated={isSimulated}
                forcedMode={mapMode}
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
              <AtRiskNodes
                nodes={activeNodes}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                isSimulated={isSimulated}
              />
            </div>
          </div>

          {/* Dedicated Multimodal Logistics Operations (Waterways, Airways, Railways, Roadways) */}
          <MultimodalCenter
            onOpenRerouteForLane={openRerouteForLane}
            onFilterMapMode={setMapMode}
          />

          {/* What-If Scenario Simulator Panel */}
          <ScenarioSimulator
            params={simParams}
            onParamsChange={setSimParams}
            onReset={handleResetSimulation}
            result={simulationResult}
            activePresetId={activePresetId}
            onSelectPreset={(preset) => setActivePresetId(preset.id)}
          />

          {/* Anomaly Center & AI Event Intelligence Section */}
          <AnomalyCenter
            onTriggerReroute={openRerouteForNode}
            onApplySimParams={handleApplySimParams}
            onSelectNode={setSelectedNodeId}
            selectedRegion={region}
          />

          <EventIntelligence
            onApplyToSimulator={handleApplyFullSimParams}
            onSelectNode={setSelectedNodeId}
          />
        </main>
      </div>

      {/* Node Details Slideover Drawer */}
      <NodeDrawer
        node={selectedNode}
        alerts={alerts}
        onClose={closeDrawer}
        onSelectNode={setSelectedNodeId}
        onOpenReroute={openRerouteForNode}
        isSimulated={isSimulated}
      />

      {/* Polished Automated Rerouting Modal */}
      <RerouteModal
        open={rerouteModalOpen}
        onClose={() => setRerouteModalOpen(false)}
        initialFromNodeId={rerouteFromNodeId}
        initialToNodeId={rerouteToNodeId}
        onRerouteConfirmed={(confirmation) => {
          setLastRerouteNotice(confirmation)
        }}
      />
    </div>
  )
}
