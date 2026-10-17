import { clamp, seededRandom } from './random'

export type Region = 'americas' | 'emea' | 'apac'
export type RegionFilter = 'all' | Region
export type NodeType = 'supplier' | 'factory' | 'port' | 'warehouse' | 'distribution'
export type NodeStatus = 'healthy' | 'watch' | 'critical'
export type TransportMode = 'sea' | 'air' | 'rail' | 'road'
export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertCategory =
  | 'weather'
  | 'congestion'
  | 'supplier'
  | 'transit'
  | 'quality'
  | 'geopolitical'

export interface RiskFactor {
  label: string
  impact: 'high' | 'medium' | 'low'
}

export interface SupplyNode {
  id: string
  name: string
  type: NodeType
  city: string
  country: string
  region: Region
  lat: number
  lng: number
  riskScore: number
  throughput: number
  throughputUnit: string
  capacityUtilization: number
  bufferDays: number
  onTimeRate: number
  leadTimeDays: number
  activeShipments: number
  manager: string
  riskFactors: RiskFactor[]
}

export interface SupplyRoute {
  id: string
  from: string
  to: string
  mode: TransportMode
  transitDays: number
  shipments: number
}

export interface SupplyAlert {
  id: string
  nodeId: string
  severity: AlertSeverity
  category: AlertCategory
  title: string
  description: string
  createdAt: number
}

export interface TimelinePoint {
  hour: number
  composite: number
  band: [number, number]
  weather: number
  congestion: number
  supplier: number
  geopolitical: number
}

/** Fixed reference "now" so server and client render identical demo data. */
export const BASE_TIME = Date.UTC(2026, 9, 15, 8, 0, 0)

export const REGION_LABELS: Record<RegionFilter, string> = {
  all: 'Global',
  americas: 'Americas',
  emea: 'EMEA',
  apac: 'APAC',
}

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  supplier: 'Supplier',
  factory: 'Factory',
  port: 'Port',
  warehouse: 'Warehouse',
  distribution: 'Distribution Center',
}

export const MODE_LABELS: Record<TransportMode, string> = {
  sea: 'Waterways',
  air: 'Airways',
  rail: 'Railways',
  road: 'Roadways',
}

export interface ModeMetadata {
  id: TransportMode
  label: string
  sublabel: string
  tagline: string
  colorHex: string
  bgClass: string
  borderClass: string
  textClass: string
  avgSpeedKmh: number
  costPerTonKm: number // USD
  co2PerTonKm: number // grams
  reliabilityPct: number
  typicalCapacity: string
  activeUnitsLabel: string
  activeUnitsCount: number
  activeVolumeLabel: string
  activeVolumeValue: string
  avgTransitDays: number
  fuelMetric: string
  chokepoints: string[]
  primaryAdvantages: string[]
  primaryVulnerabilities: string[]
}

