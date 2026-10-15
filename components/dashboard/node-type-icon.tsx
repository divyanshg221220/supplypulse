import { Anchor, Boxes, Factory, Package, Warehouse, type LucideIcon } from 'lucide-react'
import type { NodeType } from '@/lib/supply-data'
import { cn } from '@/lib/utils'

const ICONS: Record<NodeType, LucideIcon> = {
  supplier: Package,
  factory: Factory,
  port: Anchor,
  warehouse: Warehouse,
  distribution: Boxes,
}

export function NodeTypeIcon({ type, className }: { type: NodeType; className?: string }) {
  const Icon = ICONS[type]
  return <Icon aria-hidden="true" className={cn('size-4', className)} />
}
