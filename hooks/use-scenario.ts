'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ExtractedEvent } from '@/lib/event-extractor'
import { mitigationsFromReroutes, type ConfirmedReroute } from '@/lib/reroute'
import {
  BASELINE_SCENARIO,
  PRESETS,
  clampParams,
  isBaselineScenario,
  simulateNetwork,
  type Scenario,
  type ScenarioFactor,
  type SimulatedNode,
} from '@/lib/simulation'

export function useScenario() {
  const [scenario, setScenario] = useState<Scenario>(BASELINE_SCENARIO)
  const [reroutes, setReroutes] = useState<Record<string, ConfirmedReroute>>({})

  const mitigations = useMemo(() => mitigationsFromReroutes(reroutes), [reroutes])
  const simulatedNodes = useMemo(() => simulateNetwork(scenario, mitigations), [scenario, mitigations])
  const baselineNodes = useMemo(() => simulateNetwork(BASELINE_SCENARIO), [])
  const nodesById = useMemo<Record<string, SimulatedNode>>(
    () => Object.fromEntries(simulatedNodes.map((n) => [n.id, n])),
    [simulatedNodes],
  )

  const setParam = useCallback((key: ScenarioFactor, value: number) => {
    setScenario((prev) => ({
      ...prev,
      params: clampParams({ ...prev.params, [key]: value }),
      source: 'manual',
      presetId: null,
      label: prev.source === 'event' ? prev.label : 'Custom scenario',
    }))
  }, [])

  const applyPreset = useCallback((presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    setScenario({
      params: clampParams(preset.params),
      focus: preset.focus,
      label: preset.label,
      source: 'preset',
      presetId: preset.id,
    })
  }, [])

  const applyEvent = useCallback((event: ExtractedEvent) => {
    setScenario({
      params: clampParams(event.suggestedParams),
      focus: event.focus,
      label: `Event: ${event.summary}`,
      source: 'event',
      presetId: null,
    })
  }, [])

  const clearFocus = useCallback(() => {
    setScenario((prev) => ({ ...prev, focus: null }))
  }, [])

  const reset = useCallback(() => setScenario(BASELINE_SCENARIO), [])

  const confirmReroute = useCallback((reroute: ConfirmedReroute) => {
    setReroutes((prev) => ({ ...prev, [reroute.routeId]: reroute }))
  }, [])

  const revertReroute = useCallback((routeId: string) => {
    setReroutes((prev) => {
      const next = { ...prev }
      delete next[routeId]
      return next
    })
  }, [])

  return {
    scenario,
    isBaseline: isBaselineScenario(scenario),
    simulatedNodes,
    baselineNodes,
    nodesById,
    reroutes,
    hasReroutes: Object.keys(reroutes).length > 0,
    setParam,
    applyPreset,
    applyEvent,
    clearFocus,
    reset,
    confirmReroute,
    revertReroute,
  }
}

export type ScenarioController = ReturnType<typeof useScenario>
