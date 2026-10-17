'use client'

import {
  AlertTriangle,
  CloudLightning,
  Coins,
  Factory,
  Flame,
  Info,
  RefreshCcw,
  RotateCcw,
  Sliders,
  Sparkles,
  TrendingUp,
  Waves,
} from 'lucide-react'
import {
  DEFAULT_SIMULATION_PARAMS,
  PRESET_SCENARIOS,
  isSimulationActive,
  type PresetScenario,
  type SimulationParameters,
  type SimulationResult,
} from '@/lib/simulation-engine'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Panel } from './panel'

interface ScenarioSimulatorProps {
  params: SimulationParameters
  onParamsChange: (newParams: SimulationParameters) => void
  onReset: () => void
  result: SimulationResult
  activePresetId?: string | null
  onSelectPreset?: (preset: PresetScenario) => void
}

export function ScenarioSimulator({
  params,
  onParamsChange,
  onReset,
  result,
  activePresetId,
  onSelectPreset,
}: ScenarioSimulatorProps) {
  const active = isSimulationActive(params)

  const handleSlider = (key: keyof SimulationParameters, value: number) => {
    onParamsChange({
      ...params,
      [key]: value,
    })
  }

  const applyPreset = (preset: PresetScenario) => {
    onParamsChange(preset.params)
    onSelectPreset?.(preset)
  }

  return (
    <Panel
      id="scenario-simulator"
      title="What-If Scenario Simulator"
      description="Adjust stress drivers to recalculate deterministic risk across network nodes & lanes"
      className="border-amber-500/20 shadow-lg"
      actions={
        <div className="flex items-center gap-2">
          {active ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400 animate-pulse">
              <span className="size-1.5 rounded-full bg-amber-400" />
              SIMULATION ACTIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Baseline (Neutral)
            </span>
          )}

          <button
            type="button"
            onClick={onReset}
            disabled={!active}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors',
              active
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                : 'border-border text-muted-foreground opacity-40 cursor-not-allowed'
            )}
          >
            <RotateCcw aria-hidden="true" className="size-3" />
            Reset to Baseline
          </button>
        </div>
      }
      bodyClassName="flex flex-col gap-4 p-4 md:p-5"
    >
      {/* Preset Scenarios Carousel / Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="size-3 text-amber-400" /> Working Preset Scenarios
          </label>
          <span className="text-[10px] text-muted-foreground">Click to instant-apply stress vectors</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {PRESET_SCENARIOS.map((preset) => {
            const isSelected = activePresetId === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={cn(
                  'flex flex-col items-start rounded-lg border p-2 text-left transition-all',
                  isSelected
                    ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400 text-foreground'
                    : 'border-border bg-card/60 hover:bg-accent/60 hover:border-border/90 text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="flex w-full items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-foreground truncate">{preset.shortLabel}</span>
                  <span className="rounded bg-secondary px-1 py-0.2 text-[9px] uppercase font-mono">
                    {preset.primaryDriver}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[10px] leading-tight opacity-80">
                  {preset.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* 5 Functioning Sliders Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 rounded-xl border border-border/80 bg-background/50 p-4">
        {/* 1. Fuel Price Surge Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Coins className="size-3.5 text-amber-400" />
              Fuel Price Surge
            </span>
            <span className={cn('font-mono text-xs font-semibold tabular-nums', params.fuelPriceDelta > 0 ? 'text-amber-400' : params.fuelPriceDelta < 0 ? 'text-success' : 'text-muted-foreground')}>
              {params.fuelPriceDelta > 0 ? '+' : ''}
              {params.fuelPriceDelta}%
            </span>
          </div>
          <input
            type="range"
            min={-20}
            max={100}
            step={1}
            value={params.fuelPriceDelta}
            onChange={(e) => handleSlider('fuelPriceDelta', Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-amber-400"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>-20%</span>
            <span>0%</span>
            <span>+100%</span>
          </div>
        </div>

        {/* 2. Port & Corridor Congestion Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Waves className="size-3.5 text-cyan-400" />
              Congestion Factor
            </span>
            <span className={cn('font-mono text-xs font-semibold tabular-nums', params.congestionFactor > 40 ? 'text-destructive' : params.congestionFactor > 0 ? 'text-warning' : 'text-muted-foreground')}>
              +{params.congestionFactor}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={params.congestionFactor}
            onChange={(e) => handleSlider('congestionFactor', Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>0%</span>
            <span>+50%</span>
            <span>+100%</span>
          </div>
        </div>

        {/* 3. Demand Volatility / Shock Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <TrendingUp className="size-3.5 text-indigo-400" />
              Demand Shock
            </span>
            <span className={cn('font-mono text-xs font-semibold tabular-nums', params.demandShock > 0 ? 'text-indigo-400' : params.demandShock < 0 ? 'text-emerald-400' : 'text-muted-foreground')}>
              {params.demandShock > 0 ? '+' : ''}
              {params.demandShock}%
            </span>
          </div>
          <input
            type="range"
            min={-50}
            max={100}
            step={1}
            value={params.demandShock}
            onChange={(e) => handleSlider('demandShock', Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-indigo-400"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>-50%</span>
            <span>0%</span>
            <span>+100%</span>
          </div>
        </div>

        {/* 4. Weather Severity Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <CloudLightning className="size-3.5 text-rose-400" />
              Weather Severity
            </span>
            <span className={cn('font-mono text-xs font-semibold tabular-nums', params.weatherSeverity >= 70 ? 'text-destructive font-bold' : params.weatherSeverity >= 40 ? 'text-warning' : 'text-muted-foreground')}>
              {params.weatherSeverity}/100
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={params.weatherSeverity}
            onChange={(e) => handleSlider('weatherSeverity', Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-rose-400"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>Calm</span>
            <span>Moderate</span>
            <span>Cat 5 Storm</span>
          </div>
        </div>

        {/* 5. Capacity Constraint Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Factory className="size-3.5 text-amber-500" />
              Capacity Constraint
            </span>
            <span className={cn('font-mono text-xs font-semibold tabular-nums', params.capacityConstraint > 0 ? 'text-destructive' : params.capacityConstraint < 0 ? 'text-success' : 'text-muted-foreground')}>
              {params.capacityConstraint > 0 ? '+' : ''}
              {params.capacityConstraint}%
            </span>
          </div>
          <input
            type="range"
            min={-40}
            max={50}
            step={1}
            value={params.capacityConstraint}
            onChange={(e) => handleSlider('capacityConstraint', Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>-40% Surfeit</span>
            <span>0%</span>
            <span>+50% Deficit</span>
          </div>
        </div>
      </div>

      {/* Recalculated Deterministic Impact Summary Strip */}
      <div className={cn(
        'rounded-xl border p-4 transition-all',
        active ? 'border-amber-500/30 bg-amber-500/[0.04]' : 'border-border bg-card/40'
      )}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              'rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider',
              active ? 'bg-amber-400 text-black' : 'bg-secondary text-muted-foreground'
            )}>
              {active ? 'Simulated Model Output' : 'Live Network Baseline'}
            </span>
            <span className="text-xs text-muted-foreground">
              {active
                ? 'Deterministic risk scores dynamically recalculated for all 18 nodes & connected lanes.'
                : 'Move any slider above or click a preset to simulate disruptions.'}
            </span>
          </div>

          {active ? (
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-amber-400">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>Variance: +${formatNumber(result.summary.estimatedCostVarianceUsd)} USD</span>
            </div>
          ) : null}
        </div>

        {/* 4 Key Delta Cards */}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border/60 bg-background/60 p-2.5">
            <p className="text-[11px] text-muted-foreground">Network Risk Index</p>
            <p className="mt-0.5 font-mono text-base font-semibold">
              {result.summary.avgRiskScore}/100
              {active ? (
                <span className={cn('ml-1 text-xs', result.summary.riskDelta > 0 ? 'text-destructive' : 'text-success')}>
                  ({result.summary.riskDelta > 0 ? '+' : ''}{result.summary.riskDelta})
                </span>
              ) : null}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/60 p-2.5">
            <p className="text-[11px] text-muted-foreground">On-Time Delivery</p>
            <p className="mt-0.5 font-mono text-base font-semibold">
              {result.summary.onTimeRate}%
              {active ? (
                <span className={cn('ml-1 text-xs', result.summary.onTimeDelta < 0 ? 'text-destructive' : 'text-success')}>
                  ({result.summary.onTimeDelta > 0 ? '+' : ''}{result.summary.onTimeDelta}pp)
                </span>
              ) : null}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/60 p-2.5">
            <p className="text-[11px] text-muted-foreground">Nodes at Risk</p>
            <p className="mt-0.5 font-mono text-base font-semibold">
              {result.summary.nodesAtRisk}
              <span className="text-xs font-normal text-muted-foreground">/{result.nodes.length}</span>
              {active ? (
                <span className={cn('ml-1 text-xs', result.summary.nodesAtRiskDelta > 0 ? 'text-destructive' : 'text-success')}>
                  ({result.summary.nodesAtRiskDelta > 0 ? '+' : ''}{result.summary.nodesAtRiskDelta})
                </span>
              ) : null}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/60 p-2.5">
            <p className="text-[11px] text-muted-foreground">Avg Buffer Days</p>
            <p className="mt-0.5 font-mono text-base font-semibold">
              {result.summary.avgBufferDays}d
              {active ? (
                <span className={cn('ml-1 text-xs', result.summary.bufferDaysDelta < 0 ? 'text-destructive' : 'text-success')}>
                  ({result.summary.bufferDaysDelta > 0 ? '+' : ''}{result.summary.bufferDaysDelta}d)
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    </Panel>
  )
}
