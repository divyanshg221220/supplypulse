import { seededRandom } from './random'
import type { ScenarioParams, SimulatedNode } from './simulation'
import {
  NODES,
  ROUTES,
  statusFromRisk,
  type NodeStatus,
  type SupplyRoute,
  type TransportMode,
} from './supply-data'

export type RerouteStrategy = 'alternate-hub' | 'mode-shift' | 'split'

export interface RerouteOption {
  id: string
  strategy: RerouteStrategy
  title: string
  summary: string
  path: string[]
  mode: TransportMode
  transitDays: number
  costUsd: number
  riskScore: number
  /** Risk points removed from the congested node once confirmed. */
  mitigation: number
  recommended: boolean
  tradeoffs: string[]
}

export interface CurrentLane {
  path: string[]
  mode: TransportMode
  transitDays: number
  costUsd: number
  riskScore: number
}

export interface RerouteProposal {
  routeId: string
  riskyNodeId: string
  current: CurrentLane
  options: RerouteOption[]
}

export interface ConfirmedReroute {
  routeId: string
  riskyNodeId: string
  option: RerouteOption
  confirmationId: string
  confirmedAt: number
  source: 'live' | 'demo'
}

export interface LaneRisk {
  route: SupplyRoute
  risk: number
  riskyNodeId: string
  status: NodeStatus
}

const COST_PER_SHIPMENT: Record<TransportMode, number> = {
  sea: 3200,
  air: 18500,
  rail: 2100,
  road: 1400,
}

const FUEL_SENSITIVITY: Record<TransportMode, number> = {
  sea: 0.35,
  air: 0.5,
  rail: 0.2,
  road: 0.4,
}

export const MODE_LABELS: Record<TransportMode, string> = {
  sea: 'Ocean',
  air: 'Air',
  rail: 'Rail',
  road: 'Road',
}

export function laneRisks(nodesById: Record<string, SimulatedNode>): LaneRisk[] {
  return ROUTES.map((route) => {
    const from = nodesById[route.from]
    const to = nodesById[route.to]
    const riskyNodeId = from.riskScore >= to.riskScore ? from.id : to.id
    const risk = Math.max(from.riskScore, to.riskScore)
    return { route, risk, riskyNodeId, status: statusFromRisk(risk) }
  }).sort((a, b) => b.risk - a.risk)
}

function laneCost(mode: TransportMode, shipments: number, fuel: number) {
  return Math.round(COST_PER_SHIPMENT[mode] * shipments * (1 + (fuel / 100) * FUEL_SENSITIVITY[mode]))
}

/** Expected transit inflates once node risk passes the watch threshold. */
function effectiveTransit(days: number, risk: number) {
  return Math.round(days * (1 + Math.max(0, risk - 45) / 90) * 10) / 10
}

const round1 = (v: number) => Math.round(v * 10) / 10

