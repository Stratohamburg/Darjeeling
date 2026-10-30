import { getBuildingDefinition } from './buildings'
import { getProgress, systemClock, type Clock } from './clock'
import { createDemo } from './demo'
import { evaluateBuilding, type WorldPlacement } from './footprint'
import { addStructure, evaluateStructure, removeStructure, setRoad, structureOccupancy, type RoadNetwork, type RoadType } from './roads'
import { createLine, invalidateLines, lineTargets, recalculateLines, syncLineActivity } from './transport'
import { advanceWorkers, assignWorker, recalculateWorkers, type Assignment } from './workforce'
import { coordKey, sameCoord, type Coord } from './world'
import type { GameListener, GameSnapshot, GameState, PlacementState } from './types'

const emptyPlacement = (): PlacementState => ({ mode: 'idle', selectedTypeId: null, pointerCell: null, pointerInMap: false, evaluation: null, candidate: null, candidateEvaluation: null })
export class GameStore {
  private state: GameState
  private readonly listeners = new Set<GameListener>()
  private sequence = 0
  private lastSimulationAt: number

  constructor(private readonly clock: Clock = systemClock, demo = createDemo()) {
    const now = clock()
    this.lastSimulationAt = now
    this.state = { ...demo, map: demo.network.world, buildings: [], occupied: Object.fromEntries(demo.workplaces.map(w => [coordKey(w.position), w.id])), placement: emptyPlacement(), now, lines: [], message: null }
  }
  getSnapshot = (): GameSnapshot => this.state
  subscribe = (listener: GameListener): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private update(next: GameState): void { this.state = next; for (const listener of this.listeners) listener() }
  private targets() { return [...this.state.workplaces, ...lineTargets(this.state.lines, this.state.workplaces)] }

