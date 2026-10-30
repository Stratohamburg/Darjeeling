import type { AgentKind } from './agents'
import type { RoadNetwork } from './roads'
import { findRoute, type Route } from './traversal'
import { sameCoord, type Coord } from './world'

export type Assignment = { kind: 'workplace' | 'line'; id: string }
export type WorkerTask = 'idle' | 'going-to-work' | 'working' | 'going-to-pickup' | 'picking-up' | 'carrying' | 'delivering' | 'waiting'
export type BlockReason = 'unreachable' | 'invalid-endpoint' | 'route-invalidated' | 'no-work' | 'target-missing' | 'line-blocked'
export type Worker = {
  id: string; name: string; agent: AgentKind; position: Coord
  assignment: Assignment | null; task: WorkerTask; reason: BlockReason | null
  route: Route | null; routeIndex: number
  carrying: boolean
}
export type JobTarget = {
  id: string; kind: 'workplace' | 'line'; position: Coord; capacity: number
  available: boolean; allowedAgents: readonly AgentKind[]
  destination?: Coord; route?: Route | null; blocked?: boolean
}
export type Workplace = JobTarget & { kind: 'workplace'; name: string; transportNode: boolean }
export const makeWorker = (id: string, name: string, agent: AgentKind, position: Coord): Worker => ({
  id, name, agent, position, assignment: null, task: 'idle', reason: null, route: null, routeIndex: 0, carrying: false,
})
export const assignmentCount = (workers: readonly Worker[], target: Assignment): number => workers.filter(w => w.assignment?.kind === target.kind && w.assignment.id === target.id).length
export const findTarget = (targets: readonly JobTarget[], assignment: Assignment): JobTarget | undefined => targets.find(t => t.kind === assignment.kind && t.id === assignment.id)

export function assignWorker(workers: readonly Worker[], targets: readonly JobTarget[], workerId: string, assignment: Assignment | null, network: RoadNetwork): { workers: readonly Worker[]; reason: string | null } {
  const worker = workers.find(w => w.id === workerId)
  if (!worker) return { workers, reason: '工人不存在' }
  let next: Worker = { ...worker, assignment, route: null, routeIndex: 0, reason: null, carrying: false, task: 'idle' }
  if (assignment) {
    const target = findTarget(targets, assignment)
    if (!target) return { workers, reason: '岗位不存在' }
    if (!target.allowedAgents.includes(worker.agent)) return { workers, reason: '主体能力不符合岗位要求' }
    const used = workers.filter(w => w.id !== workerId)
    if (assignmentCount(used, assignment) >= target.capacity) return { workers, reason: '岗位已满' }
    const result = findRoute(network, worker.position, target.position, worker.agent)
    if (assignment.kind === 'line' && (!result.reachable || !target.route || target.route.version !== network.version || target.blocked
      || target.route.edges.some(edge => !edge.allowedAgents.includes(worker.agent)))) return { workers, reason: '工人无法到达运输线或通行能力不兼容' }
    next = { ...next, task: assignment.kind === 'workplace' ? 'going-to-work' : 'going-to-pickup', route: result.reachable ? result.route : null,
      reason: result.reachable ? null : result.reason }
    if (!result.reachable) next.task = 'waiting'
  }
  return { workers: workers.map(w => w.id === workerId ? next : w), reason: null }
}

export function recalculateWorkers(workers: readonly Worker[]): Worker[] {
  return workers.map(worker => worker.assignment ? { ...worker, route: null, routeIndex: 0, reason: null,
    task: worker.assignment.kind === 'workplace' ? 'going-to-work' : worker.carrying ? 'carrying' : 'going-to-pickup' } : worker)
}

export function advanceWorkers(workers: readonly Worker[], targets: readonly JobTarget[], network: RoadNetwork): Worker[] {
  return workers.map(worker => advanceWorker(worker, targets, network))
}

function advanceWorker(worker: Worker, targets: readonly JobTarget[], network: RoadNetwork): Worker {
  if (!worker.assignment) return worker
  const target = findTarget(targets, worker.assignment)
  const wait = (reason: BlockReason): Worker => ({ ...worker, task: 'waiting', reason })
  if (!target) return wait('target-missing')
  if (worker.route && worker.route.version !== network.version) return wait('route-invalidated')
  if (target.kind === 'line' && target.route?.version !== network.version) return wait('route-invalidated')
  if (target.blocked) return wait('line-blocked')
  if (!target.available && !worker.carrying) return wait('no-work')
  if (worker.reason === 'route-invalidated') return worker
  if (worker.task === 'picking-up') return { ...worker, task: 'carrying', carrying: true, route: null, routeIndex: 0, reason: null }
  if (worker.task === 'delivering') return { ...worker, task: 'going-to-pickup', carrying: false, route: null, routeIndex: 0, reason: null }
  const goal = worker.assignment.kind === 'line' && worker.carrying ? target.destination! : target.position
  let next = { ...worker, reason: null as BlockReason | null }
  if (!next.route) {
    const result = findRoute(network, next.position, goal, next.agent)
    if (!result.reachable) return wait(result.reason)
    next = { ...next, route: result.route, routeIndex: 0 }
  }
  if (sameCoord(next.position, goal)) return { ...next, task: worker.assignment.kind === 'workplace' ? 'working' : worker.carrying ? 'delivering' : 'picking-up' }
  const index = next.routeIndex + 1
  const position = next.route!.nodes[index]
  if (!position) return wait('unreachable')
  return { ...next, position, routeIndex: index, task: worker.assignment.kind === 'workplace' ? 'going-to-work' : worker.carrying ? 'carrying' : 'going-to-pickup' }
}

export const taskLabel: Record<WorkerTask, string> = {
  idle: '空闲', 'going-to-work': '前往工作', working: '工作中', 'going-to-pickup': '前往取货', 'picking-up': '取货', carrying: '搬运', delivering: '交付', waiting: '等待',
}
export const blockLabel: Record<BlockReason, string> = {
  unreachable: '目标不可达', 'invalid-endpoint': '端点不可行走', 'route-invalidated': '路线已失效，需重算', 'no-work': '暂时无任务', 'target-missing': '岗位不存在', 'line-blocked': '运输线阻塞',
}