export const LOGISTICS_MODES_META: Record<TransportMode, ModeMetadata> = {
  sea: {
    id: 'sea',
    label: 'Waterways',
    sublabel: 'Maritime & Ocean Shipping',
    tagline: 'Deepwater container fleets, inland barges, and maritime straits',
    colorHex: '#06b6d4',
    bgClass: 'bg-cyan-500/10',
    borderClass: 'border-cyan-500/30',
    textClass: 'text-cyan-400',
    avgSpeedKmh: 35,
    costPerTonKm: 0.04,
    co2PerTonKm: 15,
    reliabilityPct: 83.5,
    typicalCapacity: '10,000 - 24,000 TEU per vessel',
    activeUnitsLabel: 'Active Vessels',
    activeUnitsCount: 142,
    activeVolumeLabel: 'Ocean Volume',
    activeVolumeValue: '84,200 TEU',
    avgTransitDays: 18.5,
    fuelMetric: 'VLSFO Bunker: $620/MT (+14%)',
    chokepoints: ['Malacca Strait', 'Bab-el-Mandeb / Suez', 'Panama Canal'],
    primaryAdvantages: [
      'Massive scale capacity for bulk & container cargo',
      'Lowest freight cost per ton-kilometer ($0.04)',
      'Lowest carbon intensity per payload unit (15g CO2/t-km)',
    ],
    primaryVulnerabilities: [
      'Berth and deepwater crane congestion (avg dwell 3.8d)',
      'Canal draft limits and geopolitical maritime chokepoints',
      'Long lead times vulnerable to typhoon weather delays',
    ],
  },
  air: {
    id: 'air',
    label: 'Airways',
    sublabel: 'Air Cargo & Dedicated Freighters',
    tagline: 'High-speed airbridge for semiconductors, pharma & critical parts',
    colorHex: '#38bdf8',
    bgClass: 'bg-sky-500/10',
    borderClass: 'border-sky-500/30',
    textClass: 'text-sky-400',
    avgSpeedKmh: 850,
    costPerTonKm: 1.45,
    co2PerTonKm: 480,
    reliabilityPct: 97.8,
    typicalCapacity: '65 - 135 metric tons per B777F / B747-8F',
    activeUnitsLabel: 'Freighter Flights',
    activeUnitsCount: 54,
    activeVolumeLabel: 'Airfreight Payload',
    activeVolumeValue: '3,850 Metric Tons',
    avgTransitDays: 2.1,
    fuelMetric: 'Jet A-1 Fuel Index: $2.84/kg',
    chokepoints: ['Incheon ICN Hub', 'Anchorage ANC Refuel', 'Frankfurt FRA CargoCity'],
    primaryAdvantages: [
      'Fastest global transit velocity (1-3 days worldwide)',
      'Near-perfect on-time reliability (97.8%)',
      'Temperature-controlled cold chain & high-security handling',
    ],
    primaryVulnerabilities: [
      'High freight rate per kilogram ($1.45/ton-km)',
      'Heavy carbon footprint (32x higher than waterways)',
      'Strict hazardous material & weight density constraints',
    ],
  },
  rail: {
    id: 'rail',
    label: 'Railways',
    sublabel: 'Intermodal Freight Rail & Rail Ramps',
    tagline: 'Double-stack container corridors & continental Eurasian links',
    colorHex: '#f59e0b',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    textClass: 'text-amber-400',
    avgSpeedKmh: 65,
    costPerTonKm: 0.12,
    co2PerTonKm: 28,
    reliabilityPct: 91.2,
    typicalCapacity: '200 - 400 double-stack containers per train',
    activeUnitsLabel: 'Intermodal Trains',
    activeUnitsCount: 68,
    activeVolumeLabel: 'Rail Cars in Transit',
    activeVolumeValue: '12,400 Containers',
    avgTransitDays: 3.4,
    fuelMetric: 'Locomotive Efficiency: 480 ton-miles/gal',
    chokepoints: ['Chicago Clearing Yard', 'Rotterdam Maasvlakte Rail Spine', 'Duisburg Intermodal Terminal'],
    primaryAdvantages: [
      '4x more fuel-efficient than long-haul highway trucking',
      'Overland alternative to maritime canal diversions',
      'Consistent scheduled departure windows & inland reach',
    ],
    primaryVulnerabilities: [
      'Rail yard dwell and container chassis availability deficits',
      'Single-track bottlenecks and terminal crane maintenance',
      'Inflexible rail siding routing compared to road freight',
    ],
  },
  road: {
    id: 'road',
    label: 'Roadways',
    sublabel: 'Long-Haul Trucking & Port Drayage',
    tagline: 'Cross-border tractor-trailers, dedicated fleets & final-mile drayage',
    colorHex: '#10b981',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
    textClass: 'text-emerald-400',
    avgSpeedKmh: 80,
    costPerTonKm: 0.32,
    co2PerTonKm: 95,
    reliabilityPct: 93.6,
    typicalCapacity: '20 - 45 metric tons per 53-foot dry van / reefer',
    activeUnitsLabel: 'Truck Fleets & Convoys',
    activeUnitsCount: 310,
    activeVolumeLabel: 'Highway Freight',
    activeVolumeValue: '7,200 Tons',
    avgTransitDays: 2.2,
    fuelMetric: 'Diesel Spot Index: $3.92/gal',
    chokepoints: ['Laredo Border Crossing', 'I-10 / I-80 Freight Arterials', 'Brenner Pass Alpine Corridor'],
    primaryAdvantages: [
      'Full door-to-door flexibility directly into customer docks',
      'Immediate dispatch readiness with zero railhead transfer dwell',
      'Unmatched short-haul (<800km) transit velocity',
    ],
    primaryVulnerabilities: [
      'Driver hours-of-service regulations & labor shortages',
      'Highway gridlock, urban toll congestion, and roadwork',
      'Highest direct sensitivity to retail diesel price surges',
    ],
  },
}

