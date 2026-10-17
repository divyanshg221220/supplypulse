import { FlaskConical, Database, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'

type BadgeKind = 'demo' | 'simulated' | 'live'

const META: Record<BadgeKind, { label: string; className: string; icon: typeof Database }> = {
  demo: {
    label: 'DEMO DATA',
    className: 'bg-chart-2/10 text-chart-2 ring-chart-2/30',
    icon: Database,
  },
  simulated: {
    label: 'SIMULATED',
    className: 'bg-warning/10 text-warning ring-warning/30',
    icon: FlaskConical,
  },
  live: {
    label: 'LIVE',
    className: 'bg-success/10 text-success ring-success/30',
    icon: Radio,
  },
}

export function DataBadge({ kind, label, className }: { kind: BadgeKind; label?: string; className?: string }) {
  const meta = META[kind]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide ring-1 ring-inset',
        meta.className,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3" />
      {label ?? meta.label}
    </span>
  )
}
