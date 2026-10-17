import { NextResponse } from 'next/server'
import { NODES } from '@/lib/supply-data'

export async function GET() {
  return NextResponse.json(NODES)
}