export function statusFromRisk(risk: number): NodeStatus {
  if (risk >= 70) return 'critical'
  if (risk >= 45) return 'watch'
  return 'healthy'
}

export const NODES: SupplyNode[] = [
  {
    id: 'shenzhen-supplier',
    name: 'Shenzhen Electronics Supplier',
    type: 'supplier',
    city: 'Shenzhen',
    country: 'China',
    region: 'apac',
    lat: 22.54,
    lng: 114.06,
    riskScore: 48,
    throughput: 18400,
    throughputUnit: 'units/day',
    capacityUtilization: 91,
    bufferDays: 9,
    onTimeRate: 88.4,
    leadTimeDays: 12,
    activeShipments: 64,
    manager: 'Li Wei',
    riskFactors: [
      { label: 'Capacity near ceiling (91%)', impact: 'medium' },
      { label: 'Typhoon Koinu track within 400 km', impact: 'medium' },
      { label: 'Resin supplier allocation reduced 8%', impact: 'low' },
    ],
  },
  {
    id: 'shanghai-port',
    name: 'Port of Shanghai',
    type: 'port',
    city: 'Shanghai',
    country: 'China',
    region: 'apac',
    lat: 31.23,
    lng: 121.47,
    riskScore: 78,
    throughput: 41200,
    throughputUnit: 'TEU/week',
    capacityUtilization: 97,
    bufferDays: 4,
    onTimeRate: 71.2,
    leadTimeDays: 3,
    activeShipments: 212,
    manager: 'Chen Yu',
    riskFactors: [
      { label: 'Berth congestion averaging 2.8 days', impact: 'high' },
      { label: 'Customs inspection rate raised to 12%', impact: 'high' },
      { label: 'Typhoon Koinu landfall window +30h', impact: 'medium' },
    ],
  },
  {
    id: 'busan-port',
    name: 'Port of Busan',
    type: 'port',
    city: 'Busan',
    country: 'South Korea',
    region: 'apac',
    lat: 35.1,
    lng: 129.04,
    riskScore: 36,
    throughput: 22600,
    throughputUnit: 'TEU/week',
    capacityUtilization: 78,
    bufferDays: 6,
    onTimeRate: 93.1,
    leadTimeDays: 2,
    activeShipments: 118,
    manager: 'Park Ji-ho',
    riskFactors: [
      { label: 'Feeder vessel schedule reliability 89%', impact: 'low' },
    ],
  },
  {
    id: 'singapore-hub',
    name: 'Singapore Transshipment Hub',
    type: 'port',
    city: 'Singapore',
    country: 'Singapore',
    region: 'apac',
    lat: 1.29,
    lng: 103.85,
    riskScore: 52,
    throughput: 36800,
    throughputUnit: 'TEU/week',
    capacityUtilization: 89,
    bufferDays: 5,
    onTimeRate: 84.6,
    leadTimeDays: 2,
    activeShipments: 176,
    manager: 'Aisha Rahman',
    riskFactors: [
      { label: 'Transshipment backlog near 14k TEU', impact: 'medium' },
      { label: 'Red Sea diversions inflating volumes', impact: 'medium' },
    ],
  },
  {
    id: 'hsinchu-fab',
    name: 'Hsinchu Semiconductor Fab',
    type: 'factory',
    city: 'Hsinchu',
    country: 'Taiwan',
    region: 'apac',
    lat: 24.8,
    lng: 120.97,
    riskScore: 63,
    throughput: 9200,
    throughputUnit: 'wafers/day',
    capacityUtilization: 94,
    bufferDays: 11,
    onTimeRate: 90.2,
    leadTimeDays: 26,
    activeShipments: 38,
    manager: 'Lin Mei-hua',
    riskFactors: [
      { label: 'Single-source for MCU wafers', impact: 'high' },
      { label: 'Grid maintenance window in 18h', impact: 'medium' },
    ],
  },
  {
    id: 'hcm-assembly',
    name: 'Ho Chi Minh Assembly',
    type: 'factory',
    city: 'Ho Chi Minh City',
    country: 'Vietnam',
    region: 'apac',
    lat: 10.82,
    lng: 106.63,
    riskScore: 29,
    throughput: 12800,
    throughputUnit: 'units/day',
    capacityUtilization: 72,
    bufferDays: 14,
    onTimeRate: 95.4,
    leadTimeDays: 9,
    activeShipments: 42,
    manager: 'Nguyen Thanh',
    riskFactors: [{ label: 'Seasonal labor turnover 4%', impact: 'low' }],
  },
  {
    id: 'chennai-components',
    name: 'Chennai Components Supplier',
    type: 'supplier',
    city: 'Chennai',
    country: 'India',
    region: 'apac',
    lat: 13.08,
    lng: 80.27,
    riskScore: 74,
    throughput: 7600,
    throughputUnit: 'units/day',
    capacityUtilization: 64,
    bufferDays: 6,
    onTimeRate: 76.8,
    leadTimeDays: 18,
    activeShipments: 27,
    manager: 'Priya Natarajan',
    riskFactors: [
      { label: 'Monsoon flood warning for industrial corridor', impact: 'high' },
      { label: 'Trucker union strike vote pending', impact: 'medium' },
      { label: 'Output down 22% week over week', impact: 'high' },
    ],
  },
  {
    id: 'jebel-ali',
    name: 'Jebel Ali Port',
    type: 'port',
    city: 'Dubai',
    country: 'UAE',
    region: 'emea',
    lat: 25.01,
    lng: 55.06,
    riskScore: 57,
    throughput: 26400,
    throughputUnit: 'TEU/week',
    capacityUtilization: 86,
    bufferDays: 5,
    onTimeRate: 82.3,
    leadTimeDays: 3,
    activeShipments: 134,
    manager: 'Omar Haddad',
    riskFactors: [
      { label: 'Red Sea diversions adding 9 transit days', impact: 'high' },
      { label: 'War-risk insurance premiums up 30%', impact: 'medium' },
    ],
  },
  {
    id: 'rotterdam-port',
    name: 'Port of Rotterdam',
    type: 'port',
    city: 'Rotterdam',
    country: 'Netherlands',
    region: 'emea',
    lat: 51.95,
    lng: 4.14,
    riskScore: 41,
    throughput: 29800,
    throughputUnit: 'TEU/week',
    capacityUtilization: 81,
    bufferDays: 7,
    onTimeRate: 91.7,
    leadTimeDays: 2,
    activeShipments: 158,
    manager: 'Sanne de Vries',
    riskFactors: [
      { label: 'Bunching of Asia arrivals mid-week', impact: 'medium' },
    ],
  },
  {
    id: 'hamburg-dc',
    name: 'Hamburg Distribution Center',
    type: 'distribution',
    city: 'Hamburg',
    country: 'Germany',
    region: 'emea',
    lat: 53.55,
    lng: 9.99,
    riskScore: 22,
    throughput: 14200,
    throughputUnit: 'orders/day',
    capacityUtilization: 68,
    bufferDays: 21,
    onTimeRate: 97.1,
    leadTimeDays: 1,
    activeShipments: 89,
    manager: 'Jonas Becker',
    riskFactors: [{ label: 'No material risks detected', impact: 'low' }],
  },
  {
    id: 'stuttgart-plant',
    name: 'Stuttgart Assembly Plant',
    type: 'factory',
    city: 'Stuttgart',
    country: 'Germany',
    region: 'emea',
    lat: 48.78,
    lng: 9.18,
    riskScore: 46,
    throughput: 3100,
    throughputUnit: 'units/day',
    capacityUtilization: 83,
    bufferDays: 5,
    onTimeRate: 89.9,
    leadTimeDays: 7,
    activeShipments: 31,
    manager: 'Katrin Vogel',
    riskFactors: [
      { label: 'Chip buffer below 5-day safety stock', impact: 'medium' },
      { label: 'Upstream exposure to Hsinchu fab', impact: 'medium' },
    ],
  },
  {
    id: 'warsaw-fc',
    name: 'Warsaw Fulfillment Center',
    type: 'warehouse',
    city: 'Warsaw',
    country: 'Poland',
    region: 'emea',
    lat: 52.23,
    lng: 21.01,
    riskScore: 18,
    throughput: 9800,
    throughputUnit: 'orders/day',
    capacityUtilization: 61,
    bufferDays: 24,
    onTimeRate: 98.2,
    leadTimeDays: 1,
    activeShipments: 56,
    manager: 'Marek Nowak',
    riskFactors: [{ label: 'No material risks detected', impact: 'low' }],
  },
  {
    id: 'la-port',
    name: 'Port of Los Angeles',
    type: 'port',
    city: 'Los Angeles',
    country: 'United States',
    region: 'americas',
    lat: 33.74,
    lng: -118.26,
    riskScore: 71,
    throughput: 33500,
    throughputUnit: 'TEU/week',
    capacityUtilization: 93,
    bufferDays: 4,
    onTimeRate: 74.9,
    leadTimeDays: 3,
    activeShipments: 198,
    manager: 'Maria Gonzalez',
    riskFactors: [
      { label: 'Chassis shortage slowing drayage', impact: 'high' },
      { label: 'ILWU shift slowdown reported', impact: 'high' },
      { label: 'Inbound Asia volumes +14% vs plan', impact: 'medium' },
    ],
  },
  {
    id: 'monterrey-plant',
    name: 'Monterrey Manufacturing Plant',
    type: 'factory',
    city: 'Monterrey',
    country: 'Mexico',
    region: 'americas',
    lat: 25.69,
    lng: -100.32,
    riskScore: 33,
    throughput: 5400,
    throughputUnit: 'units/day',
    capacityUtilization: 76,
    bufferDays: 12,
    onTimeRate: 94.3,
    leadTimeDays: 5,
    activeShipments: 47,
    manager: 'Diego Ramírez',
    riskFactors: [
      { label: 'Border crossing wait times +40 min', impact: 'low' },
    ],
  },
  {
    id: 'memphis-dc',
    name: 'Memphis Distribution Center',
    type: 'distribution',
    city: 'Memphis',
    country: 'United States',
    region: 'americas',
    lat: 35.15,
    lng: -90.05,
    riskScore: 39,
    throughput: 21600,
    throughputUnit: 'orders/day',
    capacityUtilization: 84,
    bufferDays: 16,
    onTimeRate: 92.8,
    leadTimeDays: 1,
    activeShipments: 143,
    manager: 'Andre Williams',
    riskFactors: [
      { label: 'Exposure to LA port inbound delays', impact: 'medium' },
    ],
  },
  {
    id: 'savannah-port',
    name: 'Port of Savannah',
    type: 'port',
    city: 'Savannah',
    country: 'United States',
    region: 'americas',
    lat: 32.08,
    lng: -81.09,
    riskScore: 27,
    throughput: 18900,
    throughputUnit: 'TEU/week',
    capacityUtilization: 74,
    bufferDays: 8,
    onTimeRate: 95.6,
    leadTimeDays: 2,
    activeShipments: 101,
    manager: 'Rachel Kim',
    riskFactors: [{ label: 'Rail interchange dwell rising', impact: 'low' }],
  },
  {
    id: 'chicago-wh',
    name: 'Chicago Regional Warehouse',
    type: 'warehouse',
    city: 'Chicago',
    country: 'United States',
    region: 'americas',
    lat: 41.88,
    lng: -87.63,
    riskScore: 31,
    throughput: 11300,
    throughputUnit: 'orders/day',
    capacityUtilization: 79,
    bufferDays: 18,
    onTimeRate: 94.9,
    leadTimeDays: 1,
    activeShipments: 77,
    manager: 'Tom Brennan',
    riskFactors: [{ label: 'Early winter storm watch (+60h)', impact: 'low' }],
  },
  {
    id: 'saopaulo-dc',
    name: 'São Paulo Distribution Center',
    type: 'distribution',
    city: 'São Paulo',
    country: 'Brazil',
    region: 'americas',
    lat: -23.55,
    lng: -46.63,
    riskScore: 58,
    throughput: 8700,
    throughputUnit: 'orders/day',
    capacityUtilization: 88,
    bufferDays: 7,
    onTimeRate: 81.4,
    leadTimeDays: 2,
    activeShipments: 64,
    manager: 'Beatriz Souza',
    riskFactors: [
      { label: 'Customs auditors strike, day 3', impact: 'high' },
      { label: 'Santos port dwell up 1.6 days', impact: 'medium' },
    ],
  },
]

