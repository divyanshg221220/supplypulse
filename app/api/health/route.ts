import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    service: 'SupplyPulse Operations Backend',
    version: '1.0.0',
    geminiOnline: Boolean(process.env.GEMINI_API_KEY),
  })
}
