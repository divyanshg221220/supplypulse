'use client'

import { Clock, Gauge, PackageCheck, ShieldAlert, Ship } from 'lucide-react'
import { useMemo } from 'react'
import { formatNumber } from '@/lib/format'
import {
  generateSparkline,
  statusFromRisk,
  type RegionFilter,
  type SupplyNode,
} from '@/lib/supply-data'
import type { SimulatedNode } from '@/lib/simulation'
import { KpiCard, type KpiCardProps } from './kpi-card'

function average(values: number[]) {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
}

function weekDelta(series: { value: number }[]) {
  return series[series.length - 1].value - series[series.length - 8].value
}

function kpiValues(nodes: SupplyNode[]) {
  const riskIndex = average(nodes.map((n) => n.riskScore))
  const totalShipments = nodes.reduce((sum, n) => sum + n.activeShipments, 0)
  const onTime = nodes.reduce((sum, n) => sum + n.onTimeRate * n.activeShipments, 0) / Math.max(totalShipments, 1)
  const atRisk = nodes.filter((n) => statusFromRisk(n.riskScore) !== 'healthy').length
  const buffer = average(nodes.map((n) => n.bufferDays))
  return { riskIndex, totalShipments, onTime, atRisk, buffer }
}

export function KpiGrid({
  nodes,
  baselineNodes,
  region,
  simulated,
}: {
  nodes: SimulatedNode[]
  baselineNodes: SimulatedNode[]
  region: RegionFilter
  simulated: boolean
}) {
  const cards = useMemo<KpiCardProps[]>(() => {
    const base = kpiValues(baselineNodes)
    const { riskIndex, totalShipments, onTime, atRisk, buffer } = kpiValues(nodes)

    const withSim = (series: { index: number; value: number }[], value: number) =>
      simulated ? [...series.slice(1), { index: series.length, value }] : series
    const riskSeries = withSim(generateSparkline(`${region}-risk`, base.riskIndex, 2.2), riskIndex)
    const onTimeSeries = withSim(generateSparkline(`${region}-ontime`, base.onTime, 0.9), onTime)
    const shipmentSeries = withSim(
      generateSparkline(`${region}-ships`, base.totalShipments, base.totalShipments * 0.03),
      totalShipments,
    )
    const atRiskSeries = withSim(generateSparkline(`${region}-atrisk`, base.atRisk, 0.6), atRisk)
    const bufferSeries = withSim(generateSparkline(`${region}-buffer`, base.buffer, 0.5), buffer)
    const simCaption = 'vs baseline'
    const simDelta = (current: number, baseline: number) => current - baseline

    return [
      {
        label: 'Network Risk Index',
        value: riskIndex.toFixed(1),
        unit: '/100',
        delta: simulated ? simDelta(riskIndex, base.riskIndex) : weekDelta(riskSeries),
        lowerIsBetter: true,
        icon: Gauge,
        sparkline: riskSeries,
        caption: simulated ? simCaption : 'vs 7d',
        simulated: simulated && Math.abs(riskIndex - base.riskIndex) > 0.05,
        baselineValue: base.riskIndex.toFixed(1),
      },
      {
        label: 'On-Time Delivery',
        value: onTime.toFixed(1),
        unit: '%',
        delta: simulated ? simDelta(onTime, base.onTime) : weekDelta(onTimeSeries),
        deltaSuffix: 'pp',
        icon: Clock,
        sparkline: onTimeSeries,
        caption: simulated ? simCaption : 'vs 7d',
        simulated: simulated && Math.abs(onTime - base.onTime) > 0.05,
        baselineValue: base.onTime.toFixed(1),
      },
      {
        label: 'Active Shipments',
        value: formatNumber(totalShipments),
        delta: simulated
          ? ((totalShipments - base.totalShipments) / Math.max(base.totalShipments, 1)) * 100
          : (weekDelta(shipmentSeries) / Math.max(totalShipments, 1)) * 100,
        deltaSuffix: '%',
        icon: Ship,
        sparkline: shipmentSeries,
        caption: simulated ? simCaption : 'vs 7d',
        simulated: simulated && totalShipments !== base.totalShipments,
        baselineValue: formatNumber(base.totalShipments),
      },
      {
        label: 'Nodes at Risk',
        value: `${atRisk}`,
        unit: `/${nodes.length}`,
        delta: simulated ? simDelta(atRisk, base.atRisk) : weekDelta(atRiskSeries),
        lowerIsBetter: true,
        icon: ShieldAlert,
        sparkline: atRiskSeries,
        caption: simulated ? simCaption : 'vs 7d',
        simulated: simulated && atRisk !== base.atRisk,
        baselineValue: `${base.atRisk}`,
      },
      {
        label: 'Avg Buffer Cover',
        value: buffer.toFixed(1),
        unit: 'days',
        delta: simulated ? simDelta(buffer, base.buffer) : weekDelta(bufferSeries),
        icon: PackageCheck,
        sparkline: bufferSeries,
        caption: simulated ? simCaption : 'vs 7d',
        simulated: simulated && Math.abs(buffer - base.buffer) > 0.05,
        baselineValue: base.buffer.toFixed(1),
      },
    ]
  }, [nodes, baselineNodes, region, simulated])

  return (
    <section aria-label="Key performance indicators" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </section>
  )
}
