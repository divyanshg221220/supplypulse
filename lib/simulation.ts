import { clamp } from './random'
import {
  NODES,
  ROUTES,
  type NodeType,
  type Region,
  type RiskFactor,
  type SupplyNode,
  type TimelinePoint,
} from './supply-data'

export type ScenarioFactor = 'fuel' | 'congestion' | 'demand' | 'weather' | 'capacity'

export type ScenarioParams = Record<ScenarioFactor, number>

export interface ScenarioFocus {
  label: string
  nodeIds: string[]
  regions: Region[]
}

export interface Scenario {
  params: ScenarioParams
  focus: ScenarioFocus | null
  label: string | null
  source: 'baseline' | 'manual' | 'preset' | 'event'
  presetId: string | null
}

export interface SliderConfig {
  key: ScenarioFactor
  label: string
  description: string
  min: number
  max: number
  step: number
  format: (value: number) => string
}

const signedPct = (v: number) => `${v > 0 ? '+' : ''}${v}%`

export const SLIDERS: SliderConfig[] = [
  {
    key: 'fuel',
    label: 'Fuel price',
    description: 'Bunker / diesel / jet fuel change vs today',
    min: -30,
    max: 100,
    step: 5,
    format: signedPct,
  },
  {
    key: 'congestion',
    label: 'Port congestion',
    description: 'Additional berth & yard congestion severity',
    min: 0,
    max: 100,
    step: 5,
    format: (v) => `${v}/100`,
  },
  {
    key: 'demand',
    label: 'Demand',
    description: 'Order volume change vs plan',
    min: -30,
    max: 60,
    step: 5,
    format: signedPct,
  },
  {
    key: 'weather',
    label: 'Weather severity',
    description: 'Storm, flood or heat disruption intensity',
    min: 0,
    max: 100,
    step: 5,
    format: (v) => `${v}/100`,
  },
  {
    key: 'capacity',
    label: 'Capacity available',
    description: 'Share of nominal supplier & carrier capacity',
    min: 50,
    max: 110,
    step: 5,
    format: (v) => `${v}%`,
  },
]

export const SLIDER_BY_KEY = Object.fromEntries(SLIDERS.map((s) => [s.key, s])) as Record<
  ScenarioFactor,
  SliderConfig
>

export const FACTOR_LABELS: Record<ScenarioFactor, string> = {
  fuel: 'Fuel price',
  congestion: 'Congestion',
  demand: 'Demand',
  weather: 'Weather',
  capacity: 'Capacity',
}

export const BASELINE_PARAMS: ScenarioParams = {
  fuel: 0,
  congestion: 0,
  demand: 0,
  weather: 0,
  capacity: 100,
}

export const BASELINE_SCENARIO: Scenario = {
  params: BASELINE_PARAMS,
  focus: null,
  label: null,
  source: 'baseline',
  presetId: null,
}

export function clampParams(params: Partial<ScenarioParams>): ScenarioParams {
  const next = { ...BASELINE_PARAMS, ...params }
  for (const slider of SLIDERS) {
    const snapped = Math.round(next[slider.key] / slider.step) * slider.step
    next[slider.key] = clamp(snapped, slider.min, slider.max)
  }
  return next
}

export function isBaselineScenario(scenario: Scenario) {
  return (
    scenario.focus === null &&
    SLIDERS.every((s) => scenario.params[s.key] === BASELINE_PARAMS[s.key])
  )
}

export interface ScenarioPreset {
  id: string
  label: string
  description: string
  params: ScenarioParams
  focus: ScenarioFocus | null
}