export const ROUTES: SupplyRoute[] = [
  { id: 'r1', from: 'shenzhen-supplier', to: 'la-port', mode: 'sea', transitDays: 16, shipments: 22 },
  { id: 'r2', from: 'shanghai-port', to: 'la-port', mode: 'sea', transitDays: 14, shipments: 48 },
  { id: 'r3', from: 'busan-port', to: 'la-port', mode: 'sea', transitDays: 11, shipments: 31 },
  { id: 'r4', from: 'shanghai-port', to: 'rotterdam-port', mode: 'sea', transitDays: 34, shipments: 26 },
  { id: 'r5', from: 'singapore-hub', to: 'jebel-ali', mode: 'sea', transitDays: 9, shipments: 29 },
  { id: 'r6', from: 'jebel-ali', to: 'rotterdam-port', mode: 'sea', transitDays: 21, shipments: 24 },
  { id: 'r7', from: 'hsinchu-fab', to: 'memphis-dc', mode: 'air', transitDays: 2, shipments: 12 },
  { id: 'r8', from: 'hcm-assembly', to: 'singapore-hub', mode: 'sea', transitDays: 3, shipments: 18 },
  { id: 'r9', from: 'chennai-components', to: 'singapore-hub', mode: 'sea', transitDays: 6, shipments: 14 },
  { id: 'r10', from: 'rotterdam-port', to: 'hamburg-dc', mode: 'rail', transitDays: 1, shipments: 37 },
  { id: 'r11', from: 'rotterdam-port', to: 'stuttgart-plant', mode: 'rail', transitDays: 2, shipments: 19 },
  { id: 'r12', from: 'hamburg-dc', to: 'warsaw-fc', mode: 'road', transitDays: 1, shipments: 28 },
  { id: 'r13', from: 'la-port', to: 'chicago-wh', mode: 'rail', transitDays: 4, shipments: 33 },
  { id: 'r14', from: 'la-port', to: 'memphis-dc', mode: 'rail', transitDays: 4, shipments: 41 },
  { id: 'r15', from: 'savannah-port', to: 'memphis-dc', mode: 'road', transitDays: 2, shipments: 25 },
  { id: 'r16', from: 'monterrey-plant', to: 'chicago-wh', mode: 'road', transitDays: 3, shipments: 16 },
  { id: 'r17', from: 'rotterdam-port', to: 'savannah-port', mode: 'sea', transitDays: 12, shipments: 15 },
  { id: 'r18', from: 'savannah-port', to: 'saopaulo-dc', mode: 'sea', transitDays: 13, shipments: 11 },
  { id: 'r19', from: 'hsinchu-fab', to: 'stuttgart-plant', mode: 'air', transitDays: 2, shipments: 9 },
  { id: 'r20', from: 'shenzhen-supplier', to: 'hcm-assembly', mode: 'road', transitDays: 4, shipments: 13 },
]

