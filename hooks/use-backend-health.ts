'use client'

import useSWR from 'swr'
import { getBackendHealth, isBackendConfigured } from '@/lib/api'

export function useBackendHealth() {
  const { data, isLoading, mutate, isValidating } = useSWR('backend-health', getBackendHealth, {
    refreshInterval: isBackendConfigured() ? 60_000 : 0,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })
  return { health: data, isLoading, isValidating, recheck: () => mutate() }
}
