import { describe, expect, it } from 'vitest'
import { createWorld, solidGround, withTerrain } from './world'
import { addStructure, createNetwork, horizontalSegments, roadAt, setRoad, structureOccupancy, TRAVERSAL_COSTS, wildClimbs } from './roads'
import { allowsConnection } from './agents'

const world = createWorld({ columns: 6, levels: 3, cellWidth: 40, stepHeight: 40 }, () => solidGround())
describe('bottom roads', () => {
  it('validates stairs and two/three-cell ramps atomically with one-level endpoints', () => {
    const network = createNetwork(world)
    for (const [kind, end, width] of [['stairs', 0, 1], ['ramp', 1, 2], ['ramp', 2, 3]] as const) {
      const added = addStructure(network, {}, 's', kind, { column: 0, level: 0 }, { column: end, level: 1 })
      expect(added.reason).toBeNull()
      expect(added.network.structures[0].allowedAgents.includes('vehicle')).toBe(kind === 'ramp')
      expect(Object.keys(structureOccupancy(added.network))).toHaveLength(width)
      const failed = addStructure(added.network, {}, 's2', kind, { column: 0, level: 0 }, { column: end, level: 1 })
      expect(failed.network).toBe(added.network)
      expect(failed.reason).toBe('occupied')
    }
    expect(addStructure(network, {}, 's', 'ramp', { column: 0, level: 0 }, { column: 2, level: 2 }).network).toBe(network)
    expect(addStructure(network, { '1,0': 'building' }, 's', 'ramp', { column: 0, level: 0 }, { column: 2, level: 1 }).network).toBe(network)
    const hole = createNetwork(withTerrain(world, { column: 1, level: 0 }, { state: 'air' }))
    expect(addStructure(hole, {}, 's', 'ramp', { column: 0, level: 0 }, { column: 2, level: 1 }).network).toBe(hole)
    expect(wildClimbs(network).every(s => s.to.level - s.from.level === 1)).toBe(true)
    expect(allowsConnection('vehicle', 'climb')).toBe(false)
    expect(allowsConnection('vehicle', 'stairs')).toBe(false)
  })
  it('defaults walkable ground to continuous wild segments', () => {
    const network = createNetwork(withTerrain(world, { column: 3, level: 1 }, { state: 'air' }))
    expect(roadAt(network, { column: 2, level: 1 })).toBe('wild')
    expect(roadAt(network, { column: 3, level: 1 })).toBeNull()
    expect(horizontalSegments(network).filter(s => s.from.level === 1)).toHaveLength(3)
  })
  it('preserves connectivity when paving and explicitly removes and restores a segment', () => {
    const network = createNetwork(world)
    const paved = setRoad(network, { column: 2, level: 0 }, 'stone')
    expect(horizontalSegments(paved).map(s => [s.from, s.to])).toEqual(horizontalSegments(network).map(s => [s.from, s.to]))
    expect(TRAVERSAL_COSTS.concrete).toBeLessThan(TRAVERSAL_COSTS.stone)
    expect(TRAVERSAL_COSTS.stone).toBeLessThan(TRAVERSAL_COSTS.wild)
    const removed = setRoad(paved, { column: 2, level: 0 }, null)
    expect(horizontalSegments(removed).filter(s => s.from.level === 0)).toHaveLength(3)
    expect(roadAt(setRoad(removed, { column: 2, level: 0 }, 'wild'), { column: 2, level: 0 })).toBe('wild')
    expect(setRoad(createNetwork(withTerrain(world, { column: 0, level: 0 }, solidGround({ walkable: false }))), { column: 0, level: 0 }, 'stone').version).toBe(0)
  })
})
