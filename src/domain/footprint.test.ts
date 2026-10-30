import { describe, expect, it } from 'vitest'
import { evaluateBuilding, evaluateCrossLevel, horizontalFootprint, visualBounds, type BuildingShape, type CrossLevelShape } from './footprint'
import { createWorld, solidGround, withTerrain } from './world'

const world = createWorld({ columns: 8, levels: 3, cellWidth: 40, stepHeight: 40 }, () => solidGround())
const shape: BuildingShape = { width: 3, visual: { height: 230, depthOrder: 2, occlusion: { left: 5, right: 5, above: 10, below: 10 } } }
const anchor = { column: 2, level: 0 }
describe('horizontal building footprints', () => {
  it('requires explicit cross-level occupancy and support independently of visual height', () => {
    const bridge: CrossLevelShape = { kind: 'cross-level', occupiedOffsets: [{ column: 0, level: 0 }, { column: 1, level: 1 }], supportOffsets: [{ column: 0, level: 0 }, { column: 1, level: 1 }], traversal: [], visual: shape.visual }
    expect(evaluateCrossLevel(world, {}, bridge, anchor).cells).toEqual([{ column: 2, level: 0 }, { column: 3, level: 1 }])
    expect(evaluateCrossLevel(withTerrain(world, { column: 3, level: 1 }, { state: 'air' }), {}, bridge, anchor)).toMatchObject({ valid: false, reason: 'air' })
    expect(evaluateBuilding(world, {}, shape, anchor).cells.every(p => p.level === 0)).toBe(true)
  })
  it('keeps a tall building on one level, allowing visual overlap and adjacent buildings', () => {
    expect(horizontalFootprint(anchor, shape.width)).toEqual([{ column: 2, level: 0 }, { column: 3, level: 0 }, { column: 4, level: 0 }])
    const occupied = { '2,0': 'b', '3,0': 'b', '4,0': 'b' }
    expect(evaluateBuilding(world, occupied, shape, { column: 2, level: 1 }).valid).toBe(true)
    expect(evaluateBuilding(world, occupied, shape, { column: 5, level: 0 }).valid).toBe(true)
    expect(evaluateBuilding(world, occupied, shape, { column: 4, level: 0 })).toMatchObject({ valid: false, reason: 'occupied' })
    expect(visualBounds(world, anchor, shape).height).toBe(250)
  })
  it('rejects holes, unsupported terrain, and overflow without partial occupancy', () => {
    const occupied = {}
    for (const [cell, reason] of [[{ state: 'air' }, 'air'], [solidGround({ supportsBuilding: false }), 'unsupported']] as const) {
      const map = withTerrain(world, { column: 3, level: 0 }, cell)
      expect(evaluateBuilding(map, occupied, shape, anchor)).toMatchObject({ valid: false, reason })
      expect(occupied).toEqual({})
    }
    expect(evaluateBuilding(world, occupied, shape, { column: 7, level: 0 })).toMatchObject({ valid: false, reason: 'outside-map' })
  })
})
