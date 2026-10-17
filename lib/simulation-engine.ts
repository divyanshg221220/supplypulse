import { clamp } from './random'
import {
  NODES,
  statusFromRisk,
  type NodeStatus,
  type SupplyNode,
} from './supply-data'

export interface SimulationParameters {
  fuelPriceDelta: number // percentage -20% to +100%
  congestionFactor: number // percentage 0% to 100%
  demandShock: number // percentage -50% to +100%
  weatherSeverity: number // 0 to 100
  capacityConstraint: number // percentage -40% to +50%
}

export const DEFAULT_SIMULATION_PARAMS: SimulationParameters = {
  fuelPriceDelta: 0,
  congestionFactor: 0,
  demandShock: 0,
  weatherSeverity: 0,
  capacityConstraint: 0,
}

export interface PresetScenario {
  id: string
  name: string
  shortLabel: string
  description: string
  params: SimulationParameters
  primaryDriver: 'weather' | 'congestion' | 'demand' | 'fuel' | 'capacity'
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'typhoon-east-asia',
    name: 'Super Typhoon Track (East Asia)',
    shortLabel: 'Typhoon Storm',
    description: 'Cat 4 typhoon disrupting maritime corridors in Shanghai, Ningbo, and Taiwan Strait with high port berth suspensions.',
    primaryDriver: 'weather',
    params: {
      fuelPriceDelta: 12,
      congestionFactor: 75,
      demandShock: 5,
      weatherSeverity: 88,
      capacityConstraint: 25,
    },
  },
  {
    id: 'suez-redsea-diversion',
    name: 'Red Sea / Suez Chokepoint Surge',
    shortLabel: 'Red Sea Crisis',
    description: 'Geopolitical corridor diversions around Cape of Good Hope, doubling transit days and compounding fuel burn.',
    primaryDriver: 'congestion',
    params: {
      fuelPriceDelta: 45,
      congestionFactor: 85,
      demandShock: 10,
      weatherSeverity: 15,
      capacityConstraint: 35,
    },
  },
  {
    id: 'peak-holiday-spike',
    name: 'Q4 Peak Season Demand Surge',
    shortLabel: 'Holiday Surge',
    description: 'Sudden consumer electronics and retail demand spike outpacing tier-1 buffer capacity and pushing factories to 99%.',
    primaryDriver: 'demand',
    params: {
      fuelPriceDelta: 18,
      congestionFactor: 60,
      demandShock: 65,
      weatherSeverity: 20,
      capacityConstraint: 40,
    },
  },
  {
    id: 'global-fuel-shock',
    name: 'Global Bunker Fuel Price Shock',
    shortLabel: 'Fuel Shock',
    description: 'OPEC production cuts and maritime emissions levies triggering a 70% freight surcharge across trans-Pacific air and ocean.',
    primaryDriver: 'fuel',
    params: {
      fuelPriceDelta: 75,
      congestionFactor: 30,
      demandShock: -10,
      weatherSeverity: 10,
      capacityConstraint: 15,
    },
  },
  {
    id: 'port-strike-cascade',
    name: 'Trans-Atlantic Port Labor Strike',
    shortLabel: 'Port Strike',
    description: 'Rotterdam and East Coast labor halt causing immediate container dwell accumulation and inland rail yard gridlock.',
    primaryDriver: 'capacity',
    params: {
      fuelPriceDelta: 20,
      congestionFactor: 90,
      demandShock: 15,
      weatherSeverity: 5,
      capacityConstraint: 48,
    },
  },
]

export interface SimulatedNode extends SupplyNode {
  baseRiskScore: number
  simulatedRiskScore: number
  riskDelta: number
  simulatedStatus: NodeStatus
  simulatedOnTimeRate: number
  simulatedCapacityUtilization: number
  simulatedBufferDays: number
  simulatedShipments: number
  isSimulated: boolean
  factorAttributions: {
    factor: string
    impactPts: number
    direction: 'up' | 'down'
    description: string
  }[]
}

export interface SimulationResult {
  params: SimulationParameters
  isModified: boolean
  nodes: SimulatedNode[]
  nodeById: Record<string, SimulatedNode>
  summary: {
    avgRiskScore: number
    riskDelta: number
    nodesAtRisk: number
    nodesAtRiskDelta: number
    onTimeRate: number
    onTimeDelta: number
    totalShipments: number
    shipmentsDelta: number
    avgBufferDays: number
    bufferDaysDelta: number
    estimatedCostVarianceUsd: number
    criticalNodesCount: number
    watchNodesCount: number
    healthyNodesCount: number
  }
}

