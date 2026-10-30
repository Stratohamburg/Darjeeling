import { describe, expect, it } from 'vitest'
import { createWorld, solidGround } from './world'
import { addStructure, createNetwork, removeStructure, setNetworkTerrain, setRoad } from './roads'
import { buildGraph, findRoute, routeStatus } from './traversal'
import { TRAVERSAL_COSTS } from './roads'
import type { AgentKind } from './agents'

const world = createWorld({ columns: 6, levels: 3, cellWidth: 40, stepHeight: 40 }, () => solidGround())
describe('logical traversal graph', () => {
  it.each(['person', 'livestock', 'vehicle'] as AgentKind[])('filters every connection type for %s and calculates repeatable costs', agent => {
    const base = createNetwork(createWorld({ columns: 3, levels: 2, cellWidth: 40, stepHeight: 40 }, () => solidGround()))
    const from = { column: 0, level: 0 }, to = { column: 0, level: 1 }
    expect(findRoute(base, from, to, agent).reachable).toBe(agent !== 'vehicle')
    const stairs = addStructure(base, {}, 's', 'stairs', from, to).network
    expect(findRoute(stairs, from, to, agent).reachable).toBe(agent !== 'vehicle')
    const ramp = addStructure(base, {}, 'r', 'ramp', from, { column: 1, level: 1 }).network
    const result = findRoute(ramp, from, { column: 1, level: 1 }, agent)
    expect(result.reachable).toBe(true)
    expect(findRoute(ramp, from, { column: 1, level: 1 }, agent)).toEqual(result)
    for (const type of ['wild', 'stone', 'concrete'] as const) {
      let network = setRoad(base, from, type)
      network = setRoad(network, { column: 1, level: 0 }, type)
      const horizontal = findRoute(network, from, { column: 1, level: 0 }, agent)
      expect(horizontal.reachable && horizontal.route.cost).toBe(TRAVERSAL_COSTS[type])
    }
    expect(TRAVERSAL_COSTS.climb).toBeGreaterThan(TRAVERSAL_COSTS.wild)
    const changed = findRoute(base, from, to, 'person', { ...TRAVERSAL_COSTS, climb: 30 })
    expect(changed.reachable && changed.route.cost).toBe(30)
  })
  it('invalidates route versions for road, structure and terrain changes', () => {
    const network = addStructure(createNetwork(world), {}, 'r', 'ramp', { column: 0, level: 0 }, { column: 2, level: 1 }).network
    const found = findRoute(network, { column: 0, level: 0 }, { column: 3, level: 1 }, 'vehicle')
    if (!found.reachable) throw new Error('Expected valid fixture route')
    expect(routeStatus(network, found.route)).toBe('valid')
    for (const changed of [removeStructure(network, 'r'), setRoad(network, { column: 3, level: 1 }, null), setNetworkTerrain(network, { column: 3, level: 1 }, { state: 'air' })]) {
      expect(changed.version).toBeGreaterThan(network.version)
      expect(routeStatus(changed, found.route)).toBe('needs-recalculation')
    }
    const unsupported = setNetworkTerrain(network, { column: 1, level: 0 }, solidGround({ supportsBuilding: false }))
    expect(buildGraph(unsupported).edges.some(e => e.id === 'structure:r')).toBe(false)
  })
  it('references the actual ramp footprint and does not add flat road shortcuts through its interior', () => {
    const network = addStructure(createNetwork(world), {}, 'r', 'ramp', { column: 0, level: 0 }, { column: 2, level: 1 }).network
    const graph = buildGraph(network)
    const ramp = graph.edges.find(e => e.id === 'structure:r')!
    expect(ramp.footprint).toEqual(network.structures[0].footprint)
    expect(ramp.references).toContain('structure:r')
    expect(graph.nodes['1,0']).toBeUndefined()
    const route = findRoute(network, { column: 0, level: 0 }, { column: 2, level: 1 }, 'vehicle')
    expect(route.reachable && route.route.edges.map(e => e.id)).toEqual(['structure:r'])
    expect(buildGraph(network)).toEqual(graph)
  })
  it('never returns a partial route over missing road segments', () => {
    let network = createNetwork(createWorld({ ...world, levels: 1 }, () => solidGround()))
    network = setRoad(network, { column: 2, level: 0 }, null)
    expect(findRoute(network, { column: 0, level: 0 }, { column: 5, level: 0 }, 'person')).toEqual({ reachable: false, reason: 'unreachable' })
    expect(findRoute(network, { column: 2, level: 0 }, { column: 5, level: 0 }, 'person')).toEqual({ reachable: false, reason: 'invalid-endpoint' })
  })
  it('requires a chain of two ramps for a two-level vehicle journey', () => {
    let network = createNetwork(world)
    network = addStructure(network, {}, 'r1', 'ramp', { column: 0, level: 0 }, { column: 1, level: 1 }).network
    expect(findRoute(network, { column: 0, level: 0 }, { column: 2, level: 2 }, 'vehicle').reachable).toBe(false)
    network = addStructure(network, {}, 'r2', 'ramp', { column: 1, level: 1 }, { column: 2, level: 2 }).network
    const route = findRoute(network, { column: 0, level: 0 }, { column: 2, level: 2 }, 'vehicle')
    expect(route.reachable && route.route.edges.map(e => e.id)).toEqual(['structure:r1', 'structure:r2'])
  })
})
