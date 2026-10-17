import {
  NODES,
  ROUTES,
  statusFromRisk,
  type AlertCategory,
  type AlertSeverity,
  type Region,
  type SupplyAlert,
  type SupplyNode,
  type TransportMode,
} from './supply-data'
import {
  DEFAULT_SIMULATION_PARAMS,
  recalculateNetworkSimulation,
  type SimulationParameters,
  type SimulationResult,
} from './simulation-engine'

/** Configured backend base URL from environment or empty string */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || ''

export interface ApiResponse<T> {
  data: T
  isFallback: boolean
  source: 'backend' | 'demo'
  status: 'success' | 'fallback' | 'error'
  message?: string
  timestamp: number
}

export interface RouteAlternative {
  id: string
  name: string
  mode: TransportMode | 'intermodal'
  badge: 'Recommended' | 'Lowest Cost' | 'Fastest Express'
  via: string[]
  transitDays: number
  transitDaysDelta: number
  costEstimateUsd: number
  costDeltaPct: number
  riskScore: number
  riskDelta: number
  co2Tons: number
  co2DeltaPct: number
  reliabilityPct: number
  carrier: string
  tradeoffSummary: string
  checkpoints: { name: string; type: string; dwellHours: number }[]
  keyBenefits: string[]
}

export interface ReroutePlan {
  laneId: string
  fromNode: SupplyNode
  toNode: SupplyNode
  currentRoute: {
    mode: TransportMode
    transitDays: number
    shipments: number
    bottleneck: string
    currentRisk: number
    estimatedDwellDays: number
  }
  alternatives: RouteAlternative[]
}

export interface RerouteConfirmation {
  trackingId: string
  laneId: string
  selectedAlternativeId: string
  selectedAlternativeName: string
  timestamp: number
  estimatedArrival: string
  dispatchedShipments: number
  status: 'confirmed' | 'dispatched' | 'in_transit'
  operator: string
}

export interface AnomalyItem {
  id: string
  title: string
  category: AlertCategory
  severity: AlertSeverity
  nodeId: string
  nodeName: string
  nodeCity: string
  region: Region
  riskImpact: number
  financialImpactUsd: number
  affectedShipments: number
  timestamp: number
  status: 'active' | 'investigating' | 'mitigated' | 'rerouted'
  rootCause: string
  recommendedAction: string
  suggestedSimParams?: Partial<SimulationParameters>
}

export interface ExtractedEvent {
  headline: string
  incidentCategory: AlertCategory
  severity: AlertSeverity
  affectedLocations: string[]
  matchedNodeIds: string[]
  primaryNodeId: string
  confidenceScore: number
  estimatedDelayDays: number
  suggestedSimParams: SimulationParameters
  keyEntities: { label: string; value: string }[]
  summary: string
  recommendedRemediation: string
  riskAttributions: {
    factor: string
    deltaPts: number
    direction: 'up' | 'down'
    comment: string
  }[]
  isLiveGemini?: boolean
  modelVersion?: string
  impactedModes?: ('waterways' | 'airways' | 'railways' | 'roadways')[]
}

// -------------------------------------------------------------
// Sample Mock Data for Fallback Engine
// -------------------------------------------------------------

