'use client'

import { AlertTriangle, Brain, FlaskConical, Loader2, MapPin, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { extractEvent, type ApiResult } from '@/lib/api'
import { EVENT_TYPE_LABELS, SAMPLE_EVENTS, type ExtractedEvent } from '@/lib/event-extractor'
import { describeParams } from '@/lib/simulation'
import { cn } from '@/lib/utils'
import { DataBadge } from './data-badge'
import { Panel } from './panel'

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; result: ApiResult<ExtractedEvent> }

const SEVERITY_CLASS = {
  high: 'bg-destructive/10 text-destructive ring-destructive/25',
  medium: 'bg-warning/10 text-warning ring-warning/25',
  low: 'bg-success/10 text-success ring-success/25',
}

export function EventIntelligence({
  onSimulate,
  activeEventLabel,
}: {
  onSimulate: (event: ExtractedEvent) => void
  activeEventLabel: string | null
}) {
  const [text, setText] = useState(SAMPLE_EVENTS[0].text)
  const [state, setState] = useState<State>({ kind: 'idle' })

  const analyze = async (input = text) => {
    if (!input.trim()) {
      setState({ kind: 'error', message: 'Paste a news headline or event description first.' })
      return
    }
    setState({ kind: 'loading' })
    try {
      setState({ kind: 'done', result: await extractEvent(input) })
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : 'Extraction failed' })
    }
  }

  const event = state.kind === 'done' ? state.result.data : null
  const applied = event ? activeEventLabel === `Event: ${event.summary}` : false

  return (
    <Panel
      id="event-intelligence"
      title="AI Event Intelligence"
      description="Extract structured disruption signals from news text, then simulate impact."
      className="xl:h-[520px]"
      bodyClassName="flex min-h-0 flex-col"
      actions={
        state.kind === 'done' && state.result.source === 'live' ? (
          <DataBadge kind="live" />
        ) : (
          <DataBadge kind="demo" label="LOCAL DEMO EXTRACTOR" />
        )
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <form
          className="flex flex-col gap-2 border-b px-4 py-3 md:px-5"
          onSubmit={(e) => {
            e.preventDefault()
            analyze()
          }}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Samples:</span>
            {SAMPLE_EVENTS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  setText(s.text)
                  analyze(s.text)
                }}
                className="rounded-md border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {s.label}
              </button>
            ))}
          </div>
          <label htmlFor="event-text" className="sr-only">
            Event text
          </label>
          <textarea
            id="event-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Paste a news article, carrier advisory, or weather bulletin…"
            className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground tabular-nums">{text.length}/2000</span>
            <button
              type="submit"
              disabled={state.kind === 'loading'}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {state.kind === 'loading' ? (
                <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
              ) : (
                <Brain aria-hidden="true" className="size-3.5" />
              )}
              {state.kind === 'loading' ? 'Extracting…' : 'Extract event'}
            </button>
          </div>
        </form>

        <div className="px-4 py-3 md:px-5" aria-live="polite">
          {state.kind === 'idle' ? (
            <p className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
              <Sparkles aria-hidden="true" className="size-4 text-primary" />
              Run extraction to identify event type, severity, locations and suggested scenario parameters.
            </p>
          ) : state.kind === 'loading' ? (
            <div className="flex flex-col gap-2" aria-label="Loading extraction">
              {[70, 90, 55].map((w) => (
                <div key={w} className="h-3 animate-pulse rounded bg-secondary" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : state.kind === 'error' ? (
            <p className="flex items-center gap-2 text-xs text-destructive">
              <AlertTriangle aria-hidden="true" className="size-4" />
              {state.message}
            </p>
          ) : event ? (
            <div className="flex flex-col gap-3">
              {state.result.fallbackReason ? (
                <p className="rounded-md bg-warning/10 px-2.5 py-1.5 text-[11px] text-warning">
                  Backend unavailable ({state.result.fallbackReason}). Used local demo extractor.
                </p>
              ) : null}
              <p className="text-sm font-medium text-pretty">{event.summary}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset',
                    SEVERITY_CLASS[event.severity],
                  )}
                >
                  {event.severity} · {Math.round(event.severityScore * 100)}
                </span>
                {event.eventTypes.map((t) => (
                  <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium">
                    {EVENT_TYPE_LABELS[t]}
                  </span>
                ))}
                <span className="ml-auto text-[11px] text-muted-foreground">
                  Confidence <span className="font-mono tabular-nums text-foreground">{Math.round(event.confidence * 100)}%</span>
                </span>
              </div>

              <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-md border bg-background/40 p-2">
                  <dt className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <MapPin aria-hidden="true" className="size-3" />
                    Locations
                  </dt>
                  <dd className="mt-0.5">
                    {event.locations.length ? event.locations.map((l) => l.name).join(', ') : 'None matched'}
                  </dd>
                </div>
                <div className="rounded-md border bg-background/40 p-2">
                  <dt className="text-[10px] text-muted-foreground">Duration / magnitudes</dt>
                  <dd className="mt-0.5 font-mono tabular-nums">
                    {event.durationHours ? `${event.durationHours}h` : '—'}
                    {event.percentages.length ? ` · ${event.percentages.map((p) => `${p}%`).join(', ')}` : ''}
                  </dd>
                </div>
              </dl>

              {event.keywords.length ? (
                <p className="text-[11px] text-muted-foreground">
                  Signals: <span className="text-foreground">{event.keywords.slice(0, 8).join(', ')}</span>
                </p>
              ) : null}

              {event.primaryType ? (
                <div className="rounded-md border border-dashed p-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Suggested scenario
                  </p>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {describeParams(event.suggestedParams).map((p) => (
                      <li key={p.key} className="rounded bg-warning/10 px-1.5 py-0.5 font-mono text-[11px] text-warning">
                        {p.label}: {p.value}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => onSimulate(event)}
                    disabled={applied}
                    className="mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-60"
                  >
                    <FlaskConical aria-hidden="true" className="size-3.5" />
                    {applied ? 'Simulation running' : 'Simulate impact on network'}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </Panel>
  )
}
