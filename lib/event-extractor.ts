import { hashString } from './random'
import { BASELINE_PARAMS, clampParams, type ScenarioFocus, type ScenarioParams } from './simulation'
import { NODE_BY_ID, type Region } from './supply-data'

export type EventType =
  | 'weather'
  | 'congestion'
  | 'labor'
  | 'fuel'
  | 'demand'
  | 'geopolitical'
  | 'capacity'

export type EventSeverity = 'low' | 'medium' | 'high'

export interface ExtractedLocation {
  nodeId: string
  name: string
  matched: string
}

export interface ExtractedEvent {
  id: string
  eventTypes: EventType[]
  primaryType: EventType | null
  severity: EventSeverity
  severityScore: number
  locations: ExtractedLocation[]
  regions: Region[]
  percentages: number[]
  durationHours: number | null
  keywords: string[]
  confidence: number
  summary: string
  suggestedParams: ScenarioParams
  focus: ScenarioFocus | null
  extractor: 'local-demo' | 'backend'
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  weather: 'Weather',
  congestion: 'Port congestion',
  labor: 'Labor disruption',
  fuel: 'Fuel price',
  demand: 'Demand shift',
  geopolitical: 'Geopolitical',
  capacity: 'Capacity loss',
}

const TYPE_KEYWORDS: Record<EventType, string[]> = {
  weather: ['typhoon', 'hurricane', 'cyclone', 'storm', 'flood', 'flooding', 'monsoon', 'snow', 'blizzard', 'heatwave', 'earthquake', 'tsunami', 'fog', 'rainfall', 'landfall'],
  congestion: ['congestion', 'congested', 'backlog', 'berth', 'queue', 'dwell', 'at anchor', 'gate closures', 'yard utilization', 'bottleneck', 'delays'],
  labor: ['strike', 'walkout', 'union', 'slowdown', 'lockout', 'labor', 'labour', 'protest', 'dockworkers'],
  fuel: ['fuel', 'bunker', 'diesel', 'crude', 'oil price', 'surcharge', 'surcharges', 'jet fuel', 'opec'],
  demand: ['demand', 'surge', 'orders', 'peak season', 'promotion', 'pull-forward', 'black friday'],
  geopolitical: ['sanction', 'sanctions', 'tariff', 'tariffs', 'war', 'conflict', 'red sea', 'suez', 'embargo', 'customs', 'attacks', 'attack', 'export ban'],
  capacity: ['shutdown', 'outage', 'fire', 'closure', 'closures', 'shortage', 'allocation', 'blank sailings', 'plant closure', 'power cut', 'explosion', 'nearing capacity'],
}

const HIGH_WORDS = ['severe', 'catastrophic', 'category 4', 'category 5', 'red alert', 'major', 'critical', 'massive', 'record', 'indefinite', 'emergency']
const MEDIUM_WORDS = ['moderate', 'warning', 'significant', 'elevated', 'orange alert', 'renewed']
const LOW_WORDS = ['minor', 'slight', 'limited', 'brief', 'small']