export const PRESETS: ScenarioPreset[] = [
  {
    id: 'red-sea',
    label: 'Red Sea escalation',
    description: 'Suez diversions, war-risk premiums and EMEA port bunching',
    params: { fuel: 45, congestion: 55, demand: 0, weather: 10, capacity: 90 },
    focus: { label: 'EMEA lanes', nodeIds: ['jebel-ali', 'rotterdam-port'], regions: ['emea'] },
  },
  {
    id: 'typhoon',
    label: 'APAC typhoon',
    description: 'Category 4 landfall near the Pearl River Delta',
    params: { fuel: 5, congestion: 40, demand: 0, weather: 85, capacity: 85 },
    focus: {
      label: 'South China coast',
      nodeIds: ['shenzhen-supplier', 'shanghai-port', 'hsinchu-fab'],
      regions: ['apac'],
    },
  },
  {
    id: 'peak-season',
    label: 'Peak season surge',
    description: 'Holiday demand pull-forward across all regions',
    params: { fuel: 10, congestion: 35, demand: 45, weather: 0, capacity: 95 },
    focus: null,
  },
  {
    id: 'fuel-shock',
    label: 'Fuel price shock',
    description: 'Crude spike drives bunker and diesel surcharges',
    params: { fuel: 80, congestion: 10, demand: -5, weather: 0, capacity: 100 },
    focus: null,
  },
  {
    id: 'capacity-crunch',
    label: 'Capacity crunch',
    description: 'Tier-1 supplier outages and carrier blank sailings',
    params: { fuel: 0, congestion: 15, demand: 10, weather: 0, capacity: 60 },
    focus: null,
  },
  {
    id: 'calm',
    label: 'Best case',
    description: 'Softer fuel, eased demand and spare capacity',
    params: { fuel: -20, congestion: 0, demand: -10, weather: 0, capacity: 105 },
    focus: null,
  },
]

/** How strongly each node type reacts to each scenario factor (0–1). */
const SENSITIVITY: Record<NodeType, ScenarioParams> = {
  port: { fuel: 0.3, congestion: 1, demand: 0.5, weather: 0.7, capacity: 0.4 },
  supplier: { fuel: 0.4, congestion: 0.3, demand: 0.6, weather: 0.8, capacity: 1 },
  factory: { fuel: 0.3, congestion: 0.3, demand: 0.8, weather: 0.4, capacity: 0.9 },
  warehouse: { fuel: 0.6, congestion: 0.2, demand: 1, weather: 0.3, capacity: 0.5 },
  distribution: { fuel: 0.7, congestion: 0.3, demand: 0.9, weather: 0.3, capacity: 0.4 },
}

/** Risk points a fully-sensitive node gains from each factor. */
function factorPressure(params: ScenarioParams): ScenarioParams {
  return {
    fuel: params.fuel * 0.18,
    congestion: params.congestion * 0.25,
    demand: params.demand * 0.3,
    weather: params.weather * 0.28,
    capacity: (100 - params.capacity) * 0.5,
  }
}

export type Contributions = ScenarioParams & { mitigation: number }

export interface SimulatedNode extends SupplyNode {
  baseRiskScore: number
  contributions: Contributions
  exposure: number
  simulated: boolean
}

const CONNECTED: Record<string, Set<string>> = {}
for (const route of ROUTES) {
  ;(CONNECTED[route.from] ??= new Set()).add(route.to)
  ;(CONNECTED[route.to] ??= new Set()).add(route.from)
}

function focusExposure(node: SupplyNode, focus: ScenarioFocus | null) {
  if (!focus) return 1
  if (focus.nodeIds.includes(node.id)) return 1
  if (focus.nodeIds.some((id) => CONNECTED[id]?.has(node.id))) return 0.6
  if (focus.regions.includes(node.region)) return 0.55
  return 0.25
}

const round1 = (v: number) => Math.round(v * 10) / 10

function simulatedFactors(contributions: Contributions, params: ScenarioParams): RiskFactor[] {
  const factors: RiskFactor[] = []
  for (const slider of SLIDERS) {
    const value = contributions[slider.key]
    if (Math.abs(value) < 3) continue
    factors.push({
      label: `Simulated: ${slider.label.toLowerCase()} ${slider.format(params[slider.key])} (${value > 0 ? '+' : ''}${value.toFixed(1)} risk)`,
      impact: Math.abs(value) >= 10 ? 'high' : Math.abs(value) >= 5 ? 'medium' : 'low',
    })
  }
  if (contributions.mitigation < 0) {
    factors.push({
      label: `Simulated: confirmed reroute (${contributions.mitigation.toFixed(1)} risk)`,
      impact: 'low',
    })
  }
  return factors
}