export const NODE_BY_ID: Record<string, SupplyNode> = Object.fromEntries(
  NODES.map((node) => [node.id, node]),
)

export function routeStatus(route: SupplyRoute): NodeStatus {
  const risk = Math.max(
    NODE_BY_ID[route.from]?.riskScore ?? 0,
    NODE_BY_ID[route.to]?.riskScore ?? 0,
  )
  return statusFromRisk(risk)
}

export function getConnections(nodeId: string) {
  const inbound = ROUTES.filter((r) => r.to === nodeId).map((route) => ({
    route,
    node: NODE_BY_ID[route.from],
  }))
  const outbound = ROUTES.filter((r) => r.from === nodeId).map((route) => ({
    route,
    node: NODE_BY_ID[route.to],
  }))
  return { inbound, outbound }
}

const minutesAgo = (minutes: number) => BASE_TIME - minutes * 60_000

export const INITIAL_ALERTS: SupplyAlert[] = [
  {
    id: 'a-1',
    nodeId: 'shanghai-port',
    severity: 'critical',
    category: 'congestion',
    title: 'Berth congestion exceeds 2.8 days',
    description: '31 vessels at anchor. 48 inbound shipments to LA at risk of rollover.',
    createdAt: minutesAgo(4),
  },
  {
    id: 'a-2',
    nodeId: 'chennai-components',
    severity: 'critical',
    category: 'weather',
    title: 'Flood warning: Chennai industrial corridor',
    description: 'IMD red alert issued. Supplier output already down 22% week over week.',
    createdAt: minutesAgo(11),
  },
  {
    id: 'a-3',
    nodeId: 'la-port',
    severity: 'warning',
    category: 'transit',
    title: 'Chassis shortage slowing drayage',
    description: 'Average container dwell up to 5.2 days. Rail cut-offs at risk.',
    createdAt: minutesAgo(19),
  },
  {
    id: 'a-4',
    nodeId: 'hsinchu-fab',
    severity: 'warning',
    category: 'supplier',
    title: 'Scheduled grid maintenance window',
    description: 'Taipower maintenance in 18h. Fab running on backup for ~6 hours.',
    createdAt: minutesAgo(33),
  },
  {
    id: 'a-5',
    nodeId: 'rotterdam-port',
    severity: 'info',
    category: 'transit',
    title: 'MSC Aurora berthed ahead of ETA',
    description: '1,240 TEU discharged 9 hours early. Rail slots reallocated to Stuttgart.',
    createdAt: minutesAgo(47),
  },
  {
    id: 'a-6',
    nodeId: 'saopaulo-dc',
    severity: 'warning',
    category: 'geopolitical',
    title: 'Customs auditors strike enters day 3',
    description: 'Clearance backlog estimated at 640 entries. Expect +2 day delays.',
    createdAt: minutesAgo(62),
  },
  {
    id: 'a-7',
    nodeId: 'hamburg-dc',
    severity: 'info',
    category: 'quality',
    title: 'Cycle count completed at 99.2% accuracy',
    description: 'Quarterly inventory reconciliation closed with no material variance.',
    createdAt: minutesAgo(85),
  },
]