const LOCATION_ALIASES: { terms: string[]; nodeIds: string[] }[] = [
  { terms: ['shanghai', 'yangshan'], nodeIds: ['shanghai-port'] },
  { terms: ['shenzhen', 'pearl river', 'guangdong', 'yantian'], nodeIds: ['shenzhen-supplier'] },
  { terms: ['busan', 'korea'], nodeIds: ['busan-port'] },
  { terms: ['singapore', 'malacca'], nodeIds: ['singapore-hub'] },
  { terms: ['hsinchu', 'taiwan'], nodeIds: ['hsinchu-fab'] },
  { terms: ['ho chi minh', 'saigon', 'vietnam'], nodeIds: ['hcm-assembly'] },
  { terms: ['chennai', 'tamil nadu', 'india'], nodeIds: ['chennai-components'] },
  { terms: ['jebel ali', 'dubai', 'uae', 'red sea', 'suez', 'hormuz', 'persian gulf'], nodeIds: ['jebel-ali'] },
  { terms: ['rotterdam', 'netherlands', 'north sea'], nodeIds: ['rotterdam-port'] },
  { terms: ['hamburg'], nodeIds: ['hamburg-dc'] },
  { terms: ['stuttgart'], nodeIds: ['stuttgart-plant'] },
  { terms: ['germany'], nodeIds: ['hamburg-dc', 'stuttgart-plant'] },
  { terms: ['warsaw', 'poland'], nodeIds: ['warsaw-fc'] },
  { terms: ['los angeles', 'long beach', 'san pedro', 'california'], nodeIds: ['la-port'] },
  { terms: ['monterrey', 'mexico'], nodeIds: ['monterrey-plant'] },
  { terms: ['memphis', 'tennessee'], nodeIds: ['memphis-dc'] },
  { terms: ['savannah', 'georgia'], nodeIds: ['savannah-port'] },
  { terms: ['chicago', 'midwest'], nodeIds: ['chicago-wh'] },
  { terms: ['são paulo', 'sao paulo', 'santos', 'brazil'], nodeIds: ['saopaulo-dc'] },
  { terms: ['china'], nodeIds: ['shanghai-port', 'shenzhen-supplier'] },
]

const REGION_TERMS: { terms: string[]; region: Region }[] = [
  { terms: ['asia', 'apac', 'asia-pacific', 'pacific'], region: 'apac' },
  { terms: ['europe', 'emea', 'middle east'], region: 'emea' },
  { terms: ['americas', 'north america', 'latin america', 'united states', 'us west coast', 'us east coast'], region: 'americas' },
]

export const SAMPLE_EVENTS = [
  {
    label: 'Typhoon',
    text: 'Severe Typhoon Haikui (Category 4) is forecast to make landfall near Shenzhen within 36 hours. Yantian and Shanghai terminals expect berth closures and port congestion for up to 3 days.',
  },
  {
    label: 'Port strike',
    text: 'ILWU dockworkers at Los Angeles and Long Beach announced a 5 day strike starting Monday. Terminal gate closures and a backlog of 40,000 TEU are expected.',
  },
  {
    label: 'Red Sea',
    text: 'Renewed attacks in the Red Sea force carriers to divert around the Cape. Bunker fuel surcharges are up 35% and Jebel Ali reports major transshipment delays.',
  },
  {
    label: 'Demand spike',
    text: 'Retail partners report a 30% surge in orders ahead of peak season across North America, with Memphis and Chicago warehouses nearing capacity.',
  },
]

function containsTerm(text: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i').test(text)
}

