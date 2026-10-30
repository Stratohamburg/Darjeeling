import { expect, it } from 'vitest'
import { GameStore } from '../domain/gameStore'
import { connectionPoints, lineSegments, sceneBuildings } from './scene'
import { worldPoint } from '../domain/terraceLayout'
import { getBuildingDefinition } from '../domain/buildings'

it('projects the exact route edge references using the same geometry as physical structures', () => {
  const store = new GameStore(() => 1000)
  store.createTransportLine('farm', 'depot', 'vehicle')
  const s = store.getSnapshot(), line = s.lines[0]
  const segments = lineSegments(s, line)
  expect(segments.map(s => s.edgeId)).toEqual(line.route!.edges.map(e => e.id))
  expect(segments.find(s => s.edgeId === 'structure:demo-ramp')!.points).toEqual(connectionPoints(s.map, 'ramp', { column: 7, level: 0 }, { column: 9, level: 1 }))
  expect(segments[0].points[0]).toEqual(worldPoint(s.map, line.route!.edges[0].from))
  store.deleteStructure('demo-ramp')
  expect(lineSegments(store.getSnapshot(), store.getSnapshot().lines[0])).toEqual([])
})
it('sorts visual depth without using it as logical occupancy', () => {
  const store = new GameStore(() => 1000)
  const s = store.getSnapshot()
  const buildings = [{ id: 'low', typeId: 'warehouse', anchor: { column: 13, level: 0 }, startedAt: 0, buildTimeMs: 3000, status: 'completed' as const }, { id: 'high', typeId: 'warehouse', anchor: { column: 13, level: 1 }, startedAt: 0, buildTimeMs: 3000, status: 'completed' as const }]
  expect(sceneBuildings({ ...s, buildings }).map(b => b.building.id)).toEqual(['high', 'low'])
  expect(getBuildingDefinition('warehouse').visual.height).toBeGreaterThan(s.map.stepHeight)
})
