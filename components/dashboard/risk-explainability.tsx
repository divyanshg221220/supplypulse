'use client'

import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { FACTOR_LABELS, SLIDERS, type SimulatedNode } from '@/lib/simulation'
import { DataBadge } from './data-badge'
import { Panel } from './panel'

interface Row {
  key: string
  label: string
  value: number
}

export function RiskExplainability({
  nodes,
  selectedNode,
  simulated,
  onClearSelection,
}: {
  nodes: SimulatedNode[]
  selectedNode: SimulatedNode | null
  simulated: boolean
  onClearSelection: () => void
}) {
  const { rows, base, total, title } = useMemo(() => {
    const target = selectedNode ? [selectedNode] : nodes
    const n = Math.max(target.length, 1)
    const avg = (fn: (node: SimulatedNode) => number) => target.reduce((s, node) => s + fn(node), 0) / n
    const factorRows: Row[] = SLIDERS.map((s) => ({
      key: s.key,
      label: FACTOR_LABELS[s.key],
      value: Math.round(avg((node) => node.contributions[s.key]) * 10) / 10,
    }))
    factorRows.push({
      key: 'mitigation',
      label: 'Reroute mitigation',
      value: Math.round(avg((node) => node.contributions.mitigation) * 10) / 10,
    })
    return {
      rows: factorRows,
      base: Math.round(avg((node) => node.baseRiskScore) * 10) / 10,
      total: Math.round(avg((node) => node.riskScore) * 10) / 10,
      title: selectedNode ? selectedNode.name : `Network average (${target.length} nodes)`,
    }
  }, [nodes, selectedNode])

  const maxAbs = Math.max(10, ...rows.map((r) => Math.abs(r.value)))
  const domain = [-Math.ceil(maxAbs / 5) * 5, Math.ceil(maxAbs / 5) * 5]

  return (
    <Panel
      id="explainability"
      title="Risk-factor explainability"
      description="How each scenario factor shifts the risk score from baseline."
      actions={
        <>
          <DataBadge kind="simulated" />
          {selectedNode ? (
            <button
              type="button"
              onClick={onClearSelection}
              className="rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Show network
            </button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-3 p-4 md:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-medium">{title}</p>
          <dl className="flex gap-4 font-mono text-xs tabular-nums">
            <div>
              <dt className="text-[10px] font-sans text-muted-foreground">Baseline</dt>
              <dd className="font-semibold">{base}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-sans text-muted-foreground">Simulated</dt>
              <dd className={total > base ? 'font-semibold text-destructive' : total < base ? 'font-semibold text-success' : 'font-semibold'}>
                {total}
              </dd>
            </div>
          </dl>
        </div>
        {!simulated ? (
          <p className="rounded-md bg-secondary px-2.5 py-1.5 text-[11px] text-muted-foreground">
            No scenario active — all contributions are zero. Adjust the simulator to see factor impact.
          </p>
        ) : null}
        <div className="h-56" role="img" aria-label={`Risk contribution by factor for ${title}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                type="number"
                domain={domain}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={120}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine x={0} stroke="var(--muted-foreground)" />
              <Tooltip
                cursor={{ fill: 'var(--secondary)', opacity: 0.5 }}
                contentStyle={{
                  background: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--popover-foreground)',
                }}
                formatter={(v) => [`${Number(v) > 0 ? '+' : ''}${v} risk pts`, 'Contribution']}
              />
              <Bar dataKey="value" radius={3} isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.key} fill={r.value < 0 ? 'var(--success)' : 'var(--warning)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Panel>
  )
}
