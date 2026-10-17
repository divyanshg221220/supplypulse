import { NextResponse } from 'next/server'
import { NODES } from '@/lib/supply-data'
import { type ReroutePlan } from '@/lib/api'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const fromNodeId = searchParams.get('from') || 'shanghai-port'
  const toNodeId = searchParams.get('to') || 'rotterdam-port'

  const fromNode = NODES.find((n) => n.id === fromNodeId) || NODES[1]
  const toNode = NODES.find((n) => n.id === toNodeId) || NODES[8] || NODES[0]

  const plan: ReroutePlan = {
    laneId: `${fromNode.id}->${toNode.id}`,
    fromNode,
    toNode,
    currentRoute: {
      mode: 'sea',
      transitDays: 14,
      shipments: 84,
      bottleneck: `${fromNode.name} Berth Congestion & Weather Alert`,
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
          { name: `${fromNode.city} Pudong Bonded Hub`, type: 'Customs Air Clearance', dwellHours: 4 },
          { name: 'Incheon Intermodal Ramp', type: 'Cross-Dock Transfer', dwellHours: 6 },
          { name: `${toNode.city} Regional Logistics Park`, type: 'Final Mile Dispatch', dwellHours: 3 },
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
          'Bypasses primary port congestion via secondary deepwater berth with slight coastal repositioning; optimal cost/risk ratio.',
        checkpoints: [
          { name: 'Ningbo-Zhoushan Pier 4', type: 'Direct Vessel Berth', dwellHours: 12 },
          { name: 'Busan Transshipment Center', type: 'Feeder Relay', dwellHours: 18 },
          { name: `${toNode.city} Outer Terminal`, type: 'Expedited Yard Discharge', dwellHours: 14 },
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
        via: ['Chongqing Central Freight Hub', 'Manzhouli Gateway', 'Duisburg Intermodal Yard'],
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
          { name: `${toNode.city} Inland Dry Port`, type: 'Container Offload', dwellHours: 10 },
        ],
        keyBenefits: [
          'Completely immune to coastal typhoons and maritime weather advisories',
          'Lowest carbon intensity of all alternative corridors',
          'Fixed-tariff rail haulage without maritime bunker volatility',
        ],
      },
    ],
  }

  return NextResponse.json(plan)
}
