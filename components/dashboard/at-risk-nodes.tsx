'use client'

import { ChevronRight } from 'lucide-react'
import { STATUS_META } from '@/lib/format'
import { statusFromRisk, type SupplyNode } from '@/lib/supply-data'
import { cn } from '@/lib/utils'
import { NodeTypeIcon } from './node-type-icon'
import { Panel } from './panel'

import { type SimulatedNode } from '@/lib/simulation-engine'

export function AtRiskNodes({
  nodes,
  selectedNodeId,
  onSelectNode,
  isSimulated = false,
}: {
  nodes: (SupplyNode | SimulatedNode)[]
  selectedNodeId: string | null
  onSelectNode: (id: string) => void
  isSimulated?: boolean
}) {
  const ranked = [...nodes]
    .map((node) => {
      const effectiveRisk =
        'simulatedRiskScore' in node && isSimulated ? node.simulatedRiskScore : node.riskScore
      return { node, effectiveRisk }
    })
    .sort((a, b) => b.effectiveRisk - a.effectiveRisk)
    .slice(0, 7)

  return (
    <Panel
      id="at-risk-nodes"
      title={isSimulated ? 'Highest-Risk Nodes (Simulated)' : 'Highest-Risk Nodes'}
      description={
        isSimulated
          ? 'Ranked by deterministically recalculated scenario risk scores'
          : 'Ranked by current composite risk score'
      }
    >
      <ul className="divide-y">
        {ranked.map(({ node, effectiveRisk }, index) => {
          const status = statusFromRisk(effectiveRisk)
          const meta = STATUS_META[status]
          return (
            <li key={node.id}>
              <button
                type="button"
                onClick={() => onSelectNode(node.id)}
                aria-current={selectedNodeId === node.id ? 'true' : undefined}
                className={cn(
                  'group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/50 md:px-5',
                  selectedNodeId === node.id && 'bg-accent/60',
                )}
              >
                <span className="w-4 font-mono text-[11px] text-muted-foreground">{index + 1}</span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                  <NodeTypeIcon type={node.type} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{node.name}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <span
                        className={cn('block h-full rounded-full', meta.dotClass)}
                        style={{ width: `${effectiveRisk}%` }}
                      />
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">{node.city}</span>
                  </span>
                </span>
                <span className={cn('w-8 text-right font-mono text-sm font-semibold tabular-nums', meta.textClass)}>
                  {effectiveRisk}
                </span>
                <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
