import { seededRandom } from './random'
import type { SimulatedNode } from './simulation'
import { BASE_TIME, NODE_BY_ID, type NodeType, type Region } from './supply-data'

export type AnomalySeverity = 'critical' | 'warning' | 'info'
export type AnomalyMetric = 'on-time' | 'capacity' | 'buffer' | 'lead-time' | 'risk-spike' | 'volume'

export interface Anomaly {
  id: string
  nodeId: string
  nodeName: string
  region: Region
  metric: AnomalyMetric
  metricLabel: string
  observed: number
  expected: number
  unit: string
  /** Standard deviations away from expected, in the "bad" direction. */
  deviation: number
  severity: AnomalySeverity
  detectedAt: number
  cause: string
  simulated: boolean
}

export const METRIC_LABELS: Record<AnomalyMetric, string> = {
  'on-time': 'On-time rate drop',
  capacity: 'Capacity overload',
  buffer: 'Buffer depletion',
  'lead-time': 'Lead-time stretch',
  'risk-spike': 'Risk spike',
  volume: 'Volume surge',
}

const TYPE_BUFFER: Record<NodeType, number> = {
  port: 7,
  supplier: 10,
  factory: 10,
  warehouse: 18,
  distribution: 14,
}

interface MetricDefinition {
  metric: AnomalyMetric
  unit: string
  decimals: number
  /** Whether the metric depends purely on the scenario (no baseline anomaly). */
  scenarioOnly: boolean
  observe: (node: SimulatedNode) => number
  expected: (node: SimulatedNode) => number
  sigma: (node: SimulatedNode) => number
  /** +1 when higher is worse, -1 when lower is worse. */
  direction: 1 | -1
}

const METRICS: MetricDefinition[] = [
  {
    metric: 'on-time',
    unit: '%',
    decimals: 1,
    scenarioOnly: false,
    observe: (n) => n.onTimeRate,
    expected: () => 92,
    sigma: () => 3.5,
    direction: -1,
  },
  {
    metric: 'capacity',
    unit: '%',
    decimals: 0,
    scenarioOnly: false,
    observe: (n) => n.capacityUtilization,
    expected: () => 80,
    sigma: () => 5,
    direction: 1,
  },
  {
    metric: 'buffer',
    unit: 'days',
    decimals: 1,
    scenarioOnly: false,
    observe: (n) => n.bufferDays,
    expected: (n) => TYPE_BUFFER[n.type],
    sigma: (n) => TYPE_BUFFER[n.type] * 0.25,
    direction: -1,
  },
  {
    metric: 'lead-time',
    unit: 'days',
    decimals: 0,
    scenarioOnly: true,
    observe: (n) => n.leadTimeDays,
    expected: (n) => NODE_BY_ID[n.id].leadTimeDays,
    sigma: (n) => Math.max(0.6, NODE_BY_ID[n.id].leadTimeDays * 0.1),
    direction: 1,
  },
  {
    metric: 'risk-spike',
    unit: 'pts',
    decimals: 0,
    scenarioOnly: true,
    observe: (n) => n.riskScore,
    expected: (n) => n.baseRiskScore,
    sigma: () => 5,
    direction: 1,
  },
  {
    metric: 'volume',
    unit: 'shipments',
    decimals: 0,
    scenarioOnly: true,
    observe: (n) => n.activeShipments,
    expected: (n) => NODE_BY_ID[n.id].activeShipments,
    sigma: (n) => Math.max(2, NODE_BY_ID[n.id].activeShipments * 0.08),
    direction: 1,
  },
]

const Z_THRESHOLD = 1.5

function severityFromDeviation(z: number): AnomalySeverity {
  if (z >= 3) return 'critical'
  if (z >= 2) return 'warning'
  return 'info'
}

/** Deterministic z-score detector over current (possibly simulated) node metrics. */
export function detectAnomalies(nodes: SimulatedNode[]): Anomaly[] {
  const anomalies: Anomaly[] = []
  for (const node of nodes) {
    const base = NODE_BY_ID[node.id]
    for (const def of METRICS) {
      const observed = def.observe(node)
      const expected = def.expected(node)
      const z = (def.direction * (observed - expected)) / def.sigma(node)
      if (z < Z_THRESHOLD) continue

      const baselineObserved = def.observe({ ...node, ...base, baseRiskScore: base.riskScore } as SimulatedNode)
      const simulated = def.scenarioOnly || Math.abs(baselineObserved - observed) > 0.05
      const rand = seededRandom(`anomaly-${node.id}-${def.metric}`)
      const detectedAt = simulated ? BASE_TIME : BASE_TIME - Math.floor(5 + rand() * 175) * 60_000
      const factor = math(def.decimals)

      anomalies.push({
        id: `${node.id}-${def.metric}`,
        nodeId: node.id,
        nodeName: node.name,
        region: node.region,
        metric: def.metric,
        metricLabel: METRIC_LABELS[def.metric],
        observed: Math.round(observed * factor) / factor,
        expected: Math.round(expected * factor) / factor,
        unit: def.unit,
        deviation: Math.round(z * 10) / 10,
        severity: severityFromDeviation(z),
        detectedAt,
        cause: simulated
          ? 'Driven by active what-if scenario'
          : (base.riskFactors[0]?.label ?? 'Pattern deviation detected'),
        simulated,
      })
    }
  }
  return anomalies
}

function math(decimals: number) {
  return 10 ** decimals
}
