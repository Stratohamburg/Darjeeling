import { coordKey, isWalkable, sameCoord, withTerrain, type Coord, type TerracedWorld, type TerrainCell } from './world'
import { evaluateFootprint, horizontalFootprint, type Occupancy } from './footprint'
import type { AgentKind } from './agents'

export type RoadType = 'wild' | 'stone' | 'concrete'
export type StructureKind = 'stairs' | 'ramp'
export type TraversalStructure = { id: string; kind: StructureKind; from: Coord; to: Coord; footprint: Coord[]; allowedAgents: readonly AgentKind[] }
export type RoadNetwork = {
  world: TerracedWorld
  roads: Readonly<Record<string, RoadType | null>>
  structures: readonly TraversalStructure[]
  version: number
}
export const TRAVERSAL_COSTS = { wild: 4, stone: 2, concrete: 1, climb: 16, stairs: 7, ramp: 5 }
export type TraversalCosts = typeof TRAVERSAL_COSTS
export const createNetwork = (world: TerracedWorld): RoadNetwork => ({ world, roads: {}, structures: [], version: 0 })

export function roadAt(network: RoadNetwork, p: Coord): RoadType | null {
  if (!isWalkable(network.world, p)) return null
  return network.roads[coordKey(p)] === undefined ? 'wild' : network.roads[coordKey(p)]
}

export function setRoad(network: RoadNetwork, p: Coord, type: RoadType | null): RoadNetwork {
  if (!isWalkable(network.world, p) || roadAt(network, p) === type) return network
  return { ...network, version: network.version + 1, roads: { ...network.roads, [coordKey(p)]: type } }
}

export function setNetworkTerrain(network: RoadNetwork, p: Coord, cell: TerrainCell): RoadNetwork {
  return { ...network, world: withTerrain(network.world, p, cell), version: network.version + 1 }
}

export function horizontalSegments(network: RoadNetwork): { from: Coord; to: Coord; roads: [RoadType, RoadType] }[] {
  const result: { from: Coord; to: Coord; roads: [RoadType, RoadType] }[] = []
  for (let level = 0; level < network.world.levels; level++) {
    for (let column = 0; column < network.world.columns - 1; column++) {
      const from = { column, level }, to = { column: column + 1, level }
      const a = roadAt(network, from), b = roadAt(network, to)
      if (a && b) result.push({ from, to, roads: [a, b] })
    }
  }
  return result
}

export function structureOccupancy(network: RoadNetwork): Occupancy {
  return Object.fromEntries(network.structures.flatMap(s => s.footprint.map(p => [coordKey(p), s.id])))
}

export function structureAtEndpoints(network: RoadNetwork, from: Coord, to: Coord): boolean {
  return network.structures.some(s => (sameCoord(s.from, from) && sameCoord(s.to, to)) || (sameCoord(s.from, to) && sameCoord(s.to, from)))
}

export function evaluateStructure(network: RoadNetwork, occupied: Occupancy, kind: StructureKind, from: Coord, to: Coord) {
  const lower = from.level < to.level ? from : to
  const upper = from.level < to.level ? to : from
  const width = Math.abs(to.column - from.column) + 1
  const footprint = horizontalFootprint({ column: Math.min(from.column, to.column), level: lower.level }, width)
  if (Math.abs(to.level - from.level) !== 1 || (kind === 'stairs' ? width !== 1 : width !== 2 && width !== 3)) {
    return { valid: false as const, reason: '结构只能跨相邻台阶；楼梯占 1 格，斜坡占 2 或 3 格', cells: footprint }
  }
  const placement = evaluateFootprint(network.world, { ...occupied, ...structureOccupancy(network) }, footprint, [...footprint, upper])
  if (!placement.valid) return { ...placement, reason: placement.reason }
  if ([...footprint, upper].some(p => !roadAt(network, p))) return { valid: false as const, reason: '结构端点和内部必须有可行走道路', cells: footprint }
  return { valid: true as const, cells: footprint }
}

export function addStructure(network: RoadNetwork, occupied: Occupancy, id: string, kind: StructureKind, from: Coord, to: Coord): { network: RoadNetwork; reason: string | null } {
  if (network.structures.some(s => s.id === id)) return { network, reason: '结构标识已存在' }
  const evaluation = evaluateStructure(network, occupied, kind, from, to)
  if (!evaluation.valid) return { network, reason: evaluation.reason }
  return { network: { ...network, version: network.version + 1, structures: [...network.structures, { id, kind, from, to, footprint: evaluation.cells, allowedAgents: kind === 'stairs' ? ['person', 'livestock'] : ['person', 'livestock', 'vehicle'] }] }, reason: null }
}

export function removeStructure(network: RoadNetwork, id: string): RoadNetwork {
  if (!network.structures.some(s => s.id === id)) return network
  return { ...network, version: network.version + 1, structures: network.structures.filter(s => s.id !== id) }
}

export function wildClimbs(network: RoadNetwork): { from: Coord; to: Coord }[] {
  const result: { from: Coord; to: Coord }[] = []
  const occupied = structureOccupancy(network)
  for (let level = 0; level < network.world.levels - 1; level++) {
    for (let column = 0; column < network.world.columns; column++) {
      const from = { column, level }, to = { column, level: level + 1 }
      if (roadAt(network, from) && roadAt(network, to) && !occupied[coordKey(from)] && !structureAtEndpoints(network, from, to)) result.push({ from, to })
    }
  }
  return result
}