export const MOCK_ANOMALIES: AnomalyItem[] = [
  {
    id: 'anom-1',
    title: 'Berth Congestion & Crane Maintenance Surge',
    category: 'congestion',
    severity: 'critical',
    nodeId: 'shanghai-port',
    nodeName: 'Port of Shanghai',
    nodeCity: 'Shanghai',
    region: 'apac',
    riskImpact: 78,
    financialImpactUsd: 1840000,
    affectedShipments: 212,
    timestamp: Date.now() - 1000 * 60 * 35,
    status: 'active',
    rootCause: 'Deep-water berth dredging coinciding with 14% customs inspection spike',
    recommendedAction: 'Execute intermodal diversion through Ningbo or air-bridge express',
    suggestedSimParams: { congestionFactor: 75, weatherSeverity: 60 },
  },
  {
    id: 'anom-2',
    title: 'Monsoon Flooding Along Chennai Highway Corridor',
    category: 'weather',
    severity: 'critical',
    nodeId: 'chennai-components',
    nodeName: 'Chennai Components Supplier',
    nodeCity: 'Chennai',
    region: 'apac',
    riskImpact: 74,
    financialImpactUsd: 890000,
    affectedShipments: 48,
    timestamp: Date.now() - 1000 * 60 * 95,
    status: 'investigating',
    rootCause: '320mm rainfall over 24h leading to road access closure to inland container depot',
    recommendedAction: 'Reroute component supply allocations to Ho Chi Minh Assembly',
    suggestedSimParams: { weatherSeverity: 85, capacityConstraint: 35 },
  },
  {
    id: 'anom-3',
    title: 'Single-Source MCU Wafer Fab Grid Maintenance',
    category: 'supplier',
    severity: 'warning',
    nodeId: 'hsinchu-fab',
    nodeName: 'Hsinchu Semiconductor Fab',
    nodeCity: 'Hsinchu',
    region: 'apac',
    riskImpact: 63,
    financialImpactUsd: 1420000,
    affectedShipments: 38,
    timestamp: Date.now() - 1000 * 60 * 180,
    status: 'investigating',
    rootCause: 'Scheduled power grid substation testing reducing cleanroom yield by 18%',
    recommendedAction: 'Draw from safety buffer stock at Dallas distribution center',
    suggestedSimParams: { capacityConstraint: 40, demandShock: 20 },
  },
  {
    id: 'anom-4',
    title: 'Red Sea Transshipment Rerouting Surcharge',
    category: 'geopolitical',
    severity: 'warning',
    nodeId: 'jebel-ali',
    nodeName: 'Jebel Ali Port',
    nodeCity: 'Dubai',
    region: 'emea',
    riskImpact: 57,
    financialImpactUsd: 2100000,
    affectedShipments: 134,
    timestamp: Date.now() - 1000 * 60 * 310,
    status: 'active',
    rootCause: 'Cape of Good Hope detour adding 9 transit days and 30% war risk insurance',
    recommendedAction: 'Engage secondary feeder slot booking from Singapore to Rotterdam',
    suggestedSimParams: { fuelPriceDelta: 45, congestionFactor: 65 },
  },
  {
    id: 'anom-5',
    title: 'Rail Yard Intermodal Chassis Shortage',
    category: 'transit',
    severity: 'warning',
    nodeId: 'chicago-hub',
    nodeName: 'Chicago Logistics Hub',
    nodeCity: 'Chicago',
    region: 'americas',
    riskImpact: 52,
    financialImpactUsd: 450000,
    affectedShipments: 95,
    timestamp: Date.now() - 1000 * 60 * 480,
    status: 'mitigated',
    rootCause: 'Imbalanced eastbound container flow leaving dry container chassis deficit',
    recommendedAction: 'Reposition empty flatcars from Kansas City terminal',
    suggestedSimParams: { congestionFactor: 40, capacityConstraint: 25 },
  },
]

// -------------------------------------------------------------
// Helper fetcher with graceful fallback
// -------------------------------------------------------------

async function safeFetch<T>(
  endpoint: string,
  options?: RequestInit,
  fallbackGenerator?: () => T
): Promise<ApiResponse<T>> {
  const timestamp = Date.now()
  const targetUrl = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(targetUrl, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const json = await res.json()
      return {
        data: json,
        isFallback: false,
        source: 'backend',
        status: 'success',
        timestamp,
      }
    }
  } catch {
    // Request failed or timed out -> gracefully continue to fallback
  }

  // Graceful fallback to client deterministic generator
  if (fallbackGenerator) {
    return {
      data: fallbackGenerator(),
      isFallback: true,
      source: 'demo',
      status: 'fallback',
      message: 'Running with local deterministic engine.',
      timestamp,
    }
  }

  throw new Error(`Endpoint ${endpoint} failed and no fallback provided.`)
}

// -------------------------------------------------------------
// Public API Client Functions
// -------------------------------------------------------------

/**
 * Check backend connectivity health
 */
export async function checkApiHealth(): Promise<{
  online: boolean
  baseUrl: string
  mode: 'connected' | 'demo-fallback'
}> {
  if (!API_BASE_URL) {
    return { online: false, baseUrl: '', mode: 'demo-fallback' }
  }
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    })
    return {
      online: res.ok,
      baseUrl: API_BASE_URL,
      mode: res.ok ? 'connected' : 'demo-fallback',
    }
  } catch {
    return { online: false, baseUrl: API_BASE_URL, mode: 'demo-fallback' }
  }
}

/**
 * Fetch Network Nodes
 */
export async function getNetworkNodes(): Promise<ApiResponse<SupplyNode[]>> {
  return safeFetch<SupplyNode[]>('/api/nodes', { method: 'GET' }, () => NODES)
}

