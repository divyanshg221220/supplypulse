import { NextResponse } from 'next/server'
import { MOCK_ANOMALIES } from '@/lib/api'

export async function GET() {
  return NextResponse.json(MOCK_ANOMALIES)
}
