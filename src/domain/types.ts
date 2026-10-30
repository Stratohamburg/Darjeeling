import type { BuildingShape, Occupancy, WorldPlacement } from './footprint'
import type { RoadNetwork } from './roads'
import type { Coord, TerracedWorld } from './world'
import type { Worker, Workplace } from './workforce'
import type { TransportLine } from './transport'

export type ToolDefinition = BuildingShape & {
  id: string; kind: 'building' | 'stairs' | 'ramp'; name: string; description: string
  buildTimeMs: number; color: number; accentColor: number
}
export type BuildingInstance = {
  id: string; typeId: string; anchor: Coord; startedAt: number; buildTimeMs: number
  status: 'constructing' | 'completed'
}
export type PlacementCandidate = { id: string; typeId: string; anchor: Coord }
export type PlacementState = {
  mode: 'idle' | 'preview' | 'pending'; selectedTypeId: string | null
  pointerCell: Coord | null; pointerInMap: boolean
  evaluation: WorldPlacement | null; candidate: PlacementCandidate | null; candidateEvaluation: WorldPlacement | null
}
export type GameState = {
  map: TerracedWorld; network: RoadNetwork; buildings: BuildingInstance[]; occupied: Occupancy
  placement: PlacementState; now: number; workers: readonly Worker[]; workplaces: Workplace[]
  lines: TransportLine[]; message: string | null
}
export type GameSnapshot = Readonly<GameState>
export type GameListener = () => void
