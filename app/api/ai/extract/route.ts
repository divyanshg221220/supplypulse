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
  "impactedModes": ["waterways" | "airways" | "railways" | "roadways"],
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
    { "label": "Transport Mode", "value": "Waterways / Airways / Railways / Roadways" },
    { "label": "Impact Zone", "value": "Location" },
    { "label": "Delay Estimate", "value": "+X days" },
    { "label": "Vessel / Vehicle Backlog", "value": "Count" }
  ],
  "summary": "2-3 sentence executive operational impact summary",
  "recommendedRemediation": "Immediate recommended mitigation action for the dispatcher",
  "riskAttributions": [
    { "factor": "Factor Name", "deltaPts": 28, "direction": "up", "comment": "Explanation" },
    { "factor": "Mitigation Factor", "deltaPts": -15, "direction": "down", "comment": "Explanation" }
  ]
}
`

import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-flash-latest']

async function requestGeminiModel(
  model: string,
  payloadStr: string
): Promise<{ text: string; model: string }> {
  // Method 1: Try curl.exe on Windows/Linux to bypass Node undici IPv6 connection timeouts
  try {
    const { stdout } = await execFileAsync(
      'curl.exe',
      [
        '-s',
        '--connect-timeout',
        '8',
        '-m',
        '25',
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
        '-H',
        'Content-Type: application/json',
        '-d',
        payloadStr,
      ],
      { maxBuffer: 10 * 1024 * 1024 }
    )

    if (stdout && stdout.trim().startsWith('{')) {
      const json = JSON.parse(stdout)
      if (json.error) {
        throw new Error(`[${model}] API error ${json.error.code}: ${json.error.message}`)
      }
      const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text
      if (candidateText) {
        return { text: candidateText, model }
      }
    }
  } catch (curlErr: any) {
    // If curl isn't available or fails, proceed to fetch
    if (!curlErr.message?.includes('API error')) {
      console.warn(`curl.exe attempt for ${model} failed, attempting fetch:`, curlErr.message)
    } else {
      throw curlErr
    }
  }

  // Method 2: Standard fetch fallback
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`
  const geminiRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(18000),
    body: payloadStr,
  })

  if (!geminiRes.ok) {
    const errText = await geminiRes.text()
    throw new Error(`[${model}] HTTP ${geminiRes.status}: ${errText}`)
  }

  const geminiData = await geminiRes.json()
  const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
  if (!candidateText) {
    throw new Error(`[${model}] No candidate text received`)
  }

  return { text: candidateText, model }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const rawText = body.text || ''

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'Text prompt is required' }, { status: 400 })
    }

    if (GEMINI_API_KEY) {
      const payloadStr = JSON.stringify({
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
      })

      for (const model of CANDIDATE_MODELS) {
        try {
          const { text: candidateText, model: usedModel } = await requestGeminiModel(
            model,
            payloadStr
          )

          // Sanitize raw response if fenced
          const cleaned = candidateText
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim()

          const parsed = JSON.parse(cleaned) as Partial<ExtractedEvent>

          // Validate and ensure complete fields
          const fallback = generateLocalFallback(rawText)
          const result: ExtractedEvent = {
            headline: parsed.headline || fallback.headline,
            incidentCategory: parsed.incidentCategory || fallback.incidentCategory,
            severity: parsed.severity || fallback.severity,
            impactedModes: parsed.impactedModes || fallback.impactedModes,
            affectedLocations: parsed.affectedLocations?.length
              ? parsed.affectedLocations
              : fallback.affectedLocations,
            matchedNodeIds: parsed.matchedNodeIds?.length
              ? parsed.matchedNodeIds
              : fallback.matchedNodeIds,
            primaryNodeId: parsed.primaryNodeId || fallback.primaryNodeId,
            confidenceScore:
              typeof parsed.confidenceScore === 'number'
                ? parsed.confidenceScore > 1
                  ? parsed.confidenceScore
                  : Math.round(parsed.confidenceScore * 100)
                : fallback.confidenceScore,
            estimatedDelayDays:
              typeof parsed.estimatedDelayDays === 'number'
                ? parsed.estimatedDelayDays
                : fallback.estimatedDelayDays,
            suggestedSimParams: {
              ...fallback.suggestedSimParams,
              ...(parsed.suggestedSimParams || {}),
            },
            keyEntities: parsed.keyEntities?.length ? parsed.keyEntities : fallback.keyEntities,
            summary: parsed.summary || fallback.summary,
            recommendedRemediation:
              parsed.recommendedRemediation || fallback.recommendedRemediation,
            riskAttributions: parsed.riskAttributions?.length
              ? parsed.riskAttributions
              : fallback.riskAttributions,
            isLiveGemini: true,
            modelVersion: usedModel,
          }

          return NextResponse.json(result)
        } catch (modelErr: any) {
          console.warn(`Gemini model ${model} invocation attempt failed:`, modelErr.message)
        }
      }
    }

    // Graceful fallback to deterministic extractor if all Gemini models failed
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

  const impactedModes: ('waterways' | 'airways' | 'railways' | 'roadways')[] = []
  if (textLower.includes('vessel') || textLower.includes('port') || textLower.includes('berth') || textLower.includes('maritime') || textLower.includes('typhoon') || textLower.includes('ocean')) {
    impactedModes.push('waterways')
  }
  if (textLower.includes('air') || textLower.includes('flight') || textLower.includes('wafer') || textLower.includes('semiconductor')) {
    impactedModes.push('airways')
  }
  if (textLower.includes('rail') || textLower.includes('train') || textLower.includes('chassis') || textLower.includes('intermodal')) {
    impactedModes.push('railways')
  }
  if (textLower.includes('truck') || textLower.includes('highway') || textLower.includes('road') || textLower.includes('drayage')) {
    impactedModes.push('roadways')
  }
  if (impactedModes.length === 0) impactedModes.push('waterways')

  return {
    headline: rawText.split('\n')[0].slice(0, 85) || `${category.toUpperCase()} Disruption Advisory`,
    incidentCategory: category,
    severity: isSevere ? 'critical' : 'warning',
    impactedModes,
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
      { label: 'Transport Mode', value: impactedModes.map((m) => m.toUpperCase()).join(' & ') },
      { label: 'Location', value: `${primaryNode.city}, ${primaryNode.country}` },
      { label: 'Est. Delay', value: isSevere ? '+5.5 days' : '+2.5 days' },
      { label: 'Source', value: 'Local Deterministic Fallback' },
    ],
    summary: `Identified ${category} anomaly impacting ${primaryNode.name} across ${impactedModes.join(', ')} based on operational advisory keywords.`,
    recommendedRemediation: `Initiate automated rerouting protocols and buffer drawing around ${primaryNode.name}.`,
    riskAttributions: [
      { factor: 'Primary Disruption Impact', deltaPts: +34, direction: 'up', comment: 'Direct corridor bottleneck' },
      { factor: 'Meteorological Vulnerability', deltaPts: +22, direction: 'up', comment: 'Coastal exposure rating' },
      { factor: 'Alternative Buffer Capacity', deltaPts: -18, direction: 'down', comment: 'Secondary facility buffer availability' },
    ],
  }
}
