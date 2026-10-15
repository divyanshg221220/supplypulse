'use client'

import { Bell, Menu, Search } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { NODES, REGION_LABELS, statusFromRisk, type RegionFilter } from '@/lib/supply-data'
import { cn } from '@/lib/utils'
import { NodeTypeIcon } from './node-type-icon'
import { StatusBadge } from './status-badge'

const REGIONS: RegionFilter[] = ['all', 'americas', 'emea', 'apac']

interface TopNavProps {
  region: RegionFilter
  onRegionChange: (region: RegionFilter) => void
  onOpenSidebar: () => void
  onSelectNode: (id: string) => void
  unreadAlerts: number
  onOpenAlerts: () => void
}

export function TopNav({
  region,
  onRegionChange,
  onOpenSidebar,
  onSelectNode,
  unreadAlerts,
  onOpenAlerts,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-[1000] border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-controls="app-sidebar"
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
        >
          <Menu aria-hidden="true" className="size-5" />
          <span className="sr-only">Open navigation</span>
        </button>

        <div className="hidden min-w-0 md:block">
          <p className="text-xs text-muted-foreground">Dashboards</p>
          <h1 className="text-sm font-semibold tracking-tight">Network Overview</h1>
        </div>

        <NodeSearch onSelectNode={onSelectNode} />

        <div className="ml-auto flex items-center gap-2">
          <div
            role="group"
            aria-label="Region filter"
            className="hidden items-center rounded-lg border bg-card p-0.5 sm:flex"
          >
            {REGIONS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={region === value}
                onClick={() => onRegionChange(value)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  region === value
                    ? 'bg-secondary text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {REGION_LABELS[value]}
              </button>
            ))}
          </div>
          <label className="sm:hidden">
            <span className="sr-only">Region</span>
            <select
              value={region}
              onChange={(e) => onRegionChange(e.target.value as RegionFilter)}
              className="h-9 rounded-lg border bg-card px-2 text-xs"
            >
              {REGIONS.map((value) => (
                <option key={value} value={value}>
                  {REGION_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <span className="hidden items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success xl:inline-flex">
            <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
            Live
          </span>

          <button
            type="button"
            onClick={onOpenAlerts}
            className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Bell aria-hidden="true" className="size-5" />
            {unreadAlerts > 0 ? (
              <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-mono text-[10px] font-semibold leading-4 text-white">
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </span>
            ) : null}
            <span className="sr-only">
              {unreadAlerts > 0 ? `${unreadAlerts} unread alerts` : 'Alerts'}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}

function NodeSearch({ onSelectNode }: { onSelectNode: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const listId = useId()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return NODES.filter((node) =>
      `${node.name} ${node.city} ${node.country}`.toLowerCase().includes(q),
    ).slice(0, 6)
  }, [query])

  const select = (id: string) => {
    onSelectNode(id)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative min-w-0 flex-1 md:ml-4 md:max-w-xs">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Search network nodes"
        aria-activedescendant={open && results[activeIndex] ? `${listId}-${results[activeIndex].id}` : undefined}
        placeholder="Search nodes, ports, cities…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActiveIndex(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex((i) => Math.min(i + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter' && results[activeIndex]) {
            e.preventDefault()
            select(results[activeIndex].id)
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        className="h-9 w-full rounded-lg border bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
      />
      {open && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border bg-popover p-1 shadow-xl"
        >
          {results.map((node, index) => (
            <li
              key={node.id}
              id={`${listId}-${node.id}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault()
                select(node.id)
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm',
                index === activeIndex ? 'bg-accent' : '',
              )}
            >
              <NodeTypeIcon type={node.type} className="text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{node.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {node.city}, {node.country}
                </span>
              </span>
              <StatusBadge status={statusFromRisk(node.riskScore)} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
