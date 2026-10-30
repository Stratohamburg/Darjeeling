import { expect, it } from 'vitest'
import { cellBounds, fromViewport, terraceLayout, toViewport, worldPoint, SKY_HEIGHT } from './terraceLayout'

const world = { columns: 24, levels: 4, cellWidth: 40, stepHeight: 40 }
it('preserves coordinates through scaling and viewport pan with upward levels', () => {
  for (const size of [[480, 300], [1440, 900]]) {
    const layout = { ...terraceLayout(world, size[0], size[1]), offsetX: 31, offsetY: 19 }
    for (const p of [{ column: 0, level: 0 }, { column: 23, level: 3 }, { column: 6, level: 2 }]) {
      const point = toViewport(world, layout, p)
      expect(fromViewport(world, layout, { x: point.x, y: point.y - 1 * layout.scale })).toEqual(p)
      const right = toViewport(world, layout, { ...p, column: p.column + 1 })
      const above = toViewport(world, layout, { ...p, level: p.level + 1 })
      expect(right.x - point.x).toBeCloseTo(point.y - above.y)
      const bounds = cellBounds(world, p)
      expect(bounds.width * layout.scale).toBeCloseTo(bounds.height * layout.scale)
      expect(fromViewport(world, layout, { x: layout.offsetX + (bounds.x + 1) * layout.scale, y: layout.offsetY + (bounds.y + 1) * layout.scale })).toEqual(p)
    }
  }
  expect(worldPoint(world, { column: 0, level: 1 }).y - worldPoint(world, { column: 0, level: 2 }).y).toBe(world.stepHeight)
})
it('excludes sky, outer edges, and whitespace without clamping', () => {
  const layout = terraceLayout(world, 960, 520)
  const x = layout.offsetX
  const y = layout.offsetY + SKY_HEIGHT * layout.scale
  expect(fromViewport(world, layout, { x, y })).toEqual({ column: 0, level: 3 })
  expect(fromViewport(world, layout, { x: x - 0.01, y })).toBeNull()
  expect(fromViewport(world, layout, { x: x + 960 * layout.scale, y })).toBeNull()
  expect(fromViewport(world, layout, { x, y: y - 1 })).toBeNull()
  expect(fromViewport(world, layout, { x, y: y + world.levels * world.stepHeight * layout.scale })).toBeNull()
})
