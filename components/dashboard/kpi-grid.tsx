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

import { type SimulatedNode } from '@/lib/simulation-engine'

export function KpiGrid({
  nodes,
  region,
  isSimulated = false,
}: {
  nodes: (SupplyNode | SimulatedNode)[]
  region: RegionFilter
  isSimulated?: boolean
}) {
  const cards = useMemo<KpiCardProps[]>(() => {
    // If simulated, use simulated fields
    const riskIndex = average(
      nodes.map((n) => ('simulatedRiskScore' in n && isSimulated ? n.simulatedRiskScore : n.riskScore))
    )
    const totalShipments = nodes.reduce(
      (sum, n) => sum + ('simulatedShipments' in n && isSimulated ? n.simulatedShipments : n.activeShipments),
      0
    )
    const onTime =
      nodes.reduce(
        (sum, n) =>
          sum +
          ('simulatedOnTimeRate' in n && isSimulated ? n.simulatedOnTimeRate : n.onTimeRate) *
            ('simulatedShipments' in n && isSimulated ? n.simulatedShipments : n.activeShipments),
        0
      ) / Math.max(totalShipments, 1)

    const atRisk = nodes.filter((n) => {
      const risk = 'simulatedRiskScore' in n && isSimulated ? n.simulatedRiskScore : n.riskScore
      return statusFromRisk(risk) !== 'healthy'
    }).length

    const buffer = average(
      nodes.map((n) => ('simulatedBufferDays' in n && isSimulated ? n.simulatedBufferDays : n.bufferDays))
    )

    // Base values to calculate simulation shift
    const baseRiskIndex = average(nodes.map((n) => n.riskScore))
    const baseOnTime =
      nodes.reduce((sum, n) => sum + n.onTimeRate * n.activeShipments, 0) /
      Math.max(nodes.reduce((sum, n) => sum + n.activeShipments, 0), 1)
    const baseAtRisk = nodes.filter((n) => statusFromRisk(n.riskScore) !== 'healthy').length
    const baseBuffer = average(nodes.map((n) => n.bufferDays))

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
        delta: isSimulated ? riskIndex - baseRiskIndex : weekDelta(riskSeries),
        lowerIsBetter: true,
        icon: Gauge,
        sparkline: riskSeries,
        caption: isSimulated ? 'vs baseline' : 'vs 7d',
        isSimulated,
      },
      {
        label: 'On-Time Delivery',
        value: onTime.toFixed(1),
        unit: '%',
        delta: isSimulated ? onTime - baseOnTime : weekDelta(onTimeSeries),
        deltaSuffix: 'pp',
        icon: Clock,
        sparkline: onTimeSeries,
        caption: isSimulated ? 'vs baseline' : 'vs 7d',
        isSimulated,
      },
      {
        label: 'Active Shipments',
        value: formatNumber(totalShipments),
        delta: (weekDelta(shipmentSeries) / Math.max(totalShipments, 1)) * 100,
        deltaSuffix: '%',
        icon: Ship,
        sparkline: shipmentSeries,
        caption: 'vs 7d',
        isSimulated,
      },
      {
        label: 'Nodes at Risk',
        value: `${atRisk}`,
        unit: `/${nodes.length}`,
        delta: isSimulated ? atRisk - baseAtRisk : weekDelta(atRiskSeries),
        lowerIsBetter: true,
        icon: ShieldAlert,
        sparkline: atRiskSeries,
        caption: isSimulated ? 'vs baseline' : 'vs 7d',
        isSimulated,
      },
      {
        label: 'Avg Buffer Cover',
        value: buffer.toFixed(1),
        unit: 'days',
        delta: isSimulated ? buffer - baseBuffer : weekDelta(bufferSeries),
        icon: PackageCheck,
        sparkline: bufferSeries,
        caption: isSimulated ? 'vs baseline' : 'vs 7d',
        isSimulated,
      },
    ]
  }, [nodes, region, isSimulated])

  return (
    <section aria-label="Key performance indicators" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </section>
  )
}
