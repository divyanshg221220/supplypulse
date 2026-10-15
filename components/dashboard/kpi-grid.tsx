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
import { KpiCard, type KpiCardProps } from './kpi-card'

function average(values: number[]) {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
}

function weekDelta(series: { value: number }[]) {
  return series[series.length - 1].value - series[series.length - 8].value
}

export function KpiGrid({ nodes, region }: { nodes: SupplyNode[]; region: RegionFilter }) {
  const cards = useMemo<KpiCardProps[]>(() => {
    const riskIndex = average(nodes.map((n) => n.riskScore))
    const totalShipments = nodes.reduce((sum, n) => sum + n.activeShipments, 0)
    const onTime =
      nodes.reduce((sum, n) => sum + n.onTimeRate * n.activeShipments, 0) / Math.max(totalShipments, 1)
    const atRisk = nodes.filter((n) => statusFromRisk(n.riskScore) !== 'healthy').length
    const buffer = average(nodes.map((n) => n.bufferDays))

    const riskSeries = generateSparkline(`${region}-risk`, riskIndex, 2.2)
    const onTimeSeries = generateSparkline(`${region}-ontime`, onTime, 0.9)
    const shipmentSeries = generateSparkline(`${region}-ships`, totalShipments, totalShipments * 0.03)
    const atRiskSeries = generateSparkline(`${region}-atrisk`, atRisk, 0.6)
    const bufferSeries = generateSparkline(`${region}-buffer`, buffer, 0.5)

    return [
      {
        label: 'Network Risk Index',
        value: riskIndex.toFixed(1),
        unit: '/100',
        delta: weekDelta(riskSeries),
        lowerIsBetter: true,
        icon: Gauge,
        sparkline: riskSeries,
        caption: 'vs 7d',
      },
      {
        label: 'On-Time Delivery',
        value: onTime.toFixed(1),
        unit: '%',
        delta: weekDelta(onTimeSeries),
        deltaSuffix: 'pp',
        icon: Clock,
        sparkline: onTimeSeries,
        caption: 'vs 7d',
      },
      {
        label: 'Active Shipments',
        value: formatNumber(totalShipments),
        delta: (weekDelta(shipmentSeries) / Math.max(totalShipments, 1)) * 100,
        deltaSuffix: '%',
        icon: Ship,
        sparkline: shipmentSeries,
        caption: 'vs 7d',
      },
      {
        label: 'Nodes at Risk',
        value: `${atRisk}`,
        unit: `/${nodes.length}`,
        delta: weekDelta(atRiskSeries),
        lowerIsBetter: true,
        icon: ShieldAlert,
        sparkline: atRiskSeries,
        caption: 'vs 7d',
      },
      {
        label: 'Avg Buffer Cover',
        value: buffer.toFixed(1),
        unit: 'days',
        delta: weekDelta(bufferSeries),
        icon: PackageCheck,
        sparkline: bufferSeries,
        caption: 'vs 7d',
      },
    ]
  }, [nodes, region])

  return (
    <section aria-label="Key performance indicators" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </section>
  )
}