/** Rule-based extractor that runs entirely in the browser. Deterministic for the same input. */
export function extractEventLocally(input: string): ExtractedEvent {
  const text = input.toLowerCase().replace(/\s+/g, ' ').trim()
  const keywords: string[] = []

  const typeHits = (Object.keys(TYPE_KEYWORDS) as EventType[])
    .map((type) => {
      const hits = TYPE_KEYWORDS[type].filter((kw) => containsTerm(text, kw))
      keywords.push(...hits)
      return { type, hits: hits.length }
    })
    .filter((t) => t.hits > 0)
    .sort((a, b) => b.hits - a.hits)
  const eventTypes = typeHits.map((t) => t.type)
  const primaryType = eventTypes[0] ?? null

  const locations: ExtractedLocation[] = []
  for (const alias of LOCATION_ALIASES) {
    const matched = alias.terms.find((term) => containsTerm(text, term))
    if (!matched) continue
    for (const nodeId of alias.nodeIds) {
      if (locations.some((l) => l.nodeId === nodeId)) continue
      locations.push({ nodeId, name: NODE_BY_ID[nodeId].name, matched })
    }
  }

  const regions = new Set<Region>(locations.map((l) => NODE_BY_ID[l.nodeId].region))
  for (const entry of REGION_TERMS) {
    if (entry.terms.some((term) => containsTerm(text, term))) regions.add(entry.region)
  }

  const percentages = Array.from(text.matchAll(/(\d+(?:\.\d+)?)\s?%/g)).map((m) => Number(m[1]))
  const durationMatch = text.match(/(\d+(?:\.\d+)?)\s?-?\s?(hours?|hrs?|days?|weeks?)\b/)
  let durationHours: number | null = null
  if (durationMatch) {
    const value = Number(durationMatch[1])
    const unit = durationMatch[2]
    durationHours = Math.round(unit.startsWith('w') ? value * 168 : unit.startsWith('d') ? value * 24 : value)
  }

  const highHits = HIGH_WORDS.filter((w) => containsTerm(text, w))
  const mediumHits = MEDIUM_WORDS.filter((w) => containsTerm(text, w))
  const lowHits = LOW_WORDS.filter((w) => containsTerm(text, w))
  keywords.push(...highHits, ...mediumHits, ...lowHits)

  let severityScore = 0.35
  if (highHits.length) severityScore += 0.25
  if (mediumHits.length) severityScore += 0.12
  if (lowHits.length) severityScore -= 0.15
  severityScore += Math.min(0.15, Math.max(0, eventTypes.length - 1) * 0.05)
  if (durationHours !== null && durationHours >= 72) severityScore += 0.1
  if (percentages.some((p) => p >= 30)) severityScore += 0.1
  severityScore = Math.round(Math.min(1, Math.max(0.1, severityScore)) * 100) / 100
  const severity: EventSeverity = severityScore >= 0.7 ? 'high' : severityScore >= 0.45 ? 'medium' : 'low'

  const pct = percentages[0]
  const params = { ...BASELINE_PARAMS }
  eventTypes.forEach((type, index) => {
    const w = index === 0 ? 1 : 0.6
    const s = severityScore
    switch (type) {
      case 'weather':
        params.weather += (40 + 55 * s) * w
        params.congestion += 15 * s * w
        params.capacity -= 8 * s * w
        break
      case 'congestion':
        params.congestion += (35 + 55 * s) * w
        break
      case 'labor':
        params.capacity -= (15 + 25 * s) * w
        params.congestion += 25 * s * w
        break
      case 'fuel':
        params.fuel += (pct ?? 25 + 60 * s) * w
        break
      case 'demand':
        params.demand += (pct ?? 15 + 35 * s) * w
        break
      case 'geopolitical':
        params.fuel += 25 * s * w
        params.congestion += 30 * s * w
        params.capacity -= 5 * s * w
        break
      case 'capacity':
        params.capacity -= 10 * (0.5 + s) * w
        break
    }
  })

  let confidence = eventTypes.length === 0 ? 0.15 : 0.3 + Math.min(eventTypes.length, 3) * 0.12
  if (locations.length || regions.size) confidence += 0.2
  if (percentages.length || durationHours !== null) confidence += 0.08
  if (text.length > 60) confidence += 0.05
  confidence = Math.round(Math.min(0.96, confidence) * 100) / 100

  const regionList = Array.from(regions)
  const where = locations.length
    ? Array.from(new Set(locations.map((l) => NODE_BY_ID[l.nodeId].city))).slice(0, 3).join(', ')
    : regionList.length
      ? regionList.map((r) => r.toUpperCase()).join(', ')
      : 'network-wide'
  const summary = primaryType
    ? `${severity[0].toUpperCase()}${severity.slice(1)}-severity ${EVENT_TYPE_LABELS[primaryType].toLowerCase()} event affecting ${where}${durationHours ? ` for ~${durationHours}h` : ''}.`
    : 'No recognizable disruption signal found in this text.'

  return {
    id: `evt-${hashString(text).toString(36)}`,
    eventTypes,
    primaryType,
    severity,
    severityScore,
    locations,
    regions: regionList,
    percentages,
    durationHours,
    keywords: Array.from(new Set(keywords)),
    confidence,
    summary,
    suggestedParams: clampParams(params),
    focus:
      locations.length || regionList.length
        ? { label: where, nodeIds: locations.map((l) => l.nodeId), regions: regionList }
        : null,
    extractor: 'local-demo',
  }
}