export const SIMULATED_ALERT_POOL: Omit<SupplyAlert, 'id' | 'createdAt'>[] = [
  {
    nodeId: 'singapore-hub',
    severity: 'critical',
    category: 'congestion',
    title: 'Transshipment backlog crossed 14k TEU',
    description: 'Yard utilization at 92%. Connecting feeders delayed 36h on average.',
  },
  {
    nodeId: 'shenzhen-supplier',
    severity: 'warning',
    category: 'weather',
    title: 'Typhoon Koinu cone shifted 60 km west',
    description: 'Factory may suspend outdoor loading within 24h. Pull forward pickups.',
  },
  {
    nodeId: 'memphis-dc',
    severity: 'info',
    category: 'transit',
    title: 'Overnight sort completed 18 min early',
    description: 'All outbound trailers dispatched. Next-day SLA at 99.1%.',
  },
  {
    nodeId: 'jebel-ali',
    severity: 'warning',
    category: 'geopolitical',
    title: 'Red Sea diversions add 9 days to Asia–EU lanes',
    description: 'Three carriers confirmed Cape of Good Hope routing through November.',
  },
  {
    nodeId: 'la-port',
    severity: 'critical',
    category: 'congestion',
    title: 'Terminal gate closures for 06:00 shift',
    description: 'Two terminals closing gates. 41 rail-bound containers need rebooking.',
  },
  {
    nodeId: 'monterrey-plant',
    severity: 'info',
    category: 'quality',
    title: 'Line 3 OEE recovered to 87%',
    description: 'Tooling change complete. Output back above weekly plan.',
  },
  {
    nodeId: 'stuttgart-plant',
    severity: 'warning',
    category: 'supplier',
    title: 'Chip buffer below 5-day safety stock',
    description: 'Expedited air freight from Hsinchu recommended to avoid line stoppage.',
  },
  {
    nodeId: 'busan-port',
    severity: 'info',
    category: 'weather',
    title: 'Clear weather window for next 48h',
    description: 'Opportunity to absorb diverted volume from Shanghai.',
  },
  {
    nodeId: 'savannah-port',
    severity: 'warning',
    category: 'transit',
    title: 'Rail interchange dwell rising (+6h)',
    description: 'Norfolk Southern reporting crew shortages on the Atlanta corridor.',
  },
  {
    nodeId: 'shanghai-port',
    severity: 'critical',
    category: 'geopolitical',
    title: 'Customs inspection rate raised to 12%',
    description: 'Electronics HS codes targeted. Expect 1–2 day release delays.',
  },
]

