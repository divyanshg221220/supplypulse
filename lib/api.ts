import { extractEventLocally, type ExtractedEvent } from './event-extractor'
import { hashString } from './random'
import type { RerouteOption } from './reroute'
import { BASE_TIME } from './supply-data'

/**
 * All backend calls live here. When NEXT_PUBLIC_API_BASE_URL is unset or the backend
 * is unreachable, every call resolves with deterministic local DEMO DATA instead of throwing.
 */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '')

export type DataSource = 'live' | 'demo'

export interface ApiResult<T> {
  data: T
  source: DataSource
  /** Present when the backend was configured but the call failed and demo data was used. */
  fallbackReason?: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const DEFAULT_TIMEOUT_MS = 6000

export function isBackendConfigured() {
  return API_BASE_URL.length > 0
}

async function request<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  if (!isBackendConfigured()) throw new ApiError('NEXT_PUBLIC_API_BASE_URL is not set')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), init?.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...init?.headers },
    })
    if (!response.ok) throw new ApiError(`Request failed with ${response.status}`, response.status)
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') throw new ApiError('Request timed out')
    throw new ApiError(error instanceof Error ? error.message : 'Network error')
  } finally {
    clearTimeout(timer)
  }
}

async function withFallback<T>(live: () => Promise<T>, demo: () => T | Promise<T>): Promise<ApiResult<T>> {
  if (!isBackendConfigured()) return { data: await demo(), source: 'demo' }
  try {
    return { data: await live(), source: 'live' }
  } catch (error) {
    return {
      data: await demo(),
      source: 'demo',
      fallbackReason: error instanceof Error ? error.message : 'Backend unavailable',
    }
  }
}

export interface BackendHealth {
  status: 'online' | 'offline' | 'not-configured'
  baseUrl: string | null
  latencyMs: number | null
  message: string
}

export async function getBackendHealth(): Promise<BackendHealth> {
  if (!isBackendConfigured()) {
    return { status: 'not-configured', baseUrl: null, latencyMs: null, message: 'No backend configured — showing DEMO DATA' }
  }
  const started = performance.now()
  try {
    await request<unknown>('/health', { timeoutMs: 4000 })
    return {
      status: 'online',
      baseUrl: API_BASE_URL,
      latencyMs: Math.round(performance.now() - started),
      message: 'Backend connected',
    }
  } catch (error) {
    return {
      status: 'offline',
      baseUrl: API_BASE_URL,
      latencyMs: null,
      message: `Backend unavailable (${error instanceof Error ? error.message : 'unknown error'}) — showing DEMO DATA`,
    }
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function extractEvent(text: string): Promise<ApiResult<ExtractedEvent>> {
  return withFallback(
    async () => {
      const result = await request<ExtractedEvent>('/events/extract', {
        method: 'POST',
        body: JSON.stringify({ text }),
        timeoutMs: 12_000,
      })
      return { ...result, extractor: 'backend' as const }
    },
    async () => {
      await delay(450)
      return extractEventLocally(text)
    },
  )
}

export interface RerouteConfirmation {
  confirmationId: string
  confirmedAt: number
}

export async function confirmReroute(routeId: string, option: RerouteOption): Promise<ApiResult<RerouteConfirmation>> {
  return withFallback(
    () =>
      request<RerouteConfirmation>('/reroutes', {
        method: 'POST',
        body: JSON.stringify({ routeId, optionId: option.id, strategy: option.strategy }),
      }),
    async () => {
      await delay(600)
      return {
        confirmationId: `DEMO-${hashString(`${routeId}-${option.id}`).toString(36).toUpperCase().slice(0, 6)}`,
        confirmedAt: BASE_TIME,
      }
    },
  )
}