/**
 * Fetch Route Alternatives for Automated Rerouting Modal
 */
export async function getRouteAlternatives(
  fromNodeId: string = 'shanghai-port',
  toNodeId: string = 'long-beach'
): Promise<ApiResponse<ReroutePlan>> {
  const fallbackGenerator = (): ReroutePlan => {
    const fromNode = NODES.find((n) => n.id === fromNodeId) || NODES[1]
    const toNode = NODES.find((n) => n.id === toNodeId) || NODES[8] || NODES[0]

    return {
      laneId: `${fromNode.id}->${toNode.id}`,
      fromNode,
      toNode,
      currentRoute: {
        mode: 'sea',
        transitDays: 14,
        shipments: 84,
        bottleneck: 'Shanghai Deepwater Berth Congestion (Dwell: 3.4d)',
        currentRisk: fromNode.riskScore,
        estimatedDwellDays: 3.4,
      },
      alternatives: [
        {
          id: 'alt-air-intermodal',
          name: 'Fastest Sea-Air Express / Intermodal Bypass',
          mode: 'intermodal',
          badge: 'Fastest Express',
          via: ['Incheon Air Cargo Terminal', 'Anchorage Refuel Hub', 'Ontario Distribution Center'],
          transitDays: 4,
          transitDaysDelta: -10,
          costEstimateUsd: 19800,
          costDeltaPct: +24,
          riskScore: 22,
          riskDelta: -56,
          co2Tons: 5.2,
          co2DeltaPct: +85,
          reliabilityPct: 98.4,
          carrier: 'Pacific AirBridge Express & Skyfreight',
          tradeoffSummary:
            'Bypasses marine bottleneck entirely; cuts 10 transit days with 98.4% on-time certainty at a +24% cost premium.',
          checkpoints: [
            { name: 'Shanghai Pudong Bonded Hub', type: 'Customs Air Clearance', dwellHours: 4 },
            { name: 'Incheon Intermodal Ramp', type: 'Cross-Dock Transfer', dwellHours: 6 },
            { name: 'Ontario West Logistics Park', type: 'Final Mile Dispatch', dwellHours: 3 },
          ],
          keyBenefits: [
            'Immediate clearance bypassing sea terminal berth queue',
            'Dedicated temp-controlled air charter capacity',
            'Real-time IoT shock and temperature telemetry',
          ],
        },
        {
          id: 'alt-coastal-feeder',
          name: 'Balanced Coastal Feeder & Secondary Port Diversion',
          mode: 'sea',
          badge: 'Recommended',
          via: ['Ningbo-Zhoushan Outer Pier', 'Busan Transshipment Hub', 'Port of Oakland'],
          transitDays: 11,
          transitDaysDelta: -3,
          costEstimateUsd: 15400,
          costDeltaPct: +3.2,
          riskScore: 32,
          riskDelta: -46,
          co2Tons: 2.1,
          co2DeltaPct: -4,
          reliabilityPct: 92.8,
          carrier: 'Evergreen & Ocean Alliance Feeder',
          tradeoffSummary:
            'Bypasses Shanghai port congestion via Ningbo deepwater berth with slight coastal repositioning; optimal cost/risk ratio.',
          checkpoints: [
            { name: 'Ningbo-Zhoushan Pier 4', type: 'Direct Vessel Berth', dwellHours: 12 },
            { name: 'Busan Transshipment Center', type: 'Feeder Relay', dwellHours: 18 },
            { name: 'Port of Oakland Berth 32', type: 'Expedited Yard Discharge', dwellHours: 14 },
          ],
          keyBenefits: [
            'Recommended best-practice compromise between expense and risk',
            'Guaranteed feeder slot allocation through partner alliances',
            'Retains standard ocean container freight economy',
          ],
        },
        {
          id: 'alt-rail-corridor',
          name: 'Cost-Optimized Eurasian Rail & Northern Land Corridor',
          mode: 'rail',
          badge: 'Lowest Cost',
          via: ['Chongqing Central Freight Hub', 'Manzhouli Gateway', 'Pacific Northwest Terminal'],
          transitDays: 15,
          transitDaysDelta: +1,
          costEstimateUsd: 13600,
          costDeltaPct: -8.5,
          riskScore: 28,
          riskDelta: -50,
          co2Tons: 1.2,
          co2DeltaPct: -45,
          reliabilityPct: 94.2,
          carrier: 'Trans-Eurasia Rail Corridor Express',
          tradeoffSummary:
            'Zero maritime weather exposure; saves 8.5% freight costs and 45% emissions, adding only 1 transit day.',
          checkpoints: [
            { name: 'Chongqing Intermodal Yard', type: 'Rail Block Train Assembly', dwellHours: 8 },
            { name: 'Manzhouli Border Terminal', type: 'Gauge Exchange Clearance', dwellHours: 12 },
            { name: 'Seattle Inland Dry Port', type: 'Container Offload', dwellHours: 10 },
          ],
          keyBenefits: [
            'Completely immune to Typhoon Gaemi and marine weather advisories',
            'Lowest carbon intensity of all alternative corridors',
            'Fixed-tariff rail haulage without maritime bunker volatility',
          ],
        },
      ],
    }
  }

  return safeFetch<ReroutePlan>(
    `/api/routes/alternatives?from=${encodeURIComponent(fromNodeId)}&to=${encodeURIComponent(toNodeId)}`,
    { method: 'GET' },
    fallbackGenerator
  )
}

