import { describe, expect, it } from 'vitest'
import { createWorld, insideWorld, isWalkable, solidGround, supportsBuilding, terrainAt, withTerrain } from './world'

const config = { columns: 6, levels: 3, cellWidth: 40, stepHeight: 40 }
describe('terraced terrain', () => {
  it('stores holes and independent support and walking flags at adjacent levels', () => {
    let world = createWorld(config, () => solidGround())
    world = withTerrain(world, { column: 2, level: 1 }, { state: 'air' })
    world = withTerrain(world, { column: 3, level: 1 }, solidGround({ supportsBuilding: false }))
    world = withTerrain(world, { column: 4, level: 1 }, solidGround({ walkable: false }))
    expect(terrainAt(world, { column: 2, level: 0 }).state).toBe('ground')
    expect(supportsBuilding(world, { column: 2, level: 1 })).toBe(false)
    expect(isWalkable(world, { column: 2, level: 1 })).toBe(false)
    expect(supportsBuilding(world, { column: 3, level: 1 })).toBe(false)
    expect(isWalkable(world, { column: 3, level: 1 })).toBe(true)
    expect(supportsBuilding(world, { column: 4, level: 1 })).toBe(true)
    expect(isWalkable(world, { column: 4, level: 1 })).toBe(false)
    expect(world.stepHeight).toBe(40)
  })
  it('rejects fractional coordinates and invalid dimensions', () => {
    expect(insideWorld(config, { column: 1.5, level: 0 })).toBe(false)
    expect(() => createWorld({ ...config, stepHeight: 0 })).toThrow()
    expect(() => createWorld({ ...config, stepHeight: 100 })).toThrow('World cells must be square')
    expect(() => withTerrain(createWorld(config), { column: 6, level: 0 }, solidGround())).toThrow()
  })
})