/** Check if any parameter differs from neutral baseline */
export function isSimulationActive(params: SimulationParameters): boolean {
  return (
    params.fuelPriceDelta !== 0 ||
    params.congestionFactor !== 0 ||
    params.demandShock !== 0 ||
    params.weatherSeverity !== 0 ||
    params.capacityConstraint !== 0
  )
}

/**
 * Deterministic risk model applying physics-inspired sensitivity curves
 * to supply nodes based on node role, location vulnerability, and existing stress.
 */
export function recalculateNetworkSimulation(
  baseNodes: SupplyNode[] = NODES,
  params: SimulationParameters = DEFAULT_SIMULATION_PARAMS
): SimulationResult {
  const isModified = isSimulationActive(params)

  const simulatedNodes: SimulatedNode[] = baseNodes.map((node) => {
    if (!isModified) {
      return {
        ...node,
        baseRiskScore: node.riskScore,
        simulatedRiskScore: node.riskScore,
        riskDelta: 0,
        simulatedStatus: statusFromRisk(node.riskScore),
        simulatedOnTimeRate: node.onTimeRate,
        simulatedCapacityUtilization: node.capacityUtilization,
        simulatedBufferDays: node.bufferDays,
        simulatedShipments: node.activeShipments,
        isSimulated: false,
        factorAttributions: [
          { factor: 'Operational Baseline', impactPts: node.riskScore, direction: 'up', description: 'Current monitored state' },
        ],
      }
    }

    // Role-based vulnerability multipliers
    const isPort = node.type === 'port'
    const isSupplier = node.type === 'supplier'
    const isFactory = node.type === 'factory'

    // Regional weather vulnerability
    const weatherSensitivity =
      node.region === 'apac' ? 1.25 : node.region === 'americas' ? 0.95 : 0.8

    // 1. Weather Impact (heaviest on ports and APAC coastal nodes)
    const weatherImpact =
      (params.weatherSeverity / 100) *
      (isPort ? 28 : isSupplier ? 18 : 12) *
      weatherSensitivity

    // 2. Congestion Impact (heaviest on transshipment ports and high-shipment nodes)
    const congestionVulnerability = isPort ? 1.4 : isFactory ? 0.8 : 1.0
    const congestionImpact =
      (params.congestionFactor / 100) * 32 * congestionVulnerability

    // 3. Demand Shock Impact (heavily strains capacity and buffer days)
    const utilizationStress = Math.max(0, (node.capacityUtilization - 75) / 25)
    const demandImpact =
      (params.demandShock / 100) * 18 * (1 + utilizationStress * 0.8)

    // 4. Capacity Constraint Impact
    const capacityImpact = (params.capacityConstraint / 100) * 22

    // 5. Fuel Price Delta (indirect cost & throughput friction)
    const fuelImpact = (params.fuelPriceDelta / 100) * 14 * (node.activeShipments / 80)

    // Deterministic sum with baseline
    const totalAddedRisk =
      weatherImpact * 0.32 +
      congestionImpact * 0.35 +
      demandImpact * 0.18 +
      capacityImpact * 0.22 +
      fuelImpact * 0.15

    const simulatedRiskScore = Math.round(
      clamp(node.riskScore + totalAddedRisk, 5, 99)
    )
    const riskDelta = simulatedRiskScore - node.riskScore

    // Recalculate operational metrics deterministically
    const simulatedOnTimeRate = Number(
      clamp(
        node.onTimeRate -
          (params.congestionFactor * 0.22 +
            params.weatherSeverity * 0.16 +
            Math.max(0, params.demandShock) * 0.08),
        32,
        99.4
      ).toFixed(1)
    )

    const simulatedCapacityUtilization = Math.round(
      clamp(
        node.capacityUtilization +
          params.demandShock * 0.25 +
          params.capacityConstraint * 0.4,
        30,
        100
      )
    )

    const bufferReductionFactor =
      1 - (params.demandShock * 0.0035 + params.congestionFactor * 0.004)
    const simulatedBufferDays = Math.max(
      1,
      Math.round(node.bufferDays * clamp(bufferReductionFactor, 0.2, 1.6))
    )

    const shipmentMultiplier = 1 + (params.demandShock / 100) * 0.8
    const simulatedShipments = Math.max(
      5,
      Math.round(node.activeShipments * clamp(shipmentMultiplier, 0.4, 2.2))
    )

    const factorAttributions = [
      {
        factor: 'Baseline Risk',
        impactPts: node.riskScore,
        direction: 'up' as const,
        description: 'Pre-simulation operational baseline',
      },
      {
        factor: 'Corridor Congestion',
        impactPts: Math.round(congestionImpact * 0.35 * 10) / 10,
        direction: 'up' as const,
        description: `+${params.congestionFactor}% port delay & yard dwell`,
      },
      {
        factor: 'Weather Severity',
        impactPts: Math.round(weatherImpact * 0.32 * 10) / 10,
        direction: 'up' as const,
        description: `Storm intensity index ${params.weatherSeverity}/100`,
      },
      {
        factor: 'Capacity & Labor',
        impactPts: Math.round(capacityImpact * 0.22 * 10) / 10,
        direction: params.capacityConstraint >= 0 ? ('up' as const) : ('down' as const),
        description: `${params.capacityConstraint >= 0 ? '+' : ''}${params.capacityConstraint}% constraint`,
      },
      {
        factor: 'Fuel & Freight Price',
        impactPts: Math.round(fuelImpact * 0.15 * 10) / 10,
        direction: params.fuelPriceDelta >= 0 ? ('up' as const) : ('down' as const),
        description: `${params.fuelPriceDelta >= 0 ? '+' : ''}${params.fuelPriceDelta}% bunker fuel surcharge`,
      },
    ].filter((f) => Math.abs(f.impactPts) > 0.4 || f.factor === 'Baseline Risk')

    return {
      ...node,
      baseRiskScore: node.riskScore,
      simulatedRiskScore,
      riskDelta,
      simulatedStatus: statusFromRisk(simulatedRiskScore),
      simulatedOnTimeRate,
      simulatedCapacityUtilization,
      simulatedBufferDays,
      simulatedShipments,
      isSimulated: isModified,
      factorAttributions,
    }
  })

  const nodeById = simulatedNodes.reduce((acc, n) => {
    acc[n.id] = n
    return acc
  }, {} as Record<string, SimulatedNode>)

  // Network-level aggregations
  const baseAvgRisk = baseNodes.reduce((s, n) => s + n.riskScore, 0) / (baseNodes.length || 1)
  const simAvgRisk = simulatedNodes.reduce((s, n) => s + n.simulatedRiskScore, 0) / (simulatedNodes.length || 1)

  const baseAtRisk = baseNodes.filter((n) => statusFromRisk(n.riskScore) !== 'healthy').length
  const simAtRisk = simulatedNodes.filter((n) => n.simulatedStatus !== 'healthy').length

  const baseTotalShipments = baseNodes.reduce((s, n) => s + n.activeShipments, 0)
  const simTotalShipments = simulatedNodes.reduce((s, n) => s + n.simulatedShipments, 0)

  const baseOnTime =
    baseNodes.reduce((s, n) => s + n.onTimeRate * n.activeShipments, 0) / Math.max(baseTotalShipments, 1)
  const simOnTime =
    simulatedNodes.reduce((s, n) => s + n.simulatedOnTimeRate * n.simulatedShipments, 0) /
    Math.max(simTotalShipments, 1)

  const baseBuffer = baseNodes.reduce((s, n) => s + n.bufferDays, 0) / (baseNodes.length || 1)
  const simBuffer = simulatedNodes.reduce((s, n) => s + n.simulatedBufferDays, 0) / (simulatedNodes.length || 1)

  // Estimated financial cost variance in USD
  const delayedShipmentsCount = Math.round(
    simTotalShipments * Math.max(0, (100 - simOnTime) / 100)
  )
  const estimatedCostVarianceUsd = Math.round(
    delayedShipmentsCount * 3800 * (1 + (params.fuelPriceDelta / 100) * 0.4)
  )

  const criticalNodesCount = simulatedNodes.filter((n) => n.simulatedStatus === 'critical').length
  const watchNodesCount = simulatedNodes.filter((n) => n.simulatedStatus === 'watch').length
  const healthyNodesCount = simulatedNodes.filter((n) => n.simulatedStatus === 'healthy').length

  return {
    params,
    isModified,
    nodes: simulatedNodes,
    nodeById,
    summary: {
      avgRiskScore: Number(simAvgRisk.toFixed(1)),
      riskDelta: Number((simAvgRisk - baseAvgRisk).toFixed(1)),
      nodesAtRisk: simAtRisk,
      nodesAtRiskDelta: simAtRisk - baseAtRisk,
      onTimeRate: Number(simOnTime.toFixed(1)),
      onTimeDelta: Number((simOnTime - baseOnTime).toFixed(1)),
      totalShipments: simTotalShipments,
      shipmentsDelta: simTotalShipments - baseTotalShipments,
      avgBufferDays: Number(simBuffer.toFixed(1)),
      bufferDaysDelta: Number((simBuffer - baseBuffer).toFixed(1)),
      estimatedCostVarianceUsd,
      criticalNodesCount,
      watchNodesCount,
      healthyNodesCount,
    },
  }
}
