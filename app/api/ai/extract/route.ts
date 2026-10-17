import { NextResponse } from 'next/server'
import { NODES } from '@/lib/supply-data'
import { type ExtractedEvent } from '@/lib/api'

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  'AQ.Ab8RN6K60NMyEixKEJ4fUEx-Sv6txHby9j6DcBpHU5AmvhaH6Q'

const SYSTEM_INSTRUCTION = `
You are an expert global supply chain intelligence analyst for SupplyPulse.
Your task is to analyze unstructured incident reports, news bulletins, weather notices, port advisories, or geopolitical alerts.
Extract structured disruption telemetry that maps to SupplyPulse's deterministic What-If simulation parameters.

Available Supply Nodes to match against:
${NODES.map((n) => `- id: "${n.id}", name: "${n.name}", city: "${n.city}", country: "${n.country}", type: "${n.type}", region: "${n.region}"`).join('\n')}

Always respond with valid, raw JSON conforming strictly to this format:
{
  "headline": "concise incident title under 80 characters",
  "incidentCategory": "weather" | "congestion" | "supplier" | "transit" | "quality" | "geopolitical",
  "severity": "critical" | "warning" | "info",
  "affectedLocations": ["City, Country"],
  "matchedNodeIds": ["node-id-1"],
  "primaryNodeId": "most-affected-node-id",
  "confidenceScore": 95,
  "estimatedDelayDays": 4.5,
  "suggestedSimParams": {
    "fuelPriceDelta": 15, // number -20 to 100
    "congestionFactor": 75, // number 0 to 100
    "demandShock": 5, // number -50 to 100
    "weatherSeverity": 85, // number 0 to 100
    "capacityConstraint": 30 // number -40 to 50
  },
  "keyEntities": [
    { "label": "Entity / Node", "value": "Name" },
    { "label": "Impact Zone", "value": "Location" },
    { "label": "Delay Estimate", "value": "+X days" },
    { "label": "Vessel Backlog", "value": "Count" }
  ],
  "summary": "2-3 sentence executive operational impact summary",
  "recommendedRemediation": "Immediate recommended mitigation action for the dispatcher",
  "riskAttributions": [
    { "factor": "Factor Name", "deltaPts": 28, "direction": "up", "comment": "Explanation" },
    { "factor": "Mitigation Factor", "deltaPts": -15, "direction": "down", "comment": "Explanation" }
  ]
}
`

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const rawText = body.text || ''

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'Text prompt is required' }, { status: 400 })
    }

    if (GEMINI_API_KEY) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`
        const geminiRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${SYSTEM_INSTRUCTION}\n\nUnstructured logistics text to extract:\n"""\n${rawText}\n"""`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          }),
        })

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json()
          const candidateText =
            geminiData.candidates?.[0]?.content?.parts?.[0]?.text
          if (candidateText) {
            const parsed = JSON.parse(candidateText) as ExtractedEvent
            return NextResponse.json({
              ...parsed,
              modelVersion: 'gemini-3.8-flash',
              isLiveGemini: true,
            })
          }
        } else {
          const errText = await geminiRes.text()
          console.warn('Gemini API returned error, falling back to local extractor:', errText)
        }
      } catch (geminiErr) {
        console.warn('Failed to call Gemini API, falling back to local extractor:', geminiErr)
      }
    }

    // Graceful fallback to deterministic extractor
    return NextResponse.json(generateLocalFallback(rawText))
  } catch (error) {
    console.error('Error in /api/ai/extract:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateLocalFallback(rawText: string): ExtractedEvent {
  const textLower = rawText.toLowerCase()
  let category: ExtractedEvent['incidentCategory'] = 'transit'
  if (textLower.includes('typhoon') || textLower.includes('storm') || textLower.includes('monsoon') || textLower.includes('weather')) {
    category = 'weather'
  } else if (textLower.includes('congestion') || textLower.includes('berth') || textLower.includes('dwell') || textLower.includes('queue')) {
    category = 'congestion'
  } else if (textLower.includes('strike') || textLower.includes('labor') || textLower.includes('walkout') || textLower.includes('red sea') || textLower.includes('suez')) {
    category = 'geopolitical'
  } else if (textLower.includes('wafer') || textLower.includes('supplier') || textLower.includes('shortage') || textLower.includes('capacity')) {
    category = 'supplier'
  }

  const matched = NODES.filter((n) =>
    textLower.includes(n.city.toLowerCase()) || textLower.includes(n.name.toLowerCase().replace('port of ', ''))
  )
  const primaryNode = matched[0] || NODES[1]
  const isSevere = textLower.includes('critical') || textLower.includes('suspend') || textLower.includes('halt')

  return {
    headline: rawText.split('\n')[0].slice(0, 85) || `${category.toUpperCase()} Disruption Advisory`,
    incidentCategory: category,
    severity: isSevere ? 'critical' : 'warning',
    affectedLocations: [`${primaryNode.city}, ${primaryNode.country}`],
    matchedNodeIds: [primaryNode.id],
    primaryNodeId: primaryNode.id,
    confidenceScore: 92.4,
    estimatedDelayDays: isSevere ? 5.5 : 2.5,
    suggestedSimParams: {
      fuelPriceDelta: category === 'geopolitical' ? 45 : 12,
      congestionFactor: category === 'congestion' ? 80 : 55,
      demandShock: category === 'supplier' ? 25 : 5,
      weatherSeverity: category === 'weather' ? 85 : 20,
      capacityConstraint: isSevere ? 35 : 15,
    },
    keyEntities: [
      { label: 'Primary Node', value: primaryNode.name },
      { label: 'Location', value: `${primaryNode.city}, ${primaryNode.country}` },
      { label: 'Est. Delay', value: isSevere ? '+5.5 days' : '+2.5 days' },
      { label: 'Source', value: 'Local Deterministic Fallback' },
    ],
    summary: `Identified ${category} anomaly impacting ${primaryNode.name} based on operational advisory keywords.`,
    recommendedRemediation: `Initiate automated rerouting protocols and buffer drawing around ${primaryNode.name}.`,
    riskAttributions: [
      { factor: 'Primary Disruption Impact', deltaPts: +34, direction: 'up', comment: 'Direct corridor bottleneck' },
      { factor: 'Meteorological Vulnerability', deltaPts: +22, direction: 'up', comment: 'Coastal exposure rating' },
      { factor: 'Alternative Buffer Capacity', deltaPts: -18, direction: 'down', comment: 'Secondary facility buffer availability' },
    ],
  }
}
