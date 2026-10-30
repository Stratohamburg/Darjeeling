import { describe, expect, it } from 'vitest'
import { createWorld, solidGround } from './world'
import { createNetwork, setRoad } from './roads'
import { findRoute } from './traversal'
import { advanceWorkers, assignmentCount, assignWorker, makeWorker, recalculateWorkers, type JobTarget, type Workplace } from './workforce'

const network = createNetwork(createWorld({ columns: 6, levels: 1, cellWidth: 40, stepHeight: 40 }, () => solidGround()))
const workplace: Workplace = { id: 'farm', kind: 'workplace', name: '田地', transportNode: true, position: { column: 1, level: 0 }, capacity: 1, available: true, allowedAgents: ['person'] }
const found = findRoute(network, { column: 1, level: 0 }, { column: 4, level: 0 }, 'person')
const line: JobTarget = { id: 'line', kind: 'line', position: { column: 1, level: 0 }, destination: { column: 4, level: 0 }, capacity: 1, available: true, allowedAgents: ['person'], route: found.reachable ? found.route : null }
const workers = [makeWorker('a', '阿青', 'person', { column: 0, level: 0 }), makeWorker('b', '阿岚', 'person', { column: 0, level: 0 })]

describe('exclusive worker assignments', () => {
  it('exports stable assignment, task and blocking fields in domain snapshots', () => {
    const changed = setRoad(network, { column: 1, level: 0 }, null)
    const state = assignWorker(workers, [workplace], 'a', { kind: 'workplace', id: 'farm' }, changed).workers
    expect(JSON.parse(JSON.stringify(state[0]))).toMatchObject({ id: 'a', agent: 'person', position: { column: 0, level: 0 }, assignment: { kind: 'workplace', id: 'farm' }, task: 'waiting', reason: 'invalid-endpoint', route: null, routeIndex: 0, carrying: false })
  })
  it('arrives at work, waits without reassignment, and resumes when work returns', () => {
    let state = assignWorker(workers, [workplace], 'a', { kind: 'workplace', id: 'farm' }, network).workers
    state = advanceWorkers(state, [workplace], network)
    state = advanceWorkers(state, [workplace], network)
    expect(state[0].task).toBe('working')
    const waiting = advanceWorkers(state, [{ ...workplace, available: false }], network)
    expect(waiting[0]).toMatchObject({ task: 'waiting', reason: 'no-work', assignment: { kind: 'workplace', id: 'farm' } })
    expect(advanceWorkers(waiting, [workplace], network)[0].task).toBe('working')
  })
  it('stops at the current node after invalidation, then replans or reports unreachable', () => {
    const far = { ...workplace, position: { column: 5, level: 0 } }
    let state = assignWorker(workers, [far], 'a', { kind: 'workplace', id: 'farm' }, network).workers
    state = advanceWorkers(state, [far], network)
    const changed = setRoad(network, { column: 2, level: 0 }, null)
    const stopped = advanceWorkers(state, [far], changed)
    expect(stopped[0].position).toEqual(state[0].position)
    expect(stopped[0].reason).toBe('route-invalidated')
    const recalculated = advanceWorkers(recalculateWorkers(stopped), [far], changed)
    expect(recalculated[0]).toMatchObject({ task: 'waiting', reason: 'unreachable', position: { column: 1, level: 0 } })
    expect(assignWorker(workers, [far], 'a', { kind: 'workplace', id: 'farm' }, changed).workers[0].reason).toBe('unreachable')
  })
  it('exposes pickup, carrying and delivery states for a transport assignment', () => {
    let state = assignWorker(workers, [line], 'a', { kind: 'line', id: 'line' }, network).workers
    const tasks = [state[0].task]
    for (let i = 0; i < 12; i++) {
      state = advanceWorkers(state, [line], network)
      tasks.push(state[0].task)
      expect(state[0].assignment).toEqual({ kind: 'line', id: 'line' })
    }
    expect(tasks).toEqual(expect.arrayContaining(['going-to-pickup', 'picking-up', 'carrying', 'delivering']))
  })
  it('rejects a full destination without losing the old job and releases slots when reassigned', () => {
    const first = assignWorker(workers, [workplace, line], 'a', { kind: 'workplace', id: 'farm' }, network).workers
    const second = assignWorker(first, [workplace, line], 'b', { kind: 'line', id: 'line' }, network).workers
    const failed = assignWorker(second, [workplace, line], 'a', { kind: 'line', id: 'line' }, network)
    expect(failed.reason).toBe('岗位已满')
    expect(failed.workers).toBe(second)
    const released = assignWorker(second, [workplace, line], 'b', null, network).workers
    const changed = assignWorker(released, [workplace, line], 'a', { kind: 'line', id: 'line' }, network).workers
    expect(assignmentCount(changed, { kind: 'workplace', id: 'farm' })).toBe(0)
    expect(assignmentCount(changed, { kind: 'line', id: 'line' })).toBe(1)
    expect(changed[0].assignment).toEqual({ kind: 'line', id: 'line' })
  })
})
