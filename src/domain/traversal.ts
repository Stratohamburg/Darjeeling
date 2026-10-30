import { allowsConnection, type AgentKind, type ConnectionKind } from './agents'
import { coordKey, supportsBuilding, type Coord } from './world'
import { horizontalSegments, roadAt, structureOccupancy, TRAVERSAL_COSTS, wildClimbs, type RoadNetwork, type TraversalCosts } from './roads'

export type TraversalEdge = {
  id: string
  kind: ConnectionKind
  from: Coord
  to: Coord
  cost: number
  references: string[]
  footprint: Coord[]
  allowedAgents: readonly AgentKind[]
}
export type TraversalGraph = { nodes: Readonly<Record<string, Coord>>; edges: TraversalEdge[]; version: number }
export type Route = { nodes: Coord[]; edges: TraversalEdge[]; cost: number; version: number }
export type RouteResult = { reachable: true; route: Route } | { reachable: false; reason: 'invalid-endpoint' | 'unreachable' }
const ALL: readonly AgentKind[] = ['person', 'livestock', 'vehicle']

export function buildGraph(network: RoadNetwork, costs: TraversalCosts = TRAVERSAL_COSTS): TraversalGraph {
  if (Object.values(costs).some(c => !Number.isFinite(c) || c <= 0) || costs.climb <= costs.wild) throw new Error('Invalid traversal costs')
  const nodes: Record<string, Coord> = {}
  const edges: TraversalEdge[] = []
  const reservations = structureOccupancy(network)
  const rampInteriors = new Set(network.structures.filter(s => s.kind === 'ramp').flatMap(s => {
    const lower = s.from.level < s.to.level ? s.from : s.to
    return s.footprint.filter(p => coordKey(p) !== coordKey(lower)).map(coordKey)
  }))
  for (let level = 0; level < network.world.levels; level++) {
    for (let column = 0; column < network.world.columns; column++) {
      const p = { column, level }
      if (roadAt(network, p) && !rampInteriors.has(coordKey(p))) nodes[coordKey(p)] = p
    }
  }
  for (const segment of horizontalSegments(network)) {
    if (!nodes[coordKey(segment.from)] || !nodes[coordKey(segment.to)]) continue
    edges.push({ id: `horizontal:${coordKey(segment.from)}`, kind: 'horizontal', ...segment,
      cost: (costs[segment.roads[0]] + costs[segment.roads[1]]) / 2,
      references: [segment.from, segment.to].map(p => `road:${coordKey(p)}`), footprint: [segment.from, segment.to], allowedAgents: ALL })
  }
  for (const climb of wildClimbs(network)) {
    if (!nodes[coordKey(climb.from)] || !nodes[coordKey(climb.to)] || reservations[coordKey(climb.from)]) continue
    edges.push({ id: `climb:${coordKey(climb.from)}`, kind: 'climb', ...climb, cost: costs.climb,
      references: [climb.from, climb.to].map(p => `road:${coordKey(p)}`), footprint: [climb.from, climb.to], allowedAgents: ['person', 'livestock'] })
  }
  for (const structure of network.structures) {
    if ([...structure.footprint, structure.from, structure.to].some(p => !roadAt(network, p) || !supportsBuilding(network.world, p))) continue
    if (!nodes[coordKey(structure.from)] || !nodes[coordKey(structure.to)]) continue
    edges.push({ id: `structure:${structure.id}`, kind: structure.kind, from: structure.from, to: structure.to,
      cost: costs[structure.kind], references: [`structure:${structure.id}`, ...structure.footprint.map(p => `road:${coordKey(p)}`)],
      footprint: structure.footprint, allowedAgents: structure.allowedAgents })
  }
  return { nodes, edges: edges.sort((a, b) => a.id.localeCompare(b.id)), version: network.version }
}

export function findRoute(network: RoadNetwork, from: Coord, to: Coord, agent: AgentKind, costs: TraversalCosts = TRAVERSAL_COSTS): RouteResult {
  const graph = buildGraph(network, costs)
  const start = coordKey(from), end = coordKey(to)
  if (!graph.nodes[start] || !graph.nodes[end]) return { reachable: false, reason: 'invalid-endpoint' }
  const distances = new Map<string, number>([[start, 0]])
  const previous = new Map<string, { node: string; edge: TraversalEdge }>()
  const open = new Set([start])
  while (open.size) {
    const current = [...open].sort((a, b) => distances.get(a)! - distances.get(b)! || a.localeCompare(b))[0]
    open.delete(current)
    if (current === end) {
      const nodes: Coord[] = [graph.nodes[end]], edges: TraversalEdge[] = []
      let cursor = end
      while (cursor !== start) {
        const step = previous.get(cursor)!
        edges.unshift(step.edge)
        nodes.unshift(graph.nodes[step.node])
        cursor = step.node
      }
      return { reachable: true, route: { nodes, edges, cost: distances.get(end)!, version: graph.version } }
    }
    for (const edge of graph.edges) {
      if (!allowsConnection(agent, edge.kind) || !edge.allowedAgents.includes(agent)) continue
      const a = coordKey(edge.from), b = coordKey(edge.to)
      const next = a === current ? b : b === current ? a : null
      if (!next) continue
      const distance = distances.get(current)! + edge.cost
      if (distance < (distances.get(next) ?? Infinity)) {
        distances.set(next, distance)
        previous.set(next, { node: current, edge })
        open.add(next)
      }
    }
  }
  return { reachable: false, reason: 'unreachable' }
}

export const routeStatus = (network: RoadNetwork, route: Route): 'valid' | 'needs-recalculation' => route.version === network.version ? 'valid' : 'needs-recalculation'
