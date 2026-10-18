'use client'

import {
  Activity,
  AlertOctagon,
  Bell,
  BrainCircuit,
  ChartLine,
  Compass,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Map as MapIcon,
  Package,
  Route,
  Settings,
  Ship,
  Sliders,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  icon: LucideIcon
  href: string
  badgeKey?: 'alerts'
}

const PRIMARY_NAV: NavItem[] = [
  { label: 'Overview', icon: LayoutDashboard, href: '#overview' },
  { label: 'Network Map', icon: MapIcon, href: '#network-map' },
  { label: 'Logistics Modes', icon: Compass, href: '#multimodal-center' },
  { label: 'What-If Simulator', icon: Sliders, href: '#scenario-simulator' },
  { label: 'Anomaly Center', icon: AlertOctagon, href: '#anomaly-center' },
  { label: 'AI Intelligence', icon: BrainCircuit, href: '#event-intelligence' },
  { label: 'Risk Forecast', icon: ChartLine, href: '#risk-timeline' },
  { label: 'Live Alerts', icon: Bell, href: '#alerts', badgeKey: 'alerts' },
]

const SECONDARY_NAV: NavItem[] = [
  { label: 'At-Risk Nodes', icon: Package, href: '#at-risk-nodes' },
  { label: 'Settings', icon: Settings, href: '#overview' },
  { label: 'Support', icon: LifeBuoy, href: '#overview' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
  unreadAlerts: number
  onOpenRerouteModal?: () => void
  activeSection?: string
  onNavigateSection?: (sectionId: string) => void
}

export function Sidebar({
  open,
  onClose,
  unreadAlerts,
  activeSection = 'overview',
  onNavigateSection,
}: SidebarProps) {
  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        id="app-sidebar"
        aria-label="Primary"
        className={cn(
          'fixed inset-y-0 left-0 z-[1300] flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-border px-5">
          <a
            href="#overview"
            className="flex items-center gap-2.5"
            onClick={(e) => {
              e.preventDefault()
              onNavigateSection?.('overview')
              onClose()
            }}
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-inset ring-primary/30">
              <Activity aria-hidden="true" className="size-4.5" />
            </span>
            <span className="text-base font-semibold tracking-tight text-sidebar-accent-foreground">
              SupplyPulse
            </span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
          >
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Close navigation</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Monitor
          </p>
          <ul className="flex flex-col gap-0.5">
            {PRIMARY_NAV.map((item) => {
              const targetId = item.href.replace('#', '')
              const isActive = activeSection === targetId
              return (
                <SidebarLink
                  key={item.label}
                  item={item}
                  active={isActive}
                  badge={item.badgeKey === 'alerts' ? unreadAlerts : undefined}
                  onNavigate={() => {
                    onNavigateSection?.(targetId)
                    onClose()
                  }}
                />
              )
            })}
          </ul>
          <p className="px-2 pb-2 pt-6 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Workspace
          </p>
          <ul className="flex flex-col gap-0.5">
            {SECONDARY_NAV.map((item) => {
              const targetId = item.href.replace('#', '')
              const isActive = activeSection === targetId
              return (
                <SidebarLink
                  key={item.label}
                  item={item}
                  active={isActive}
                  onNavigate={() => {
                    onNavigateSection?.(targetId)
                    onClose()
                  }}
                />
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="rounded-lg bg-sidebar-accent/60 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-sidebar-accent-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              All data feeds online
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              AIS, weather and customs feeds synced across 18 network nodes.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-3 px-1">
            <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
              EM
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
                Elena Marsh
              </p>
              <p className="truncate text-xs text-muted-foreground">Global Logistics Lead</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

function SidebarLink({
  item,
  active,
  badge,
  onNavigate,
}: {
  item: NavItem
  active?: boolean
  badge?: number
  onNavigate: () => void
}) {
  const Icon = item.icon
  return (
    <li>
      <a
        href={item.href}
        onClick={(e) => {
          e.preventDefault()
          onNavigate()
        }}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors cursor-pointer',
          active
            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-xs'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
        )}
      >
        <Icon
          aria-hidden="true"
          className={cn('size-4', active ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-accent-foreground')}
        />
        <span className="flex-1">{item.label}</span>
        {badge ? (
          <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-destructive">
            {badge}
          </span>
        ) : null}
      </a>
    </li>
  )
}
