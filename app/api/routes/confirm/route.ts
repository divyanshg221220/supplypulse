import { NextResponse } from 'next/server'
import { type RerouteConfirmation } from '@/lib/api'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const confirmation: RerouteConfirmation = {
      trackingId: `SP-RR-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`,
      laneId: body.laneId || 'default-corridor',
      selectedAlternativeId: body.selectedAlternativeId,
      selectedAlternativeName: body.selectedAlternativeName,
      timestamp: Date.now(),
      estimatedArrival: new Date(Date.now() + 4 * 86400000).toISOString(),
      dispatchedShipments: body.shipmentsCount || 84,
      status: 'confirmed',
      operator: 'Automated Operations Dispatcher',
    }

    return NextResponse.json(confirmation)
  } catch (error) {
    console.error('Error in /api/routes/confirm:', error)
    return NextResponse.json({ error: 'Failed to confirm reroute' }, { status: 500 })
  }
}