/**
 * Deterministic scenario model: identical inputs always produce identical outputs,
 * so server and client renders match and results are reproducible.
 */
export function simulateNode(
  node: SupplyNode,
  scenario: Scenario,
  mitigation = 0,
): SimulatedNode {
  const { params } = scenario
  const sensitivity = SENSITIVITY[node.type]
  const pressure = factorPressure(params)
  const exposure = focusExposure(node, scenario.focus)
  const utilizationAmplifier = 0.7 + (node.capacityUtilization / 100) * 0.5

  const contributions = { mitigation: -Math.abs(mitigation) } as Contributions
  let delta = contributions.mitigation
  for (const slider of SLIDERS) {
    const value = round1(pressure[slider.key] * sensitivity[slider.key] * exposure * utilizationAmplifier)
    contributions[slider.key] = value
    delta += value
  }

  const riskScore = Math.round(clamp(node.riskScore + delta, 1, 99))
  const actualDelta = riskScore - node.riskScore
  const demandFactor = 1 + (params.demand / 100) * exposure
  const capacityFactor = 1 - ((100 - params.capacity) / 100) * exposure

  const simulated = actualDelta !== 0 || !isBaselineScenario(scenario) || mitigation !== 0

  return {
    ...node,
    baseRiskScore: node.riskScore,
    riskScore,
    contributions,
    exposure,
    simulated,
    onTimeRate: round1(clamp(node.onTimeRate - actualDelta * 0.45, 40, 99.9)),
    bufferDays: round1(
      Math.max(
        0.5,
        (node.bufferDays / Math.max(demandFactor, 0.5)) * Math.min(capacityFactor, 1.05) -
          (params.weather / 100) * 1.5 * exposure,
      ),
    ),
    activeShipments: Math.max(0, Math.round(node.activeShipments * demandFactor)),
    capacityUtilization: Math.round(
      clamp((node.capacityUtilization * demandFactor) / Math.max(capacityFactor, 0.4), 0, 100),
    ),
    leadTimeDays: Math.max(1, Math.round(node.leadTimeDays * (1 + Math.max(actualDelta, 0) / 80))),
    riskFactors: simulated
      ? [...node.riskFactors, ...simulatedFactors(contributions, params)]
      : node.riskFactors,
  }
}

export function simulateNetwork(
  scenario: Scenario,
  mitigations: Record<string, number> = {},
): SimulatedNode[] {
  return NODES.map((node) => simulateNode(node, scenario, mitigations[node.id] ?? 0))
}

function composite(w: number, c: number, s: number, g: number) {
  return clamp(w * 0.3 + c * 0.32 + s * 0.24 + g * 0.14 + 8, 0, 100)
}

export type SimulatedTimelinePoint = TimelinePoint & { simulated: number }

/** Adds a simulated composite line that ramps in over the first 12 hours. */
export function simulateTimeline(
  points: TimelinePoint[],
  scenario: Scenario,
  region: Region | 'all',
): SimulatedTimelinePoint[] {
  const { params, focus } = scenario
  const exposure = !focus || region === 'all' || focus.regions.includes(region as Region) ? 1 : 0.4
  return points.map((point) => {
    const ramp = Math.min(1, point.hour / 12) * exposure
    const weather = clamp(point.weather + params.weather * 0.45 * ramp, 0, 100)
    const congestion = clamp(point.congestion + (params.congestion * 0.5 + params.demand * 0.12) * ramp, 0, 100)
    const supplier = clamp(point.supplier + ((100 - params.capacity) * 0.6 + params.demand * 0.15) * ramp, 0, 100)
    const geopolitical = clamp(point.geopolitical + params.fuel * 0.08 * ramp, 0, 100)
    return { ...point, simulated: round1(composite(weather, congestion, supplier, geopolitical)) }
  })
}

export function describeParams(params: ScenarioParams) {
  return SLIDERS.filter((s) => params[s.key] !== BASELINE_PARAMS[s.key]).map((s) => ({
    key: s.key,
    label: s.label,
    value: s.format(params[s.key]),
  }))
}
