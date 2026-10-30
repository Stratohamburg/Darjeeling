import { describe, expect, it } from 'vitest'
import { GameStore } from './gameStore'
import { createWorld, solidGround } from './world'
import { createNetwork } from './roads'

const flat = () => ({ network: createNetwork(createWorld({ columns: 24, levels: 4, cellWidth: 40, stepHeight: 40 }, () => solidGround())), workers: [], workplaces: [] })
const draft = (store: GameStore, id = 'workshop', column = 5, level = 0) => { store.selectBuilding(id); store.movePointer({ column, level }); store.clickMap() }
describe('terraced placement lifecycle', () => {
  it('keeps snapshots stable and removes subscribers', () => {
    const store = new GameStore(() => 1000, flat()), calls: number[] = []
    expect(store.getSnapshot()).toBe(store.getSnapshot())
    const unsubscribe = store.subscribe(() => calls.push(1))
    store.selectBuilding('lamp'); unsubscribe(); store.selectBuilding('cottage')
    expect(calls).toHaveLength(1)
  })
  it('does not occupy a candidate until confirmed; cancel and Esc step back', () => {
    const store = new GameStore(() => 1000, flat())
    draft(store)
    expect(store.getSnapshot().placement.mode).toBe('pending')
    expect(store.getSnapshot().occupied).toEqual({})
    store.movePointer({ column: 8, level: 2 }); store.clickMap()
    expect(store.getSnapshot().placement.candidate?.anchor).toEqual({ column: 5, level: 0 })
    store.escape()
    expect(store.getSnapshot().placement.mode).toBe('preview')
    store.escape()
    expect(store.getSnapshot().placement.mode).toBe('idle')
  })
  it('confirms once with horizontal occupancy and preserves it after timed construction', () => {
    let now = 1000
    const store = new GameStore(() => now, flat())
    draft(store)
    expect(store.confirmCandidate()).toBe(true)
    expect(store.confirmCandidate()).toBe(false)
    expect(Object.keys(store.getSnapshot().occupied)).toEqual(['5,0', '6,0', '7,0'])
    expect(store.getSnapshot().placement.evaluation).toMatchObject({ valid: false, reason: 'occupied' })
    now = 1500; draft(store, 'lamp', 8); store.confirmCandidate()
    now = 4000; store.tick()
    expect(store.getSnapshot().buildings.map(b => b.status)).toEqual(['completed', 'constructing'])
    expect(store.getBuildingProgress(store.getSnapshot().buildings[0].id)).toBe(1)
    expect(store.getSnapshot().workplaces).toHaveLength(1)
    expect(Object.keys(store.getSnapshot().occupied)).toHaveLength(4)
  })
  it('permits placement in visual overlap, refuses holes and structures, and replaces drafts when switching', () => {
    const store = new GameStore(() => 1000)
    draft(store, 'warehouse', 19, 0); store.confirmCandidate()
    draft(store, 'warehouse', 19, 1)
    expect(store.getSnapshot().placement.mode).toBe('pending')
    store.selectBuilding('cottage'); store.movePointer({ column: 10, level: 0 }); store.clickMap()
    expect(store.getSnapshot().placement.evaluation).toMatchObject({ valid: false, reason: 'air' })
    store.movePointer({ column: 6, level: 0 })
    expect(store.getSnapshot().placement.evaluation).toMatchObject({ valid: false, reason: 'occupied' })
    store.movePointer(null)
    expect(store.getSnapshot().placement.pointerInMap).toBe(false)
    store.movePointer({ column: 23, level: 1 })
    expect(store.getSnapshot().placement.evaluation).toMatchObject({ valid: false, reason: 'outside-map' })
  })
  it('rejects stale structure confirmation and invalidates transport atomically', () => {
    const store = new GameStore(() => 1000)
    store.createTransportLine('farm', 'depot', 'vehicle')
    store.assign('truck', { kind: 'line', id: store.getSnapshot().lines[0].id })
    store.deleteStructure('demo-ramp')
    expect(store.getSnapshot().lines[0].status).toBe('needs-recalculation')
    expect(store.getSnapshot().workers.find(w => w.id === 'truck')!.reason).toBe('route-invalidated')
    store.recalculateRoutes()
    expect(store.getSnapshot().lines[0].status).toBe('blocked')
    draft(store, 'ramp3', 7, 0)
    store.changeRoad({ column: 8, level: 0 }, null)
    expect(store.confirmCandidate()).toBe(false)
  })
})