export function filterNodesByRegion(region: RegionFilter) {
  return region === 'all' ? NODES : NODES.filter((n) => n.region === region)
}

interface DriverProfile {
  base: number
  amp: number
  period: number
  phase: number
  event?: { center: number; width: number; height: number }
}

const DRIVER_PROFILES: Record<
  RegionFilter,
  Record<'weather' | 'congestion' | 'supplier' | 'geopolitical', DriverProfile>
> = {
  all: {
    weather: { base: 38, amp: 8, period: 24, phase: 2, event: { center: 30, width: 7, height: 34 } },
    congestion: { base: 52, amp: 6, period: 24, phase: 8, event: { center: 40, width: 12, height: 18 } },
    supplier: { base: 41, amp: 4, period: 36, phase: 0, event: { center: 18, width: 5, height: 16 } },
    geopolitical: { base: 34, amp: 3, period: 48, phase: 4 },
  },
  apac: {
    weather: { base: 44, amp: 9, period: 24, phase: 1, event: { center: 30, width: 6, height: 42 } },
    congestion: { base: 61, amp: 7, period: 24, phase: 6, event: { center: 38, width: 10, height: 20 } },
    supplier: { base: 49, amp: 5, period: 36, phase: 3, event: { center: 18, width: 4, height: 22 } },
    geopolitical: { base: 31, amp: 3, period: 48, phase: 0 },
  },
  emea: {
    weather: { base: 24, amp: 6, period: 24, phase: 5 },
    congestion: { base: 41, amp: 5, period: 24, phase: 9, event: { center: 50, width: 9, height: 14 } },
    supplier: { base: 38, amp: 4, period: 36, phase: 2, event: { center: 44, width: 8, height: 15 } },
    geopolitical: { base: 47, amp: 4, period: 48, phase: 6, event: { center: 24, width: 14, height: 12 } },
  },
  americas: {
    weather: { base: 29, amp: 7, period: 24, phase: 3, event: { center: 60, width: 8, height: 26 } },
    congestion: { base: 55, amp: 8, period: 24, phase: 7, event: { center: 22, width: 9, height: 22 } },
    supplier: { base: 33, amp: 4, period: 36, phase: 1 },
    geopolitical: { base: 36, amp: 3, period: 48, phase: 5, event: { center: 48, width: 12, height: 9 } },
  },
}

