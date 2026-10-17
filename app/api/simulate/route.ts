import { NextResponse } from 'next/server'
import { NODES } from '@/lib/supply-data'
import { recalculateNetworkSimulation, type SimulationParameters } from '@/lib/simulation-engine'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const params: SimulationParameters = body.params || {
      fuelPriceDelta: 0,
      congestionFactor: 0,
      demandShock: 0,
      weatherSeverity: 0,
      capacityConstraint: 0,
    }

    const result = recalculateNetworkSimulation(NODES, params)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in /api/simulate:', error)
    return NextResponse.json({ error: 'Failed to simulate scenario' }, { status: 500 })
  }
}
