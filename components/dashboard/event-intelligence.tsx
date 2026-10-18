'use client'

import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  FileText,
  HelpCircle,
  Loader2,
  MapPin,
  Send,
  Sliders,
  Sparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { extractEventFromText, type ExtractedEvent } from '@/lib/api'
import { type SimulationParameters } from '@/lib/simulation-engine'
import { cn } from '@/lib/utils'
import { Panel } from './panel'

const SAMPLE_BULLETINS = [
  {
    label: 'Typhoon Warning — Shanghai',
    text: `URGENT MARITIME BULLETIN: Typhoon Gaemi category 4 tracking directly toward Yangtze River Delta. Shanghai Maritime Safety Administration has mandated full suspension of deepwater container terminals at Yangshan and Waigaoqiao for the next 48 to 72 hours. Berth congestion expected to exceed 80% with inbound vessel queues backing up into Zhoushan anchorage. Container dwell delays estimated at 5.5 days.`,
  },
  {
    label: 'Dockworkers Strike — Rotterdam',
    text: `ROTTERDAM PORT AUTHORITY ADVISORY: Trans-Atlantic trade disruption alert. Dockworkers union initiated a 4-day unscheduled walkout affecting automated crane terminals at Maasvlakte II. Inbound rail capacity constrained by 45%, yard container density hitting 96% ceiling. Urgent cargo diversion to secondary Antwerp and Hamburg corridors advised.`,
  },
  {
    label: 'Red Sea Diversion — Jebel Ali',
    text: `GEOPOLITICAL MARITIME NOTICE: Houthi drone activity south of Bab-el-Mandeb forces all major container alliances (MSC, Maersk, Hapag-Lloyd) to divert standard westbound loops around the Cape of Good Hope. Bunker fuel surcharges escalating by 40%. Added transit days: +9 to +12 days. Transshipment volumes stacking up at Jebel Ali Hub.`,
  },
  {
    label: 'Semiconductor Grid Maintenance — Hsinchu',
    text: `TAIPEI ECONOMIC ADVISORY: State power grid substation maintenance in Hsinchu Science Park scheduled for this weekend. Cleanroom wafer output for automotive microcontrollers throttled by 20%. Single-source wafer inventory at risk; customers advised to draw buffer stock immediately.`,
  },
]

interface EventIntelligenceProps {
  onApplyToSimulator: (params: SimulationParameters) => void
  onSelectNode: (nodeId: string) => void
}

