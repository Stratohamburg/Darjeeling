import { Application, Container, Graphics, Text } from 'pixi.js'
import { useEffect, useRef } from 'react'
import { getBuildingDefinition } from '../domain/buildings'
import { getProgress } from '../domain/clock'
import { placementMessage } from '../domain/footprint'
import { cellBounds, fromViewport, terraceLayout, toViewport, worldPoint, SKY_HEIGHT, type Point, type TerraceLayout } from '../domain/terraceLayout'
import { roadAt } from '../domain/roads'
import { coordKey, terrainAt } from '../domain/world'
import type { GameSnapshot } from '../domain/types'
import type { GameStore } from '../domain/gameStore'
import { connectionPoints, lineSegments, occludedAlpha, sceneBuildings } from './scene'

type Props = { store: GameStore; snapshot: GameSnapshot; onLayout: (layout: TerraceLayout) => void }
const roadColors = { wild: 0x9baf88, stone: 0xb2c4d0, concrete: 0xe8eff4 }

function stroke(parent: Container, points: Point[], color: number, width: number, alpha = 1) {
  if (!points.length) return
  const g = new Graphics().moveTo(points[0].x, points[0].y)
  points.slice(1).forEach(p => g.lineTo(p.x, p.y))
  parent.addChild(g.stroke({ color, width, alpha, cap: 'round', join: 'round' }))
}
function label(parent: Container, text: string, x: number, y: number, color = 0x9bb3c0, size = 10) {
  const item = new Text({ text, style: { fontFamily: 'Arial, Microsoft YaHei, sans-serif', fontSize: size, fill: color } })
  item.position.set(x, y)
  parent.addChild(item)
}

