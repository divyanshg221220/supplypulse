import { STATUS_META } from '@/lib/format'
import type { NodeStatus } from '@/lib/supply-data'
import { cn } from '@/lib/utils'

export function StatusBadge({ status, className }: { status: NodeStatus; className?: string }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        meta.badgeClass,
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', meta.dotClass)} />
      {meta.label}
    </span>
  )
}
