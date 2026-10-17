'use client'

import { Crosshair, RotateCcw, X } from 'lucide-react'
import { useId } from 'react'
import type { ScenarioController } from '@/hooks/use-scenario'
import { BASELINE_PARAMS, PRESETS, SLIDERS, type SliderConfig } from '@/lib/simulation'
import { cn } from '@/lib/utils'
import { DataBadge } from './data-badge'
import { Panel } from './panel'

export function ScenarioSimulator({ controller }: { controller: ScenarioController }) {
  const { scenario, isBaseline, setParam, applyPreset, reset, clearFocus, simulatedNodes } = controller

  const changed = simulatedNodes.filter((n) => n.riskScore !== n.baseRiskScore)
  const avgDelta = changed.length
    ? simulatedNodes.reduce((s, n) => s + (n.riskScore - n.baseRiskScore), 0) / simulatedNodes.length
    : 0

  return (
    <Panel
      id="simulator"
      title="What-If Scenario Simulator"
      description="Stress-test the network. Risk scores recalculate deterministically."
      className="xl:h-[520px]"
      bodyClassName="flex min-h-0 flex-col"
      actions={
        <>
          <DataBadge kind="simulated" />
          <button
            type="button"
            onClick={reset}
            disabled={isBaseline}
            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
          >
            <RotateCcw aria-hidden="true" className="size-3" />
            Reset
          </button>
        </>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <section aria-labelledby="presets-heading" className="border-b px-4 py-3 md:px-5">
          <h3 id="presets-heading" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Preset scenarios
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => {
              const active = scenario.presetId === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  title={preset.description}
                  onClick={() => applyPreset(preset.id)}
                  className={cn(
                    'rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                    active
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </section>

        <div className="flex flex-col gap-4 px-4 py-4 md:px-5">
          {SLIDERS.map((slider) => (
            <ScenarioSlider
              key={slider.key}
              config={slider}
              value={scenario.params[slider.key]}
              onChange={(value) => setParam(slider.key, value)}
            />
          ))}
        </div>
      </div>

      <footer className="border-t px-4 py-3 md:px-5" aria-live="polite">
        {isBaseline ? (
          <p className="text-xs text-muted-foreground">
            Baseline conditions. Move a slider or pick a preset to simulate a scenario.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs">
              <span className="font-medium text-warning">Simulated:</span>{' '}
              <span className="text-foreground">{scenario.label ?? 'Custom scenario'}</span>
            </p>
            {scenario.focus ? (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-[11px] text-muted-foreground">
                <Crosshair aria-hidden="true" className="size-3 text-primary" />
                Focused on {scenario.focus.label}
                <button
                  type="button"
                  onClick={clearFocus}
                  className="rounded p-0.5 hover:bg-accent hover:text-foreground"
                >
                  <X aria-hidden="true" className="size-3" />
                  <span className="sr-only">Apply scenario network-wide</span>
                </button>
              </span>
            ) : null}
            <dl className="grid grid-cols-2 gap-2">
              <div className="rounded-md border bg-background/40 px-2.5 py-1.5">
                <dt className="text-[10px] text-muted-foreground">Nodes affected</dt>
                <dd className="font-mono text-sm font-semibold tabular-nums">
                  {changed.length}
                  <span className="text-[11px] font-normal text-muted-foreground">/{simulatedNodes.length}</span>
                </dd>
              </div>
              <div className="rounded-md border bg-background/40 px-2.5 py-1.5">
                <dt className="text-[10px] text-muted-foreground">Avg risk change</dt>
                <dd
                  className={cn(
                    'font-mono text-sm font-semibold tabular-nums',
                    avgDelta > 0.05 ? 'text-destructive' : avgDelta < -0.05 ? 'text-success' : '',
                  )}
                >
                  {avgDelta > 0 ? '+' : ''}
                  {avgDelta.toFixed(1)}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </footer>
    </Panel>
  )
}

function ScenarioSlider({
  config,
  value,
  onChange,
}: {
  config: SliderConfig
  value: number
  onChange: (value: number) => void
}) {
  const id = useId()
  const baseline = BASELINE_PARAMS[config.key]
  const isChanged = value !== baseline
  const pct = ((value - config.min) / (config.max - config.min)) * 100
  const basePct = ((baseline - config.min) / (config.max - config.min)) * 100

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium">
          {config.label}
        </label>
        <output
          htmlFor={id}
          className={cn('font-mono text-xs font-semibold tabular-nums', isChanged ? 'text-warning' : 'text-muted-foreground')}
        >
          {config.format(value)}
        </output>
      </div>
      <div className="relative mt-1.5 flex h-5 items-center">
        <div className="pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-secondary" aria-hidden="true">
          <div
            className={cn('absolute h-full rounded-full', isChanged ? 'bg-warning/70' : 'bg-primary/40')}
            style={{ left: `${Math.min(pct, basePct)}%`, width: `${Math.abs(pct - basePct)}%` }}
          />
          <div className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-muted-foreground/60" style={{ left: `${basePct}%` }} />
        </div>
        <input
          id={id}
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={config.format(value)}
          aria-describedby={`${id}-desc`}
          className="sp-range relative w-full"
        />
      </div>
      <p id={`${id}-desc`} className="mt-1 text-[11px] text-muted-foreground">
        {config.description}
      </p>
    </div>
  )
}
