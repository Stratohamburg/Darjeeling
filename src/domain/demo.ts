import { createWorld, solidGround, type Coord } from './world'
import { addStructure, createNetwork, setRoad } from './roads'
import { makeWorker, type Workplace } from './workforce'

export function createDemo() {
  const cellSide = 40
  const world = createWorld({ columns: 24, levels: 4, cellWidth: cellSide, stepHeight: cellSide }, p => {
    if (p.level === 0 && (p.column === 11 || p.column === 12)) return { state: 'air' }
    if (p.level === 1 && p.column < 6 || p.level === 2 && p.column < 13 || p.level === 3 && p.column < 20) return { state: 'air' }
    return solidGround({ material: p.level > 1 ? 'rock' : 'soil', supportsBuilding: !(p.level === 0 && p.column === 23), walkable: !(p.level === 3 && p.column === 23) })
  })
  let network = createNetwork(world)
  network = addStructure(network, {}, 'demo-stairs', 'stairs', { column: 6, level: 0 }, { column: 6, level: 1 }).network
  network = addStructure(network, {}, 'demo-ramp', 'ramp', { column: 7, level: 0 }, { column: 9, level: 1 }).network
  network = addStructure(network, {}, 'high-ramp', 'ramp', { column: 14, level: 1 }, { column: 16, level: 2 }).network
  network = addStructure(network, {}, 'high-stairs', 'stairs', { column: 20, level: 2 }, { column: 20, level: 3 }).network
  for (let column = 9; column < 20; column++) network = setRoad(network, { column, level: 1 }, 'stone')
  const place = (id: string, name: string, position: Coord, capacity: number): Workplace => ({ id, kind: 'workplace', name, position, capacity, available: true, transportNode: true, allowedAgents: ['person', 'livestock', 'vehicle'] })
  return {
    network,
    workplaces: [place('farm', '茶田', { column: 2, level: 0 }, 2), place('depot', '山腰货站', { column: 12, level: 1 }, 2), place('mill', '高地工场', { column: 21, level: 2 }, 1)],
    workers: [makeWorker('person-1', '阿青', 'person', { column: 3, level: 0 }), makeWorker('person-2', '阿岚', 'person', { column: 4, level: 0 }), makeWorker('yak', '牦牛', 'livestock', { column: 1, level: 0 }), makeWorker('truck', '货车', 'vehicle', { column: 0, level: 0 })],
  }
}
