import { describe, expect, it } from 'vitest'
import { addStructure, createNetwork, removeStructure, setRoad } from './roads'
import { createWorld, solidGround } from './world'
import { createLine, invalidateLines, lineTargets, recalculateLines, syncLineActivity } from './transport'
import { advanceWorkers, assignmentCount, assignWorker, makeWorker, type Workplace } from './workforce'

const network = createNetwork(createWorld({ columns: 6, levels: 2, cellWidth: 40, stepHeight: 40 }, () => solidGround()))
const node = (id: string, column: number, level = 0): Workplace => ({ id, kind: 'workplace', name: id, transportNode: true, position: { column, level }, capacity: 2, available: true, allowedAgents: ['person', 'livestock', 'vehicle'] })
const nodes = [node('farm', 0), node('store', 5), node('middle', 2)]
describe('point-to-point transport', () => {
  it('exposes actual horizontal, climb, stair and ramp references', () => {
    const up = [node('farm', 0), node('store', 0, 1)]
    const climb = createLine('l', 'farm', 'store', 'person', up, network).line!
    expect(climb.route!.edges.map(e => e.kind)).toContain('climb')
    const stairsNetwork = addStructure(network, {}, 's', 'stairs', up[0].position, up[1].position).network
    expect(createLine('l', 'farm', 'store', 'person', up, stairsNetwork).line!.route!.edges.map(e => e.id)).toContain('structure:s')
    const rampNodes = [node('farm', 0), node('store', 2, 1)]
    const rampNetwork = addStructure(network, {}, 'r', 'ramp', rampNodes[0].position, rampNodes[1].position).network
    const ramp = createLine('l', 'farm', 'store', 'vehicle', rampNodes, rampNetwork).line!
    expect(ramp.route!.edges.map(e => e.id)).toEqual(['structure:r'])
    const removed = removeStructure(rampNetwork, 'r')
    expect(invalidateLines([ramp], removed)[0].status).toBe('needs-recalculation')
    expect(recalculateLines([ramp], rampNodes, removed, [])[0]).toMatchObject({ status: 'blocked', reason: 'unreachable', route: null })
    const restored = addStructure(removed, {}, 'replacement', 'ramp', rampNodes[0].position, rampNodes[1].position).network
    const recovered = recalculateLines([ramp], rampNodes, restored, [])[0]
    expect(recovered.status).toBe('ready')
    expect(recovered.route!.edges.map(e => e.id)).toEqual(['structure:replacement'])
    expect(recovered.route!.version).toBe(restored.version)
  })
  it('checks transport ability before atomically replacing a workplace job and drives hauling phases', () => {
    const line = createLine('l', 'farm', 'store', 'person', nodes, network).line!
    const targets = [...nodes, ...lineTargets([line], nodes)]
    const initial = [makeWorker('w', '工人', 'person', { column: 0, level: 0 }), makeWorker('v', '货车', 'vehicle', { column: 0, level: 0 })]
    const atWork = assignWorker(initial, targets, 'w', { kind: 'workplace', id: 'farm' }, network).workers
    expect(assignWorker(atWork, targets, 'v', { kind: 'line', id: 'l' }, network).workers).toBe(atWork)
    let workers = assignWorker(atWork, targets, 'w', { kind: 'line', id: 'l' }, network).workers
    expect(assignmentCount(workers, { kind: 'workplace', id: 'farm' })).toBe(0)
    expect(syncLineActivity([line], workers)[0].status).toBe('active')
    const tasks = []
    for (let i = 0; i < 12; i++) { workers = advanceWorkers(workers, targets, network); tasks.push(workers[0].task) }
    expect(tasks).toEqual(expect.arrayContaining(['picking-up', 'carrying', 'delivering']))
  })
  it('rejects invalid nodes without creating a line and derives a full logical route for valid endpoints', () => {
    expect(createLine('l', 'missing', 'store', 'person', nodes, network).line).toBeNull()
    expect(createLine('l', 'farm', 'farm', 'person', nodes, network).line).toBeNull()
    expect(createLine('l', 'farm', 'store', 'person', nodes.map(n => ({ ...n, transportNode: false })), network).line).toBeNull()
    const result = createLine('l', 'farm', 'store', 'person', nodes, network).line!
    expect(result.status).toBe('ready')
    expect(result.route!.nodes).toHaveLength(6)
    expect(result.route!.edges.every(e => e.kind === 'horizontal')).toBe(true)
    expect(Object.keys(result)).not.toContain('stops')
  })
  it('retains valid endpoints with a blocked reason when no complete route exists', () => {
    const routeNodes = [node('farm', 0), node('store', 0, 1)]
    const line = createLine('l', 'farm', 'store', 'vehicle', routeNodes, network).line!
    expect(line).toMatchObject({ status: 'blocked', reason: 'unreachable', route: null })
  })
})