/**
 * Confirm and execute a local rerouting decision
 */
export async function confirmReroute(payload: {
  laneId: string
  selectedAlternativeId: string
  selectedAlternativeName: string
  shipmentsCount: number
}): Promise<ApiResponse<RerouteConfirmation>> {
  const fallbackGenerator = (): RerouteConfirmation => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    return {
      trackingId: `SP-RR-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`,
      laneId: payload.laneId,
      selectedAlternativeId: payload.selectedAlternativeId,
      selectedAlternativeName: payload.selectedAlternativeName,
      timestamp: Date.now(),
      estimatedArrival: new Date(Date.now() + 4 * 86400000).toISOString(),
      dispatchedShipments: payload.shipmentsCount || 84,
      status: 'confirmed',
      operator: 'Automated Operations Dispatcher',
    }
  }

  return safeFetch<RerouteConfirmation>(
    '/api/routes/confirm',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    fallbackGenerator
  )
}

/**
 * Simulate What-If Scenario with sliders
 */
export async function simulateScenario(
  params: SimulationParameters,
  baseNodes: SupplyNode[] = NODES
): Promise<ApiResponse<SimulationResult>> {
  const fallbackGenerator = (): SimulationResult => {
    return recalculateNetworkSimulation(baseNodes, params)
  }

  return safeFetch<SimulationResult>(
    '/api/simulate',
    {
      method: 'POST',
      body: JSON.stringify({ params }),
    },
    fallbackGenerator
  )
}

/**
 * Fetch Anomaly Center items
 */
export async function getAnomalies(): Promise<ApiResponse<AnomalyItem[]>> {
  return safeFetch<AnomalyItem[]>('/api/anomalies', { method: 'GET' }, () => MOCK_ANOMALIES)
}

/**
 * AI Event Intelligence: Extract incident entities and parameters from raw text
 */