export function buildRerouteProposal(
  route: SupplyRoute,
  nodesById: Record<string, SimulatedNode>,
  params: ScenarioParams,
): RerouteProposal {
  const rand = seededRandom(`reroute-${route.id}`)
  const from = nodesById[route.from]
  const to = nodesById[route.to]
  const risky = from.riskScore >= to.riskScore ? from : to
  const other = risky.id === from.id ? to : from
  const laneRisk = risky.riskScore

  const current: CurrentLane = {
    path: [from.id, to.id],
    mode: route.mode,
    transitDays: effectiveTransit(route.transitDays, laneRisk),
    costUsd: laneCost(route.mode, route.shipments, params.fuel),
    riskScore: laneRisk,
  }

  const candidates = NODES.filter(
    (n) => n.id !== risky.id && n.id !== other.id && n.region === risky.region,
  )
    .map((n) => nodesById[n.id])
    .sort((a, b) => {
      const typeA = a.type === risky.type ? 0 : 1
      const typeB = b.type === risky.type ? 0 : 1
      return typeA - typeB || a.riskScore - b.riskScore
    })
  const alt = candidates[0] ?? risky

  const altPath = risky.id === from.id ? [alt.id, to.id] : [from.id, alt.id]
  const altRisk = Math.max(other.riskScore, alt.riskScore)
  const altTransit = effectiveTransit(route.transitDays + 1 + Math.floor(rand() * 3), altRisk)
  const altCost = Math.round(laneCost(route.mode, route.shipments, params.fuel) * (1.08 + rand() * 0.08))
  const altMitigation = Math.max(2, Math.min(12, Math.round((laneRisk - altRisk) * 0.3)))

  const shift = modeShift(route.mode, route.transitDays)
  const bypassesPort = risky.type === 'port' && shift.mode === 'air'
  const shiftRisk = Math.max(8, Math.round(laneRisk - (bypassesPort ? 24 : 12) - rand() * 4))
  const shiftCost = Math.round(laneCost(shift.mode, route.shipments, params.fuel) * shift.costMultiplier)
  const shiftTransit = effectiveTransit(shift.transitDays, shiftRisk)

  const splitTransit = round1(current.transitDays * 0.6 + altTransit * 0.4)
  const splitRisk = Math.round(laneRisk * 0.6 + altRisk * 0.4)
  const splitCost = Math.round(current.costUsd * 0.6 + altCost * 0.4 + 1800)

  const options: RerouteOption[] = [
    {
      id: `${route.id}-alt-hub`,
      strategy: 'alternate-hub',
      title: `Divert via ${alt.city}`,
      summary: `Re-book ${route.shipments} shipments through ${alt.name}, bypassing ${risky.city}.`,
      path: altPath,
      mode: route.mode,
      transitDays: altTransit,
      costUsd: altCost,
      riskScore: altRisk,
      mitigation: altMitigation,
      recommended: false,
      tradeoffs: [
        `Avoids ${risky.city} (risk ${risky.riskScore})`,
        `Extra drayage and re-booking fees`,
        `${alt.city} running at ${alt.capacityUtilization}% capacity`,
      ],
    },
    {
      id: `${route.id}-mode-shift`,
      strategy: 'mode-shift',
      title: shift.title,
      summary: `Move priority volume from ${MODE_LABELS[route.mode].toLowerCase()} to ${MODE_LABELS[shift.mode].toLowerCase()} on the same origin and destination.`,
      path: [from.id, to.id],
      mode: shift.mode,
      transitDays: shiftTransit,
      costUsd: shiftCost,
      riskScore: shiftRisk,
      mitigation: bypassesPort ? 8 : 5,
      recommended: false,
      tradeoffs: [
        bypassesPort ? 'Skips port berth queue entirely' : 'Reduces exposure to current mode delays',
        shiftCost > current.costUsd ? `${Math.round((shiftCost / current.costUsd - 1) * 100)}% higher freight spend` : 'Lower freight spend',
        `Fuel sensitivity: ${Math.round(FUEL_SENSITIVITY[shift.mode] * 100)}% pass-through`,
      ],
    },
    {
      id: `${route.id}-split`,
      strategy: 'split',
      title: `Split 60/40 with ${alt.city}`,
      summary: `Keep 60% on the current lane and divert 40% via ${alt.city} to hedge both routes.`,
      path: [from.id, alt.id, to.id].filter((id, i, arr) => arr.indexOf(id) === i),
      mode: route.mode,
      transitDays: splitTransit,
      costUsd: splitCost,
      riskScore: splitRisk,
      mitigation: Math.max(2, Math.round(altMitigation * 0.5) + 1),
      recommended: false,
      tradeoffs: [
        'Diversifies lane exposure',
        'Added handling for split consignments',
        `${Math.round(route.shipments * 0.6)} shipments still exposed to ${risky.city}`,
      ],
    },
  ]

  const range = (key: 'riskScore' | 'transitDays' | 'costUsd') => {
    const values = options.map((o) => o[key])
    const min = Math.min(...values)
    const max = Math.max(...values)
    return (value: number) => (max === min ? 0 : (value - min) / (max - min))
  }
  const normRisk = range('riskScore')
  const normTransit = range('transitDays')
  const normCost = range('costUsd')
  const scores = options.map(
    (o) => normRisk(o.riskScore) * 0.5 + normTransit(o.transitDays) * 0.25 + normCost(o.costUsd) * 0.25,
  )
  const best = scores.indexOf(Math.min(...scores))
  options[best].recommended = true

  return { routeId: route.id, riskyNodeId: risky.id, current, options }
}

function modeShift(mode: TransportMode, transitDays: number) {
  switch (mode) {
    case 'sea':
      return { mode: 'air' as const, title: 'Expedite by air freight', transitDays: Math.max(2, Math.round(transitDays * 0.12)), costMultiplier: 0.55 }
    case 'rail':
      return { mode: 'road' as const, title: 'Shift to truckload', transitDays: Math.max(1, Math.round(transitDays * 0.7)), costMultiplier: 1 }
    case 'road':
      return { mode: 'rail' as const, title: 'Shift to intermodal rail', transitDays: Math.round(transitDays * 1.3) + 1, costMultiplier: 1 }
    case 'air':
      return { mode: 'air' as const, title: 'Book dedicated charter', transitDays: Math.max(1, transitDays - 1), costMultiplier: 1.35 }
  }
}

export function mitigationsFromReroutes(reroutes: Record<string, ConfirmedReroute>) {
  const totals: Record<string, number> = {}
  for (const reroute of Object.values(reroutes)) {
    totals[reroute.riskyNodeId] = Math.min(20, (totals[reroute.riskyNodeId] ?? 0) + reroute.option.mitigation)
  }
  return totals
}