export function EventIntelligence({
  onApplyToSimulator,
  onSelectNode,
}: EventIntelligenceProps) {
  const [inputText, setInputText] = useState(SAMPLE_BULLETINS[0].text)
  const [loading, setLoading] = useState(false)
  const [extractedEvent, setExtractedEvent] = useState<ExtractedEvent | null>(null)
  const [applied, setApplied] = useState(false)

  const handleExtract = async () => {
    if (!inputText.trim()) return
    setLoading(true)
    setApplied(false)
    try {
      // Simulate real-time neural inference latency
      await new Promise((r) => setTimeout(r, 650))
      const res = await extractEventFromText(inputText)
      setExtractedEvent(res.data)
    } catch (e) {
      console.error('Failed to extract event', e)
    } finally {
      setLoading(false)
    }
  }

  const handlePushToSimulation = () => {
    if (!extractedEvent) return
    onApplyToSimulator(extractedEvent.suggestedSimParams)
    setApplied(true)
    setTimeout(() => setApplied(false), 3000)
  }

  // Pre-load default extraction on mount
  useEffect(() => {
    extractEventFromText(SAMPLE_BULLETINS[0].text).then((res) => {
      setExtractedEvent(res.data)
    })
  }, [])

  // Format chart data for Explainability
  const explainabilityData = extractedEvent?.riskAttributions.map((item) => ({
    factor: item.factor,
    delta: item.deltaPts,
    direction: item.direction,
    comment: item.comment,
  })) || []

  return (
    <Panel
      id="event-intelligence"
      title="AI Event Intelligence"
      description="Neural NLP engine parsing unstructured advisories into structured simulation parameters"
      actions={
        <div className="flex items-center gap-2">
          {extractedEvent?.isLiveGemini ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
              <Sparkles className="size-3 text-primary animate-pulse" /> Gemini {extractedEvent.modelVersion || '3.8 Flash'} Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Cpu className="size-3" /> Deterministic NLP Fallback
            </span>
          )}
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-400">
            API READY
          </span>
        </div>
      }
      bodyClassName="flex flex-col gap-5 p-4 md:p-5"
    >
      {/* Sample Bulletin Buttons */}
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
          <FileText className="size-3" /> Select Realistic Maritime / Logistics Bulletin
        </label>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_BULLETINS.map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={() => {
                setInputText(b.text)
                setApplied(false)
              }}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                inputText === b.text
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border bg-card/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Textarea & Action Bar */}
      <div className="flex flex-col gap-2">
        <textarea
          rows={4}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste unstructured incident report, weather alert, or carrier notice..."
          className="w-full rounded-xl border border-border bg-background/70 p-3 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-primary"
        />

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="size-3 text-primary" />
            Runs neural extraction via Gemini REST API with local safety fallback.
          </span>
          <button
            type="button"
            onClick={handleExtract}
            disabled={loading || !inputText.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Analyzing Text...
              </>
            ) : (
              <>
                <BrainCircuit className="size-3.5" />
                Extract Entities & Impact
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results View */}
      {extractedEvent ? (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          {/* Extracted Header Card */}
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-destructive/15 text-destructive border border-destructive/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                    {extractedEvent.severity}
                  </span>
                  <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                    {extractedEvent.incidentCategory}
                  </span>
                  {extractedEvent.impactedModes?.map((mode) => (
                    <span
                      key={mode}
                      className="rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    >
                      Mode: {mode}
                    </span>
                  ))}
                  {extractedEvent.isLiveGemini ? (
                    <span className="rounded-full bg-primary/20 text-primary border border-primary/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                      <Sparkles className="size-3 text-primary animate-pulse" /> Gemini 3.8 Flash Online
                    </span>
                  ) : null}
                  <span className="text-[11px] font-mono text-success">
                    Confidence: {extractedEvent.confidenceScore}%
                  </span>
                </div>

                <h3 className="mt-1.5 text-sm font-semibold text-foreground">
                  {extractedEvent.headline}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {extractedEvent.summary}
                </p>
              </div>

              {/* Event-to-Simulation Integration Button */}
              <div className="shrink-0 self-start sm:self-center">
                <button
                  type="button"
                  onClick={handlePushToSimulation}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all shadow-md',
                    applied
                      ? 'border-success bg-success text-success-foreground'
                      : 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 ring-1 ring-amber-400/40'
                  )}
                >
                  {applied ? (
                    <>
                      <CheckCircle2 className="size-4" />
                      Applied to Simulator!
                    </>
                  ) : (
                    <>
                      <Sliders className="size-4 text-amber-400" />
                      Push to What-If Simulator
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Extracted Entity Badges */}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5 border-t border-border/60 pt-3">
              {extractedEvent.keyEntities.map((ent) => (
                <div key={ent.label} className="rounded-lg bg-background/60 p-2">
                  <dt className="text-[10px] text-muted-foreground">{ent.label}</dt>
                  <dd className="mt-0.5 font-semibold text-xs text-foreground truncate">
                    {ent.value}
                  </dd>
                </div>
              ))}
            </div>

            {/* Parameter mapping preview */}
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-secondary/30 px-3 py-2 text-xs border border-border/50">
              <span className="font-semibold text-muted-foreground">Mapped Simulation Sliders:</span>
              <span className="font-mono text-cyan-400">
                Congestion: +{extractedEvent.suggestedSimParams.congestionFactor}%
              </span>
              <span className="font-mono text-rose-400">
                Weather: {extractedEvent.suggestedSimParams.weatherSeverity}/100
              </span>
              <span className="font-mono text-amber-400">
                Fuel: +{extractedEvent.suggestedSimParams.fuelPriceDelta}%
              </span>
              <span className="font-mono text-indigo-400">
                Capacity: {extractedEvent.suggestedSimParams.capacityConstraint > 0 ? '+' : ''}{extractedEvent.suggestedSimParams.capacityConstraint}%
              </span>
            </div>
          </div>

          {/* Risk-Factor Explainability Chart (SHAP-style Feature Attribution) */}
          <div className="rounded-xl border border-border bg-card/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Risk-Factor Explainability Attribution
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Feature contributions to composite node disruption risk score
                </p>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                SHAP-style Model Attribution
              </span>
            </div>

            <div className="h-56 w-full" role="img" aria-label="Risk-Factor Explainability Chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={explainabilityData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 140, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis
                    type="number"
                    domain={[-30, 45]}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                    tickFormatter={(v) => `${v > 0 ? '+' : ''}${v} pts`}
                  />
                  <YAxis
                    dataKey="factor"
                    type="category"
                    tick={{ fill: 'var(--foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReferenceLine x={0} stroke="var(--border)" />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    contentStyle={{
                      background: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(val, name, item) => [
                      `${Number(val) > 0 ? '+' : ''}${val} pts`,
                      `Impact (${item.payload.comment})`,
                    ]}
                  />
                  <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
                    {explainabilityData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.delta > 0 ? 'var(--destructive)' : 'var(--success)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed text-center">
              Positive bars indicate risk-increasing drivers; negative bars indicate structural mitigations.
            </p>
          </div>
        </div>
      ) : null}
    </Panel>
  )
}