  private evaluateAt(anchor: Coord, typeId: string, state = this.state): WorldPlacement {
    const tool = getBuildingDefinition(typeId)
    if (tool.kind === 'building') return evaluateBuilding(state.map, { ...state.occupied, ...structureOccupancy(state.network) }, tool, anchor)
    const evaluated = evaluateStructure(state.network, state.occupied, tool.kind, anchor, { column: anchor.column + tool.width - 1, level: anchor.level + 1 })
    if (evaluated.valid) return evaluated
    const known = ['outside-map', 'air', 'unsupported', 'occupied'].includes(evaluated.reason)
    return { valid: false, cells: evaluated.cells, reason: known ? evaluated.reason as 'outside-map' | 'air' | 'unsupported' | 'occupied' : 'unsupported' }
  }
  private refreshed(state: GameState): GameState {
    const p = state.placement
    return { ...state, placement: { ...p, evaluation: p.pointerCell && p.selectedTypeId ? this.evaluateAt(p.pointerCell, p.selectedTypeId, state) : null, candidateEvaluation: p.candidate ? this.evaluateAt(p.candidate.anchor, p.candidate.typeId, state) : null } }
  }
  selectBuilding(typeId: string): void {
    getBuildingDefinition(typeId)
    this.update(this.refreshed({ ...this.state, placement: { ...this.state.placement, mode: 'preview', selectedTypeId: typeId, candidate: null, candidateEvaluation: null } }))
  }
  movePointer(cell: Coord | null): void {
    const p = this.state.placement
    if ((!cell && !p.pointerCell) || (cell && p.pointerCell && sameCoord(cell, p.pointerCell))) return
    this.update(this.refreshed({ ...this.state, placement: { ...p, pointerCell: cell, pointerInMap: cell !== null } }))
  }
  clickMap(): void {
    const p = this.state.placement
    if (p.mode !== 'preview' || !p.pointerCell || !p.selectedTypeId) return
    const evaluation = this.evaluateAt(p.pointerCell, p.selectedTypeId)
    if (!evaluation.valid) { this.update({ ...this.state, placement: { ...p, evaluation } }); return }
    this.update({ ...this.state, placement: { ...p, mode: 'pending', candidate: { id: `draft-${++this.sequence}`, typeId: p.selectedTypeId, anchor: { ...p.pointerCell } }, candidateEvaluation: evaluation } })
  }
  cancelCandidate(): void {
    if (this.state.placement.mode !== 'pending') return
    this.update(this.refreshed({ ...this.state, placement: { ...this.state.placement, mode: 'preview', candidate: null, candidateEvaluation: null } }))
  }
  confirmCandidate(): boolean {
    const p = this.state.placement, candidate = p.candidate
    if (p.mode !== 'pending' || !candidate) return false
    const evaluation = this.evaluateAt(candidate.anchor, candidate.typeId)
    if (!evaluation.valid) { this.update({ ...this.state, placement: { ...p, candidateEvaluation: evaluation } }); return false }
    const tool = getBuildingDefinition(candidate.typeId)
    const placement: PlacementState = { ...p, mode: 'preview', candidate: null, candidateEvaluation: null }
    if (tool.kind !== 'building') {
      const result = addStructure(this.state.network, this.state.occupied, `structure-${++this.sequence}`, tool.kind, candidate.anchor, { column: candidate.anchor.column + tool.width - 1, level: candidate.anchor.level + 1 })
      if (result.reason) return false
      this.commitNetwork(result.network, placement)
      return true
    }
    const id = `building-${++this.sequence}`, now = this.clock()
    const occupied = { ...this.state.occupied, ...Object.fromEntries(evaluation.cells.map(cell => [coordKey(cell), id])) }
    this.update(this.refreshed({ ...this.state, occupied, placement, now, buildings: [...this.state.buildings, { id, typeId: tool.id, anchor: candidate.anchor, startedAt: now, buildTimeMs: tool.buildTimeMs, status: 'constructing' }] }))
    return true
  }
  escape(): void {
    if (this.state.placement.mode === 'pending') this.cancelCandidate()
    else if (this.state.placement.mode === 'preview') this.update({ ...this.state, placement: emptyPlacement() })
  }
  tick(now: number = this.clock()): void {
    if (now - this.state.now < 80) return
    const buildings = this.state.buildings.map(b => b.status === 'constructing' && getProgress(b.startedAt, b.buildTimeMs, now) >= 1 ? { ...b, status: 'completed' as const } : b)
    const workplaces = [...this.state.workplaces]
    for (const b of buildings) {
      if (b.status !== 'completed' || !['workshop', 'warehouse'].includes(b.typeId) || workplaces.some(w => w.id === b.id)) continue
      workplaces.push({ id: b.id, kind: 'workplace', name: `${getBuildingDefinition(b.typeId).name} ${b.id.split('-')[1]}`, position: b.anchor, capacity: 2, available: true, transportNode: true, allowedAgents: ['person', 'livestock', 'vehicle'] })
    }
    const step = now - this.lastSimulationAt >= 500
    if (step) this.lastSimulationAt = now
    const workers = step ? advanceWorkers(this.state.workers, [...workplaces, ...lineTargets(this.state.lines, workplaces)], this.state.network) : this.state.workers
    this.update({ ...this.state, buildings, workplaces, workers, now })
  }
  getBuildingProgress(id: string): number {
    const b = this.state.buildings.find(item => item.id === id)
    return b ? b.status === 'completed' ? 1 : getProgress(b.startedAt, b.buildTimeMs, this.state.now) : 0
  }
  assign(workerId: string, assignment: Assignment | null): void {
    const result = assignWorker(this.state.workers, this.targets(), workerId, assignment, this.state.network)
    this.update({ ...this.state, workers: result.workers, lines: syncLineActivity(this.state.lines, result.workers), message: result.reason })
  }
  createTransportLine(sourceId: string, destinationId: string, agent: 'person' | 'livestock' | 'vehicle'): void {
    const result = createLine(`line-${++this.sequence}`, sourceId, destinationId, agent, this.state.workplaces, this.state.network)
    this.update({ ...this.state, lines: result.line ? [...this.state.lines, result.line] : this.state.lines, message: result.reason })
  }
  recalculateRoutes(): void {
    this.update({ ...this.state, lines: recalculateLines(this.state.lines, this.state.workplaces, this.state.network, this.state.workers), workers: recalculateWorkers(this.state.workers), message: null })
  }
  setWorkAvailable(id: string, available: boolean): void {
    this.update({ ...this.state, workplaces: this.state.workplaces.map(w => w.id === id ? { ...w, available } : w) })
  }
  changeRoad(position: Coord, type: RoadType | null): void { this.commitNetwork(setRoad(this.state.network, position, type)) }
  deleteStructure(id: string): void { this.commitNetwork(removeStructure(this.state.network, id)) }
  private commitNetwork(network: RoadNetwork, placement = this.state.placement): void {
    if (network === this.state.network) return
    const workers = this.state.workers.map(w => w.assignment ? { ...w, task: 'waiting' as const, reason: 'route-invalidated' as const } : w)
    this.update(this.refreshed({ ...this.state, map: network.world, network, placement, workers, lines: invalidateLines(this.state.lines, network), message: null }))
  }
}
