import type { ToolDefinition } from './types'

const visual = (height: number, depthOrder = 0): ToolDefinition['visual'] => ({ height, depthOrder, occlusion: { left: 0, right: 0, above: 8, below: 0 } })
export const BUILDINGS: readonly ToolDefinition[] = [
  { id: 'lamp', kind: 'building', name: '路灯', description: '单格照明', width: 1, visual: visual(72), buildTimeMs: 3000, color: 0xf2bf63, accentColor: 0xffedaa },
  { id: 'cottage', kind: 'building', name: '小屋', description: '横向双格居所', width: 2, visual: visual(112), buildTimeMs: 3000, color: 0x75b7a9, accentColor: 0xc1f1d8 },
  { id: 'workshop', kind: 'building', name: '工坊', description: '完工后提供 2 个岗位', width: 3, visual: visual(130), buildTimeMs: 3000, color: 0x7fa6d8, accentColor: 0xc6dcff },
  { id: 'warehouse', kind: 'building', name: '仓库', description: '完工后可作运输端点', width: 3, visual: visual(154), buildTimeMs: 3000, color: 0xc18ed1, accentColor: 0xf1d0ff },
]
export const STRUCTURE_TOOLS: readonly ToolDefinition[] = [
  { id: 'stairs', kind: 'stairs', name: '楼梯', description: '跨 1 层 · 人与牲畜可用', width: 1, visual: visual(100), buildTimeMs: 0, color: 0xe4b475, accentColor: 0xffdd9c },
  { id: 'ramp2', kind: 'ramp', name: '短斜坡', description: '跨 1 层 · 车辆可用', width: 2, visual: visual(100), buildTimeMs: 0, color: 0x89c7c4, accentColor: 0xb7f3ed },
  { id: 'ramp3', kind: 'ramp', name: '长斜坡', description: '跨 1 层 · 车辆可用', width: 3, visual: visual(100), buildTimeMs: 0, color: 0x89c7c4, accentColor: 0xb7f3ed },
]
export const TOOLS = [...BUILDINGS, ...STRUCTURE_TOOLS]
export function getBuildingDefinition(typeId: string): ToolDefinition {
  const definition = TOOLS.find(b => b.id === typeId)
  if (!definition) throw new Error(`Unknown building/tool type: ${typeId}`)
  return definition
}
