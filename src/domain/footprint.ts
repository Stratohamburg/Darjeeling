import { coordKey, insideWorld, supportsBuilding, terrainAt, type Coord, type TerracedWorld } from './world'
import { worldPoint } from './terraceLayout'

export type Occupancy = Readonly<Record<string, string>>
export type BuildingVisual = {
  height: number
  depthOrder: number
  occlusion: { left: number; right: number; above: number; below: number }
}
export type BuildingShape = { width: number; visual: BuildingVisual }
// Bridges/platforms must declare all three contracts; visual volume never supplies any of them.
export type CrossLevelShape = {
  kind: 'cross-level'
  occupiedOffsets: Coord[]
  supportOffsets: Coord[]
  traversal: { from: Coord; to: Coord; allowedAgents: ('person' | 'livestock' | 'vehicle')[] }[]
  visual: BuildingVisual
}

export function evaluateCrossLevel(world: TerracedWorld, occupied: Occupancy, shape: CrossLevelShape, anchor: Coord): WorldPlacement {
  if (!shape.occupiedOffsets.length || !shape.supportOffsets.length) throw new Error('Explicit occupancy and support required')
  const offset = (p: Coord): Coord => ({ column: anchor.column + p.column, level: anchor.level + p.level })
  return evaluateFootprint(world, occupied, shape.occupiedOffsets.map(offset), shape.supportOffsets.map(offset))
}
export type PlacementReason = 'outside-map' | 'air' | 'unsupported' | 'occupied'
export type WorldPlacement = { valid: true; cells: Coord[] } | { valid: false; reason: PlacementReason; cells: Coord[] }

export function horizontalFootprint(anchor: Coord, width: number): Coord[] {
  if (!Number.isInteger(width) || width < 1) throw new Error('Invalid footprint width')
  return Array.from({ length: width }, (_, offset) => ({ column: anchor.column + offset, level: anchor.level }))
}

export function evaluateFootprint(world: TerracedWorld, occupied: Occupancy, cells: Coord[], supports: Coord[] = cells): WorldPlacement {
  if ([...cells, ...supports].some(p => !insideWorld(world, p))) return { valid: false, reason: 'outside-map', cells }
  if (supports.some(p => terrainAt(world, p).state === 'air')) return { valid: false, reason: 'air', cells }
  if (supports.some(p => !supportsBuilding(world, p))) return { valid: false, reason: 'unsupported', cells }
  if (cells.some(p => occupied[coordKey(p)])) return { valid: false, reason: 'occupied', cells }
  return { valid: true, cells }
}

export function evaluateBuilding(world: TerracedWorld, occupied: Occupancy, shape: BuildingShape, anchor: Coord): WorldPlacement {
  return evaluateFootprint(world, occupied, horizontalFootprint(anchor, shape.width))
}

export function visualBounds(world: TerracedWorld, anchor: Coord, shape: BuildingShape) {
  const p = worldPoint(world, anchor)
  const x = p.x - world.cellWidth / 2
  return {
    x: x - shape.visual.occlusion.left, y: p.y - shape.visual.height - shape.visual.occlusion.above,
    width: shape.width * world.cellWidth + shape.visual.occlusion.left + shape.visual.occlusion.right,
    height: shape.visual.height + shape.visual.occlusion.above + shape.visual.occlusion.below,
    depth: -anchor.level * 1000 + shape.visual.depthOrder,
  }
}

export const placementMessage = (reason: PlacementReason): string => ({
  'outside-map': '占地超出地图边界', air: '空洞不能承载建筑或结构', unsupported: '地面不能支撑建筑或结构', occupied: '这里已有建筑或结构占用',
})[reason]
