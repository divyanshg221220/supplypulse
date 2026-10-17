'use client'

import 'leaflet/dist/leaflet.css'
import L, { type LatLngTuple } from 'leaflet'
import { Fragment, useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { STATUS_META, formatCompact } from '@/lib/format'
import type { ConfirmedReroute } from '@/lib/reroute'
import type { SimulatedNode } from '@/lib/simulation'
import {
  NODE_BY_ID,
  NODE_TYPE_LABELS,
  ROUTES,
  statusFromRisk,
  type NodeStatus,
  type RegionFilter,
  type SupplyNode,
  type SupplyRoute,
} from '@/lib/supply-data'

export interface LogisticsMapProps {
  nodes: SimulatedNode[]
  region: RegionFilter
  selectedNodeId: string | null
  onSelectNode: (id: string) => void
  showRoutes: boolean
  statusFilter: Record<NodeStatus, boolean>
  nodesById: Record<string, SimulatedNode>
  reroutes: Record<string, ConfirmedReroute>
}

const REROUTE_COLOR = '#5eead4'

const MODE_DASH: Record<SupplyRoute['mode'], string | undefined> = {
  sea: '6 6',
  air: '2 6',
  rail: '10 4',
  road: undefined,
}

/** Bezier arc between two nodes, split at the antimeridian so trans-Pacific lanes render cleanly. */
function buildArcSegments(from: SupplyNode, to: SupplyNode): LatLngTuple[][] {
  let toLng = to.lng
  const diff = toLng - from.lng
  if (diff > 180) toLng -= 360
  else if (diff < -180) toLng += 360

  const start: LatLngTuple = [from.lat, from.lng]
  const end: LatLngTuple = [to.lat, toLng]
  const midLat = (start[0] + end[0]) / 2
  const midLng = (start[1] + end[1]) / 2
  const dx = end[1] - start[1]
  const dy = end[0] - start[0]
  const curvature = 0.18
  const control: LatLngTuple = [midLat + dx * curvature, midLng - dy * curvature]

  const steps = 40
  const points: LatLngTuple[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const lat = (1 - t) ** 2 * start[0] + 2 * (1 - t) * t * control[0] + t ** 2 * end[0]
    const lng = (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * control[1] + t ** 2 * end[1]
    points.push([lat, lng])
  }

  const segments: LatLngTuple[][] = [[]]
  for (let i = 0; i < points.length; i++) {
    const [lat, lng] = points[i]
    if (lng > 180 || lng < -180) {
      const wrapped = lng > 180 ? lng - 360 : lng + 360
      const current = segments[segments.length - 1]
      const prev = points[i - 1]
      if (prev && prev[1] <= 180 && prev[1] >= -180) {
        const edge = lng > 180 ? 180 : -180
        current.push([lat, edge])
        segments.push([[lat, -edge]])
      }
      segments[segments.length - 1].push([lat, wrapped])
    } else {
      segments[segments.length - 1].push([lat, lng])
    }
  }
  return segments.filter((segment) => segment.length > 1)
}

function MapController({
  nodes,
  region,
  selectedNodeId,
}: {
  nodes: SupplyNode[]
  region: RegionFilter
  selectedNodeId: string | null
}) {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])

  useEffect(() => {
    if (nodes.length === 0) return
    const bounds = L.latLngBounds(nodes.map((n) => [n.lat, n.lng] as LatLngTuple))
    map.flyToBounds(bounds, {
      padding: [40, 40],
      maxZoom: region === 'all' ? 2 : 4,
      duration: 0.8,
    })
    // Region drives the camera; node list identity changes with region.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, map])

  useEffect(() => {
    if (!selectedNodeId) return
    const node = NODE_BY_ID[selectedNodeId]
    if (!node) return
    map.flyTo([node.lat, node.lng], Math.max(map.getZoom(), 4), { duration: 0.8 })
  }, [selectedNodeId, map])

  return null
}

export default function LogisticsMap({
  nodes,
  region,
  selectedNodeId,
  onSelectNode,
  showRoutes,
  statusFilter,
  nodesById,
  reroutes,
}: LogisticsMapProps) {
  const regionNodeIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes])

  const routes = useMemo(
    () =>
      ROUTES.map((route) => {
        const from = nodesById[route.from]
        const to = nodesById[route.to]
        return {
          route,
          status: statusFromRisk(Math.max(from.riskScore, to.riskScore)),
          inRegion: regionNodeIds.has(route.from) || regionNodeIds.has(route.to),
          rerouted: Boolean(reroutes[route.id]),
          segments: buildArcSegments(from, to),
        }
      }),
    [regionNodeIds, nodesById, reroutes],
  )

  const reroutePaths = useMemo(
    () =>
      Object.values(reroutes).map((reroute) => {
        const ids = reroute.option.path
        const segments: LatLngTuple[][] = []
        for (let i = 0; i < ids.length - 1; i++) {
          segments.push(...buildArcSegments(NODE_BY_ID[ids[i]], NODE_BY_ID[ids[i + 1]]))
        }
        return { id: reroute.routeId, segments }
      }),
    [reroutes],
  )

  const allNodes = Object.values(nodesById)

  return (
    <MapContainer
      center={[25, 20]}
      zoom={2}
      minZoom={2}
      maxZoom={8}
      worldCopyJump={false}
      maxBounds={[
        [-70, -200],
        [82, 200],
      ]}
      scrollWheelZoom
      className="size-full"
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        noWrap
      />
      <MapController nodes={nodes} region={region} selectedNodeId={selectedNodeId} />

      {showRoutes
        ? routes.map(({ route, status, inRegion, rerouted, segments }) => {
            if (!statusFilter[status]) return null
            const color = STATUS_META[status].hex
            return segments.map((positions, index) => (
              <Polyline
                key={`${route.id}-${index}-${inRegion}-${status}-${rerouted}`}
                positions={positions}
                pathOptions={{
                  color,
                  weight: status === 'critical' ? 2.5 : 1.75,
                  opacity: rerouted ? 0.18 : inRegion ? 0.75 : 0.12,
                  dashArray: MODE_DASH[route.mode],
                  className: inRegion && MODE_DASH[route.mode] ? 'sp-route-flow' : undefined,
                  interactive: false,
                }}
              />
            ))
          })
        : null}

      {reroutePaths.map(({ id, segments }) =>
        segments.map((positions, index) => (
          <Polyline
            key={`reroute-${id}-${index}`}
            positions={positions}
            pathOptions={{
              color: REROUTE_COLOR,
              weight: 3,
              opacity: 0.95,
              dashArray: '8 6',
              className: 'sp-route-flow',
              interactive: false,
            }}
          />
        )),
      )}

      {allNodes.map((node) => {
        const status = statusFromRisk(node.riskScore)
        if (!statusFilter[status]) return null
        const color = STATUS_META[status].hex
        const inRegion = regionNodeIds.has(node.id)
        const isSelected = node.id === selectedNodeId
        const radius = 5 + Math.min(node.activeShipments / 30, 6)
        return (
          <Fragment key={`${node.id}-${inRegion}-${isSelected}-${status}`}>
            {status === 'critical' && inRegion ? (
              <CircleMarker
                center={[node.lat, node.lng]}
                radius={radius + 2}
                pathOptions={{
                  color,
                  fill: false,
                  weight: 2,
                  className: 'sp-node-pulse',
                  interactive: false,
                }}
              />
            ) : null}
            {node.riskScore !== node.baseRiskScore && inRegion ? (
              <CircleMarker
                center={[node.lat, node.lng]}
                radius={radius + 6}
                pathOptions={{
                  color: node.riskScore > node.baseRiskScore ? '#fbbf24' : '#5eead4',
                  fill: false,
                  weight: 1.5,
                  dashArray: '3 3',
                  opacity: 0.9,
                  interactive: false,
                }}
              />
            ) : null}
            <CircleMarker
              center={[node.lat, node.lng]}
              radius={isSelected ? radius + 3 : radius}
              pathOptions={{
                color: isSelected ? '#ffffff' : color,
                weight: isSelected ? 3 : 1.5,
                fillColor: color,
                fillOpacity: inRegion ? 0.85 : 0.2,
                opacity: inRegion ? 1 : 0.35,
              }}
              eventHandlers={{ click: () => onSelectNode(node.id) }}
            >
              <Tooltip className="sp-tooltip" direction="top" offset={[0, -radius]}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold">{node.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {NODE_TYPE_LABELS[node.type]} · {node.city}
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-[11px]">
                    <span style={{ color }} className="font-mono font-semibold">
                      Risk {node.riskScore}
                    </span>
                    {node.riskScore !== node.baseRiskScore ? (
                      <span className="font-mono text-[10px] text-warning">
                        SIM ({node.riskScore > node.baseRiskScore ? '+' : ''}
                        {node.riskScore - node.baseRiskScore} vs {node.baseRiskScore})
                      </span>
                    ) : null}
                    <span className="text-muted-foreground">
                      {formatCompact(node.throughput)} {node.throughputUnit}
                    </span>
                  </span>
                </div>
              </Tooltip>
            </CircleMarker>
          </Fragment>
        )
      })}
    </MapContainer>
  )
}