function evaluateDriver(profile: DriverProfile, hour: number, noise: number) {
  const cyclic = profile.amp * Math.sin(((hour + profile.phase) / profile.period) * Math.PI * 2)
  const event = profile.event
    ? profile.event.height *
      Math.exp(-((hour - profile.event.center) ** 2) / (2 * profile.event.width ** 2))
    : 0
  return clamp(profile.base + cyclic + event + noise, 0, 100)
}

export function generateRiskTimeline(region: RegionFilter): TimelinePoint[] {
  const rand = seededRandom(`timeline-${region}`)
  const profiles = DRIVER_PROFILES[region]
  const points: TimelinePoint[] = []
  for (let hour = 0; hour <= 72; hour++) {
    const weather = evaluateDriver(profiles.weather, hour, (rand() - 0.5) * 5)
    const congestion = evaluateDriver(profiles.congestion, hour, (rand() - 0.5) * 4)
    const supplier = evaluateDriver(profiles.supplier, hour, (rand() - 0.5) * 4)
    const geopolitical = evaluateDriver(profiles.geopolitical, hour, (rand() - 0.5) * 3)
    const composite = clamp(
      weather * 0.3 + congestion * 0.32 + supplier * 0.24 + geopolitical * 0.14 + 8,
      0,
      100,
    )
    const spread = 3 + hour * 0.14
    points.push({
      hour,
      composite: Math.round(composite * 10) / 10,
      band: [
        Math.round(clamp(composite - spread, 0, 100) * 10) / 10,
        Math.round(clamp(composite + spread, 0, 100) * 10) / 10,
      ],
      weather: Math.round(weather * 10) / 10,
      congestion: Math.round(congestion * 10) / 10,
      supplier: Math.round(supplier * 10) / 10,
      geopolitical: Math.round(geopolitical * 10) / 10,
    })
  }
  return points
}

export function generateNodeRiskSeries(node: SupplyNode) {
  const rand = seededRandom(`node-${node.id}`)
  const series: { hour: number; risk: number }[] = []
  let value = node.riskScore
  const drift = (rand() - 0.4) * 0.25
  for (let hour = 0; hour <= 72; hour += 3) {
    value = clamp(value + drift * 3 + (rand() - 0.5) * 6, 5, 98)
    series.push({ hour, risk: Math.round(value) })
  }
  series[0] = { hour: 0, risk: node.riskScore }
  return series
}

export function generateSparkline(key: string, endValue: number, volatility: number, length = 14) {
  const rand = seededRandom(`spark-${key}`)
  const values: number[] = [endValue]
  for (let i = 1; i < length; i++) {
    const prev = values[i - 1]
    values.push(prev + (rand() - 0.5) * volatility * 2)
  }
  return values.reverse().map((value, index) => ({ index, value: Math.max(0, value) }))
}
