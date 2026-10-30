import { insideWorld, type Coord, type WorldConfig } from './world'

export type Point = { x: number; y: number }
export type TerraceLayout = { scale: number; offsetX: number; offsetY: number; width: number; height: number }
export const SKY_HEIGHT = 200

// A coordinate is drawn at the center of its bottom road. Higher levels move up the screen.
export function worldPoint(world: WorldConfig, p: Coord): Point {
  return { x: (p.column + 0.5) * world.cellWidth, y: SKY_HEIGHT + (world.levels - p.level) * world.stepHeight }
}

export function cellBounds(world: WorldConfig, p: Coord) {
  const bottom = worldPoint(world, p)
  return { x: bottom.x - world.cellWidth / 2, y: bottom.y - world.stepHeight, width: world.cellWidth, height: world.stepHeight }
}

export function terraceLayout(world: WorldConfig, width: number, height: number): TerraceLayout {
  const w = world.columns * world.cellWidth
  const h = SKY_HEIGHT + world.levels * world.stepHeight + 30
  const scale = Math.max(0.01, Math.min(width / w, height / h))
  return { scale, offsetX: (width - w * scale) / 2, offsetY: (height - h * scale) / 2, width: w, height: h }
}

export function toViewport(world: WorldConfig, layout: TerraceLayout, p: Coord): Point {
  const local = worldPoint(world, p)
  return { x: local.x * layout.scale + layout.offsetX, y: local.y * layout.scale + layout.offsetY }
}

export function fromViewport(world: WorldConfig, layout: TerraceLayout, point: Point): Coord | null {
  const x = (point.x - layout.offsetX) / layout.scale
  const y = (point.y - layout.offsetY) / layout.scale - SKY_HEIGHT
  const p = { column: Math.floor(x / world.cellWidth), level: world.levels - 1 - Math.floor(y / world.stepHeight) }
  return insideWorld(world, p) ? p : null
}