export function PixiMap({ store, snapshot, onLayout }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const snapshotRef = useRef(snapshot)
  const drawRef = useRef<(() => void) | null>(null)
  snapshotRef.current = snapshot

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const app = new Application()
    let disposed = false, initialized = false
    let observer: ResizeObserver | null = null
    let layout: TerraceLayout | null = null
    const world = new Container()
    const draw = () => {
      if (disposed || !layout || !initialized) return
      const s = snapshotRef.current, map = s.map
      world.removeChildren().forEach(child => child.destroy({ children: true }))
      world.addChild(new Graphics().rect(0, 0, layout.width, layout.height).fill(0x10212b))
      const w = layout.width, h = layout.height
      world.addChild(new Graphics().poly([0, h * 0.5, w * 0.22, 50, w * 0.44, h * 0.55, w * 0.68, 20, w, h * 0.5, w, h, 0, h]).fill({ color: 0x1e3a40, alpha: 0.48 }))
      label(world, 'DARJEELING  /  HILLSIDE WORKS', 20, 20, 0x698b8f, 11)
      const grid = new Graphics()
      for (let column = 0; column <= map.columns; column++) {
        grid.moveTo(column * map.cellWidth, SKY_HEIGHT).lineTo(column * map.cellWidth, SKY_HEIGHT + map.levels * map.stepHeight)
      }
      for (let level = 0; level <= map.levels; level++) {
        const y = SKY_HEIGHT + level * map.stepHeight
        grid.moveTo(0, y).lineTo(layout.width, y)
      }
      world.addChild(grid.stroke({ color: 0x54717a, width: 1, alpha: 0.32 }))
      for (let level = 0; level < map.levels; level++) {
        const y = worldPoint(map, { column: 0, level }).y
        label(world, `L${level}  ↑`, 5, y - map.stepHeight + 8, 0x64868d, 10)
        for (let column = 0; column < map.columns; column++) {
          const p = { column, level }, cell = terrainAt(map, p)
          const point = worldPoint(map, p), x = point.x - map.cellWidth / 2
          if (cell.state === 'air') {
            stroke(world, [{ x: point.x - 3, y: point.y - 7 }, { x: point.x + 3, y: point.y - 1 }], 0x54717a, 1, 0.3)
            stroke(world, [{ x: point.x - 3, y: point.y - 1 }, { x: point.x + 3, y: point.y - 7 }], 0x54717a, 1, 0.3)
            continue
          }
          const bounds = cellBounds(map, p)
          world.addChild(new Graphics().rect(bounds.x + 1, bounds.y + 1, bounds.width - 2, bounds.height - 2)
            .fill(cell.material === 'rock' ? 0x374b52 : 0x3b5244)
            .stroke({ color: 0x68816c, width: 1, alpha: 0.7 }))
          world.addChild(new Graphics().rect(x + 1, y - 6, map.cellWidth - 2, 5).fill(cell.supportsBuilding ? 0x7b986c : 0xb99a6d))
          const road = roadAt(s.network, p)
          if (road) stroke(world, [{ x: x + 1, y }, { x: x + map.cellWidth - 1, y }], roadColors[road], road === 'wild' ? 2 : 4)
          else label(world, '×', x + 15, y - 12, 0xdf8e7c, 12)
          if (!cell.walkable) label(world, '禁行', x + 2, y - map.stepHeight + 6, 0xf5ba9c, 9)
          if (!cell.supportsBuilding) label(world, '软土', x + 2, y - map.stepHeight + 6, 0xf5ba9c, 9)
          if (level === 0) label(world, `${column}`, x + 12, y + 26, 0x64818a, 9)
        }
      }
      for (const structure of s.network.structures) {
        const points = connectionPoints(map, structure.kind, structure.from, structure.to)
        stroke(world, points, 0x172d32, 11)
        stroke(world, points, structure.kind === 'stairs' ? 0xe0ad6c : 0x91ccc3, 5)
        const a = worldPoint(map, structure.from), b = worldPoint(map, structure.to)
        label(world, structure.kind === 'stairs' ? '楼梯 · 禁车辆' : '斜坡 · 车辆可用', structure.kind === 'stairs' ? a.x - 65 : (a.x + b.x) / 2 - 10, Math.min(a.y, b.y) + (structure.kind === 'stairs' ? -24 : 12), structure.kind === 'stairs' ? 0xe0bc88 : 0x9bd9cc, 9)
      }
      for (const { building, definition, bounds } of sceneBuildings(s)) {
        const p = worldPoint(map, building.anchor)
        const x = p.x - map.cellWidth / 2 + 4, w = definition.width * map.cellWidth - 8, h = definition.visual.height
        const g = new Graphics().roundRect(x, p.y - h, w, h - 3, 5).fill(definition.color).stroke({ color: definition.accentColor, width: 1.5 })
        g.alpha = building.status === 'constructing' ? 0.65 : 0.93
        world.addChild(g)
        world.addChild(new Graphics().poly([x - 4, p.y - h + 5, x + w / 2, p.y - h - 14, x + w + 4, p.y - h + 5]).fill(definition.accentColor))
        for (let i = 0; i < definition.width; i++) world.addChild(new Graphics().rect(x + 10 + i * map.cellWidth, p.y - 43, 12, 18).fill(0xe8f5da))
        if (building.status === 'constructing') {
          for (let i = 0; i < 3; i++) stroke(world, [{ x: x + i * w / 2, y: p.y }, { x: x + i * w / 2, y: bounds.y }], 0xffdda0, 2, 0.6)
          const progress = getProgress(building.startedAt, building.buildTimeMs, s.now)
          world.addChild(new Graphics().rect(x, p.y - 8, w, 5).fill(0x172d32).rect(x, p.y - 8, w * progress, 5).fill(0xffd788))
          label(world, `施工 ${Math.round(progress * 100)}%`, x, p.y - h - 33, 0xffdda0, 10)
        }
      }
      s.lines.forEach((line, index) => {
        for (const segment of lineSegments(s, line)) {
          stroke(world, segment.points, 0x0a252c, 10, 0.8)
          stroke(world, segment.points, index % 2 ? 0xf1bf7b : 0x6fe7c0, line.status === 'active' ? 4 : 2, 0.95)
        }
      })
      for (const site of s.workplaces) {
        const p = worldPoint(map, site.position)
        const marker = new Graphics().poly([p.x, p.y - 25, p.x + 9, p.y - 16, p.x, p.y - 7, p.x - 9, p.y - 16]).fill(site.available ? 0xb8dc93 : 0xc1a782)
        marker.alpha = occludedAlpha(s, site.position)
        world.addChild(marker)
        label(world, site.name, p.x - 18, p.y - 43, 0xd1e5c1, 10)
      }
      for (const worker of s.workers) {
        const p = worldPoint(map, worker.position), g = new Graphics()
        const color = worker.reason ? 0xef927f : worker.agent === 'vehicle' ? 0xf0c273 : worker.agent === 'livestock' ? 0xd5c0a4 : 0xa2dcd8
        if (worker.agent === 'person') g.circle(p.x, p.y - 22, 5).fill(color).roundRect(p.x - 5, p.y - 16, 10, 13, 3).fill(color)
        else if (worker.agent === 'livestock') g.ellipse(p.x, p.y - 12, 12, 7).fill(color).circle(p.x + 11, p.y - 18, 5).fill(color).rect(p.x - 8, p.y - 8, 3, 8).fill(color).rect(p.x + 5, p.y - 8, 3, 8).fill(color).moveTo(p.x + 8, p.y - 21).lineTo(p.x + 6, p.y - 28).lineTo(p.x + 13, p.y - 23).stroke({ color, width: 2 })
        else g.roundRect(p.x - 14, p.y - 22, 27, 16, 3).fill(color).rect(p.x + 4, p.y - 28, 9, 12).fill(color).circle(p.x - 8, p.y - 4, 4).fill(0x152831).circle(p.x + 8, p.y - 4, 4).fill(0x152831)
        if (worker.carrying) g.rect(p.x - 4, p.y - 34, 8, 8).fill(0xffdf7d)
        g.alpha = occludedAlpha(s, worker.position)
        world.addChild(g)
        label(world, `${worker.name}${worker.reason ? ' !' : ''}`, p.x - 10, p.y + 5, color, 9)
      }
      const placement = s.placement
      const anchor = placement.mode === 'pending' ? placement.candidate?.anchor : placement.mode === 'preview' ? placement.pointerCell : null
      const typeId = placement.mode === 'pending' ? placement.candidate?.typeId : placement.selectedTypeId
      const evaluation = placement.mode === 'pending' ? placement.candidateEvaluation : placement.evaluation
      if (anchor && typeId) {
        const tool = getBuildingDefinition(typeId), p = worldPoint(map, anchor), x = p.x - map.cellWidth / 2
        const color = evaluation?.valid ? 0x7de3ad : 0xf18d86
        const previewHeight = tool.kind === 'building' ? tool.visual.height : map.stepHeight
        world.addChild(new Graphics().rect(x + 2, p.y - previewHeight, tool.width * map.cellWidth - 4, previewHeight).fill({ color, alpha: 0.12 }).stroke({ color, width: 1, alpha: 0.5 }))
        for (const cell of evaluation?.cells ?? []) {
          const bounds = cellBounds(map, cell)
          world.addChild(new Graphics().rect(bounds.x + 2, bounds.y + 2, bounds.width - 4, bounds.height - 4).fill({ color, alpha: 0.35 }).stroke({ color, width: 2 }))
        }
        if (tool.kind !== 'building') stroke(world, connectionPoints(map, tool.kind, anchor, { column: anchor.column + tool.width - 1, level: anchor.level + 1 }), color, 3, 0.8)
      }
    }
    drawRef.current = draw
    const resize = () => {
      if (disposed || !initialized || !host.clientWidth || !host.clientHeight) return
      app.renderer.resize(host.clientWidth, host.clientHeight)
      layout = terraceLayout(snapshotRef.current.map, host.clientWidth - 24, host.clientHeight - 24)
      layout.offsetX += 12; layout.offsetY += 12
      world.position.set(layout.offsetX, layout.offsetY); world.scale.set(layout.scale)
      Object.assign(host.dataset, { scale: `${layout.scale}`, offsetX: `${layout.offsetX}`, offsetY: `${layout.offsetY}`, cellWidth: `${snapshotRef.current.map.cellWidth}`, stepHeight: `${snapshotRef.current.map.stepHeight}`, levels: `${snapshotRef.current.map.levels}`, skyHeight: `${SKY_HEIGHT}` })
      onLayout(layout); draw()
    }
    const pointer = (event: PointerEvent) => {
      if (!layout) return
      const rect = host.getBoundingClientRect()
      store.movePointer(fromViewport(snapshotRef.current.map, layout, { x: event.clientX - rect.left, y: event.clientY - rect.top }))
    }
    const down = (event: PointerEvent) => { if (event.button === 0) { pointer(event); store.clickMap() } }
    const leave = () => store.movePointer(null)
    void (async () => {
      try {
        await app.init({ background: 0x10212b, antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true })
        initialized = true
        if (disposed) { app.destroy(true, { children: true }); return }
        host.appendChild(app.canvas); app.canvas.className = 'pixi-canvas'
        app.stage.addChild(world)
        app.canvas.addEventListener('pointermove', pointer); app.canvas.addEventListener('pointerdown', down); app.canvas.addEventListener('pointerleave', leave)
        observer = new ResizeObserver(resize); observer.observe(host)
        app.ticker.add(() => store.tick())
        resize()
      } catch { if (!disposed) host.dataset.error = 'pixi-init-failed' }
    })()
    return () => {
      disposed = true; observer?.disconnect(); drawRef.current = null
      if (initialized) {
        app.canvas.removeEventListener('pointermove', pointer); app.canvas.removeEventListener('pointerdown', down); app.canvas.removeEventListener('pointerleave', leave)
        app.ticker.stop(); app.destroy(true, { children: true })
      }
    }
  }, [store, onLayout])

  useEffect(() => { drawRef.current?.() }, [snapshot])
  const evaluation = snapshot.placement.mode === 'pending' ? snapshot.placement.candidateEvaluation : snapshot.placement.evaluation
  return <div ref={hostRef} className="pixi-host" data-testid="map-stage" aria-label="侧视台阶建造地图"
    data-preview-cells={evaluation?.cells.map(coordKey).join(';') ?? ''} data-preview-valid={evaluation?.valid ?? ''}
    data-route-edges={snapshot.lines.flatMap(line => lineSegments(snapshot, line).map(s => s.edgeId)).join(';')} />
}

export function candidateButtonPosition(snapshot: GameSnapshot, layout: TerraceLayout) {
  const candidate = snapshot.placement.candidate
  if (!candidate) return null
  const point = toViewport(snapshot.map, layout, candidate.anchor)
  const tool = getBuildingDefinition(candidate.typeId)
  return { left: Math.max(8, Math.min(layout.width * layout.scale + layout.offsetX - 112, point.x + (tool.width - 1) * snapshot.map.cellWidth * layout.scale / 2 - 54)),
    top: Math.max(8, Math.min(layout.height * layout.scale + layout.offsetY - 52, point.y + 14)) }
}
export function placementStatus(snapshot: GameSnapshot): string {
  const evaluation = snapshot.placement.mode === 'pending' ? snapshot.placement.candidateEvaluation : snapshot.placement.evaluation
  return evaluation && !evaluation.valid ? placementMessage(evaluation.reason) : ''
}
