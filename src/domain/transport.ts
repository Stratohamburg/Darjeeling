import type { AgentKind } from './agents'
import type { RoadNetwork } from './roads'
import { findRoute, type Route } from './traversal'
import { assignmentCount, type JobTarget, type Worker, type Workplace } from './workforce'

export type TransportLine = {
  id: string; sourceId: string; destinationId: string; agent: AgentKind; capacity: number
  status: 'ready' | 'active' | 'needs-recalculation' | 'blocked'
  route: Route | null
  reason: 'invalid-endpoint' | 'unreachable' | 'route-invalidated' | null
}

export function createLine(id: string, sourceId: string, destinationId: string, agent: AgentKind, nodes: readonly Workplace[], network: RoadNetwork, capacity = 2): { line: TransportLine | null; reason: string | null } {
  const source = nodes.find(n => n.id === sourceId && n.transportNode)
  const destination = nodes.find(n => n.id === destinationId && n.transportNode)
  if (!source || !destination || sourceId === destinationId || !Number.isInteger(capacity) || capacity < 1) return { line: null, reason: '请选择两个有效且不同的搬运节点' }
  const result = findRoute(network, source.position, destination.position, agent)
  return { line: { id, sourceId, destinationId, agent, capacity, route: result.reachable ? result.route : null,
    status: result.reachable ? 'ready' : 'blocked', reason: result.reachable ? null : result.reason }, reason: null }
}

export function lineTargets(lines: readonly TransportLine[], nodes: readonly Workplace[]): JobTarget[] {
  return lines.flatMap(line => {
    const source = nodes.find(n => n.id === line.sourceId), destination = nodes.find(n => n.id === line.destinationId)
    return source && destination ? [{ id: line.id, kind: 'line' as const, position: source.position, destination: destination.position,
      capacity: line.capacity, available: source.available, allowedAgents: [line.agent], route: line.route,
      blocked: line.status === 'blocked' || line.status === 'needs-recalculation' }] : []
  })
}

export function syncLineActivity(lines: readonly TransportLine[], workers: readonly Worker[]): TransportLine[] {
  return lines.map(line => line.status === 'blocked' || line.status === 'needs-recalculation' ? line : {
    ...line, status: assignmentCount(workers, { kind: 'line', id: line.id }) ? 'active' : 'ready',
  })
}

export function invalidateLines(lines: readonly TransportLine[], network: RoadNetwork): TransportLine[] {
  return lines.map(line => line.route?.version === network.version ? line : { ...line, status: 'needs-recalculation', reason: 'route-invalidated' })
}

export function recalculateLines(lines: readonly TransportLine[], nodes: readonly Workplace[], network: RoadNetwork, workers: readonly Worker[]): TransportLine[] {
  return syncLineActivity(lines.map(line => {
    const result = createLine(line.id, line.sourceId, line.destinationId, line.agent, nodes, network, line.capacity)
    return result.line ?? { ...line, route: null, status: 'blocked', reason: 'invalid-endpoint' }
  }), workers)
}
