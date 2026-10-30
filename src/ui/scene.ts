import { getBuildingDefinition } from '../domain/buildings'
import { visualBounds } from '../domain/footprint'
import { worldPoint, type Point } from '../domain/terraceLayout'
import type { GameSnapshot } from '../domain/types'
import type { ConnectionKind } from '../domain/agents'
import type { TransportLine } from '../domain/transport'
import type { Coord, WorldConfig } from '../domain/world'

export function connectionPoints(world: WorldConfig, kind: ConnectionKind, from: Coord, to: Coord): Point[] {
  const a = worldPoint(world, from), b = worldPoint(world, to)
  if (kind !== 'stairs') return [a, b]
  const points: Point[] = [a]
  for (let i = 1; i <= 5; i++) {
    const x = a.x + (i % 2 ? 10 : -10)
    points.push({ x, y: a.y + (b.y - a.y) * (i - 1) / 5 }, { x, y: a.y + (b.y - a.y) * i / 5 })
  }
  return [...points, b]
}

export function lineSegments(snapshot: GameSnapshot, line: TransportLine) {
  if (!line.route || line.route.version !== snapshot.network.version || line.status === 'blocked' || line.status === 'needs-recalculation') return []
  return line.route.edges.map(edge => ({ edgeId: edge.id, references: edge.references, points: connectionPoints(snapshot.map, edge.kind, edge.from, edge.to) }))
}

export function sceneBuildings(snapshot: GameSnapshot) {
  return snapshot.buildings.map(building => {
    const definition = getBuildingDefinition(building.typeId)
    return { building, definition, bounds: visualBounds(snapshot.map, building.anchor, definition) }
  }).sort((a, b) => a.bounds.depth - b.bounds.depth || a.building.id.localeCompare(b.building.id))
}

export function occludedAlpha(snapshot: GameSnapshot, position: Coord): number {
  const p = worldPoint(snapshot.map, position)
  return sceneBuildings(snapshot).some(({ bounds }) => p.x > bounds.x && p.x < bounds.x + bounds.width && p.y - 15 > bounds.y && p.y - 15 < bounds.y + bounds.height) ? 0.32 : 1
}
