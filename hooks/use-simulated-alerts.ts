'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BASE_TIME, INITIAL_ALERTS, SIMULATED_ALERT_POOL, type SupplyAlert } from '@/lib/supply-data'

const INTERVAL_MS = 8000
const MAX_ALERTS = 40

/**
 * Streams deterministic alerts from a fixed pool. The clock starts at BASE_TIME so
 * server and client output match, then advances with real elapsed time.
 */
export function useSimulatedAlerts() {
  const [alerts, setAlerts] = useState<SupplyAlert[]>(INITIAL_ALERTS)
  const [now, setNow] = useState(BASE_TIME)
  const [paused, setPaused] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set(['a-5', 'a-7']))
  const sequence = useRef(0)
  const mountedAt = useRef<number | null>(null)

  useEffect(() => {
    if (mountedAt.current === null) mountedAt.current = Date.now()
    const clock = setInterval(() => {
      setNow(BASE_TIME + (Date.now() - (mountedAt.current ?? Date.now())))
    }, 15_000)
    return () => clearInterval(clock)
  }, [])

  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => {
      const index = sequence.current
      sequence.current += 1
      const template = SIMULATED_ALERT_POOL[index % SIMULATED_ALERT_POOL.length]
      const createdAt = BASE_TIME + (Date.now() - (mountedAt.current ?? Date.now()))
      setNow(createdAt)
      setAlerts((prev) =>
        [{ ...template, id: `sim-${index}`, createdAt }, ...prev].slice(0, MAX_ALERTS),
      )
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [paused])

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    setReadIds(new Set(alerts.map((a) => a.id)))
  }, [alerts])

  return {
    alerts,
    now,
    paused,
    togglePaused: () => setPaused((p) => !p),
    readIds,
    markRead,
    markAllRead,
  }
}