export async function extractEventFromText(
  rawText: string
): Promise<ApiResponse<ExtractedEvent>> {
  const fallbackGenerator = (): ExtractedEvent => {
    const textLower = rawText.toLowerCase()

    // Determine category based on keywords
    let category: AlertCategory = 'transit'
    if (textLower.includes('typhoon') || textLower.includes('storm') || textLower.includes('monsoon') || textLower.includes('flood') || textLower.includes('weather') || textLower.includes('hurricane')) {
      category = 'weather'
    } else if (textLower.includes('congestion') || textLower.includes('berth') || textLower.includes('dwell') || textLower.includes('queue') || textLower.includes('port')) {
      category = 'congestion'
    } else if (textLower.includes('strike') || textLower.includes('labor') || textLower.includes('walkout') || textLower.includes('tariff') || textLower.includes('war') || textLower.includes('red sea') || textLower.includes('suez') || textLower.includes('geopolitical')) {
      category = 'geopolitical'
    } else if (textLower.includes('wafer') || textLower.includes('supplier') || textLower.includes('shortage') || textLower.includes('capacity') || textLower.includes('maintenance')) {
      category = 'supplier'
    }

    // Determine affected locations & nodes
    const matchedNodes: SupplyNode[] = []
    for (const node of NODES) {
      if (
        textLower.includes(node.city.toLowerCase()) ||
        textLower.includes(node.name.toLowerCase().replace('port of ', '')) ||
        textLower.includes(node.country.toLowerCase())
      ) {
        matchedNodes.push(node)
      }
    }
    if (matchedNodes.length === 0) {
      matchedNodes.push(NODES[1]) // fallback to Shanghai Port
    }

    const primaryNode = matchedNodes[0]

    // Severity estimation
    let severity: AlertSeverity = 'warning'
    if (textLower.includes('critical') || textLower.includes('severe') || textLower.includes('suspend') || textLower.includes('halt') || textLower.includes('strike') || textLower.includes('force majeure')) {
      severity = 'critical'
    } else if (textLower.includes('minor') || textLower.includes('routine') || textLower.includes('notice') || textLower.includes('advisory')) {
      severity = 'info'
    }

    // Heuristically calculate simulation parameters from text
    const isSevere = severity === 'critical'
    let weatherSeverity = category === 'weather' ? (isSevere ? 85 : 55) : 15
    let congestionFactor = category === 'congestion' ? (isSevere ? 80 : 50) : category === 'weather' ? 65 : 20
    let fuelPriceDelta = category === 'geopolitical' ? 40 : textLower.includes('fuel') || textLower.includes('bunker') ? 35 : 10
    let demandShock = category === 'supplier' ? 30 : 5
    let capacityConstraint = isSevere ? 35 : 15

    // Extract any percentage numbers in text
    const percentMatches = rawText.match(/(\d+)\s*%/g)
    if (percentMatches && percentMatches.length > 0) {
      const firstNum = parseInt(percentMatches[0].replace('%', '').trim(), 10)
      if (!isNaN(firstNum)) {
        if (category === 'congestion') congestionFactor = Math.min(100, Math.max(20, firstNum))
        else if (category === 'supplier') capacityConstraint = Math.min(50, Math.max(10, firstNum))
      }
    }

    const estimatedDelayDays = isSevere ? 5.5 : 2.0

    return {
      headline:
        rawText.split('\n')[0].slice(0, 90) ||
        `${category.toUpperCase()} Disruption Advisory: ${primaryNode.name}`,
      incidentCategory: category,
      severity,
      impactedModes:
        category === 'weather' || category === 'congestion'
          ? ['waterways']
          : category === 'supplier'
          ? ['airways', 'railways']
          : ['waterways', 'roadways'],
      affectedLocations: Array.from(new Set(matchedNodes.map((n) => `${n.city}, ${n.country}`))),
      matchedNodeIds: matchedNodes.map((n) => n.id),
      primaryNodeId: primaryNode.id,
      confidenceScore: 94.6,
      estimatedDelayDays,
      suggestedSimParams: {
        fuelPriceDelta,
        congestionFactor,
        demandShock,
        weatherSeverity,
        capacityConstraint,
      },
      keyEntities: [
        { label: 'Primary Node', value: primaryNode.name },
        { label: 'Location', value: `${primaryNode.city}, ${primaryNode.country}` },
        { label: 'Est. Vessel Delay', value: `+${estimatedDelayDays} days` },
        { label: 'Extracted Impact', value: `${category.toUpperCase()} (High Severity)` },
        { label: 'Confidence Score', value: '94.6%' },
      ],
      summary: `Automated NLP parse extracted ${category} disruption affecting ${primaryNode.name}. Suggesting simulator adjustment: Congestion ${congestionFactor}%, Weather ${weatherSeverity}, Fuel +${fuelPriceDelta}%.`,
      recommendedRemediation: `Trigger automated rerouting on lanes feeding ${primaryNode.name}. Divert urgent cargo to air/rail alternative corridors.`,
      riskAttributions: [
        {
          factor: 'Berth / Corridor Exposure',
          deltaPts: category === 'congestion' ? +34 : +18,
          direction: 'up',
          comment: 'Primary channel bottleneck dwell',
        },
        {
          factor: 'Meteorological Stress',
          deltaPts: category === 'weather' ? +38 : +10,
          direction: 'up',
          comment: 'Track proximity and gust intensity',
        },
        {
          factor: 'Buffer Depletion Velocity',
          deltaPts: +14,
          direction: 'up',
          comment: `Drawdown on ${primaryNode.bufferDays} days safety stock`,
        },
        {
          factor: 'Alternative Corridor Mitigation',
          deltaPts: -26,
          direction: 'down',
          comment: 'Available capacity on secondary feeder lanes',
        },
      ],
    }
  }

  return safeFetch<ExtractedEvent>(
    '/api/ai/extract',
    {
      method: 'POST',
      body: JSON.stringify({ text: rawText }),
    },
    fallbackGenerator
  )
}
