import { useCallback, useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { BUILDINGS, STRUCTURE_TOOLS, getBuildingDefinition } from './domain/buildings'
import { agentLabel, type AgentKind } from './domain/agents'
import { getProgress } from './domain/clock'
import { GameStore } from './domain/gameStore'
import type { TerraceLayout } from './domain/terraceLayout'
import { assignmentCount, blockLabel, taskLabel } from './domain/workforce'
import { candidateButtonPosition, PixiMap, placementStatus } from './ui/PixiMap'
import './styles.css'

const store = new GameStore()
const lineLabels = { ready: '待分配', active: '运行中', blocked: '阻塞', 'needs-recalculation': '需要重算' }

export function App() {
  const s = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const [layout, setLayout] = useState<TerraceLayout | null>(null)
  const updateLayout = useCallback((next: TerraceLayout) => setLayout(next), [])
  const [tab, setTab] = useState('build')
  const [source, setSource] = useState('farm'), [destination, setDestination] = useState('depot')
  const [agent, setAgent] = useState<AgentKind>('person')
  const [column, setColumn] = useState(10), [level, setLevel] = useState(1)
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); store.escape() } }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
  const p = s.placement
  const selected = p.selectedTypeId ? getBuildingDefinition(p.selectedTypeId) : null
  const controls = layout && p.mode === 'pending' ? candidateButtonPosition(s, layout) : null
  const status = placementStatus(s)
  const siteName = (id: string) => s.workplaces.find(w => w.id === id)?.name ?? '节点不存在'

  return <main className="app-shell">
    <section className="map-panel">
      <header className="map-header">
        <div><span className="eyebrow">DARJEELING · HILLSIDE WORKS</span><h1>沿着山坡，建起一座小镇</h1><p>让每一级台阶，都有通往生活的路。</p></div>
        <span className="edition">FOUNDATION<br /><strong>01 / 山地聚落</strong></span>
      </header>
      <div className="map-meta"><span><i />侧视台阶世界</span><span>{s.map.columns} 列 / {s.map.levels} 层</span><span data-testid="building-count">{s.buildings.length} 个建筑</span><span>{s.lines.filter(l => l.status === 'active').length} 条运行线路</span></div>
      <div className="map-frame" data-testid="map-frame">
        <PixiMap store={store} snapshot={s} onLayout={updateLayout} />
        <div className="map-caption"><span>THE HILLS ARE CONNECTED BY YOUR CHOICES</span><strong>野路通行 · 楼梯步行 · 斜坡行车</strong></div>
        {controls && p.candidate && <div className="candidate-controls" style={controls} data-testid="candidate-controls" onPointerDown={e => e.stopPropagation()}>
          <button className="control-button cancel" aria-label="取消放置" onClick={() => store.cancelCandidate()}>×</button>
          <button className="control-button confirm" aria-label="确认建造" onClick={() => store.confirmCandidate()}>✓</button>
        </div>}
        <div className="map-legend" aria-live="polite"><span><i className="swatch valid" />可放置</span><span><i className="swatch invalid" />受限 / 空洞</span><span><i className="swatch line" />运输路线</span>{status && <strong>{status}</strong>}</div>
      </div>
      <footer className="map-footer"><span>{selected ? `正在摆放：${selected.name} · 横向 ${selected.width} 格` : '从右侧选择建筑，或规划一条山地运输线'}</span><span><kbd>ESC</kbd> 返回 / 退出</span></footer>
      <div className="scene-notes"><div><span>01 / TERRAIN</span><p>空洞没有支撑；建筑占地只沿当前台阶展开。</p></div><div><span>02 / PEOPLE & ROADS</span><p>人和牲畜可以攀爬、走楼梯；车辆依靠斜坡。</p></div><div><span>03 / LOGISTICS</span><p>主动分配岗位，沿真实道路运送，断路后停止并重算。</p></div></div>
    </section>
    <aside className="sidebar" onPointerDown={e => e.stopPropagation()}>
      <div className="sidebar-intro"><span className="eyebrow">YOUR SETTLEMENT</span><h2>聚落工作台</h2><p>从一处落脚地，到彼此相连的小镇。</p></div>
      <nav className="tabs" aria-label="工作台面板">{[['build', '建造'], ['workers', '人力分配'], ['lines', '运输线'], ['roads', '道路']].map(([key, name]) => <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{name}</button>)}</nav>
      <div className="sidebar-content">
        {tab === 'build' && <>
          <div className="section-title"><h3>选择建筑</h3><span>单层横向占地</span></div>
          <div className="catalog" aria-label="建筑列表">{[...BUILDINGS, ...STRUCTURE_TOOLS].map(tool => <button className={`building-card ${p.selectedTypeId === tool.id ? 'selected' : ''}`} key={tool.id} data-testid={`building-card-${tool.id}`} aria-pressed={p.selectedTypeId === tool.id} onClick={() => store.selectBuilding(tool.id)}>
            <span className="building-icon" style={{ '--building-color': `#${tool.color.toString(16).padStart(6, '0')}` } as CSSProperties}>{tool.kind === 'stairs' ? '▤' : tool.kind === 'ramp' ? '◿' : '⌂'}</span>
            <span className="building-copy"><strong>{tool.name}<small>{tool.width} 格</small></strong><span>{tool.description}</span></span><span className="card-arrow">↗</span>
          </button>)}</div>
          <div className="sidebar-status" aria-live="polite"><strong>{p.mode === 'pending' ? '等待确认' : p.mode === 'preview' ? '预览中' : '准备就绪'}</strong><p>{p.mode === 'pending' ? '位置已固定。确认后占地，建筑开始施工。' : '移动鼠标查看横向占地，点击后用 ✓ / × 确认或返回。'}</p></div>
          <div className="section-title queue-heading"><h3>施工队列</h3><span>独立施工 · 3 秒</span></div>
          {!s.buildings.length && <p className="empty-queue">还没有开始施工</p>}
          {s.buildings.map(b => <div className="queue-item" key={b.id} data-testid={`queue-${b.id}`}><div className="queue-title"><strong>{getBuildingDefinition(b.typeId).name}</strong><span>{b.status === 'completed' ? '已完成' : `施工 ${Math.round(getProgress(b.startedAt, b.buildTimeMs, s.now) * 100)}%`}</span></div><div className="queue-bar"><span style={{ width: `${getProgress(b.startedAt, b.buildTimeMs, s.now) * 100}%` }} /></div></div>)}
        </>}
        {tab === 'workers' && <>
          <div className="section-title"><h3>主动分配</h3><span>一个主体，一个岗位</span></div>
          {s.workers.map(worker => <article className="worker-card" key={worker.id} data-testid={`worker-${worker.id}`} data-position={`${worker.position.column},${worker.position.level}`}>
            <div className="row"><strong>{worker.name} <small>{agentLabel[worker.agent]}</small></strong><span className={worker.reason ? 'badge blocked' : 'badge'} data-testid={`task-${worker.id}`}>{taskLabel[worker.task]}</span></div>
            <select aria-label={`${worker.name}分配`} value={worker.assignment ? `${worker.assignment.kind}:${worker.assignment.id}` : ''} onChange={e => {
              const [kind, id] = e.target.value.split(':'); store.assign(worker.id, id ? { kind: kind as 'workplace' | 'line', id } : null)
            }}><option value="">未分配</option><optgroup label="工作地点">{s.workplaces.map(w => <option key={w.id} value={`workplace:${w.id}`}>{w.name} · {assignmentCount(s.workers, { kind: 'workplace', id: w.id })}/{w.capacity}</option>)}</optgroup><optgroup label="运输线">{s.lines.map((line, i) => <option key={line.id} value={`line:${line.id}`}>线路 {i + 1} · {agentLabel[line.agent]}</option>)}</optgroup></select>
            <p className="worker-detail">位置 ({worker.position.column}, {worker.position.level}) · {worker.agent === 'vehicle' ? '水平道路 / 斜坡' : '可攀爬 / 楼梯 / 斜坡'}</p>
            {worker.reason && <p className="block-reason">{blockLabel[worker.reason]}</p>}
          </article>)}
          <div className="section-title queue-heading"><h3>工作地点岗位</h3><span>可用 / 等待</span></div>
          {s.workplaces.map(w => <div className="site-row" key={w.id}><div><strong>{w.name}</strong><small>岗位 {assignmentCount(s.workers, { kind: 'workplace', id: w.id })}/{w.capacity}</small></div><button className="subtle" aria-label={`${w.name}${w.available ? '暂停工作' : '恢复工作'}`} onClick={() => store.setWorkAvailable(w.id, !w.available)}>{w.available ? '暂停' : '恢复'}</button></div>)}
          <button className="action secondary" onClick={() => store.recalculateRoutes()}>重算全部路线</button>
        </>}
        {tab === 'lines' && <>
          <div className="section-title"><h3>点对点运输</h3><span>自动寻路</span></div>
          <form className="line-form" onSubmit={e => { e.preventDefault(); store.createTransportLine(source, destination, agent) }}>
            <label>起点<select aria-label="运输起点" value={source} onChange={e => setSource(e.target.value)}>{s.workplaces.filter(w => w.transportNode).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
            <span className="form-arrow">↓</span>
            <label>终点<select aria-label="运输终点" value={destination} onChange={e => setDestination(e.target.value)}>{s.workplaces.filter(w => w.transportNode).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
            <label>搬运主体<select aria-label="搬运主体" value={agent} onChange={e => setAgent(e.target.value as AgentKind)}>{Object.entries(agentLabel).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
            <button className="action" type="submit">创建运输线 ↗</button>
          </form>
          {s.lines.map((line, index) => <article className="line-card" data-testid={`transport-${line.id}`} key={line.id}><div className="row"><strong>线路 {String(index + 1).padStart(2, '0')}</strong><span className={`badge ${line.reason ? 'blocked' : ''}`} data-testid={`line-status-${line.id}`}>{lineLabels[line.status]}</span></div><p>{siteName(line.sourceId)} → {siteName(line.destinationId)}</p><small>{agentLabel[line.agent]} · 岗位 {assignmentCount(s.workers, { kind: 'line', id: line.id })}/{line.capacity} · 成本 {line.route?.cost ?? '—'}</small>
            {line.reason && <p className="block-reason">{line.reason === 'route-invalidated' ? '道路已变化，请重新计算' : line.reason === 'unreachable' ? '没有符合主体能力的完整路线' : '端点不可行走'}</p>}
            {line.route && <details><summary>实际经过路线 · {line.route.edges.length} 段</summary><ol>{line.route.edges.map(edge => <li key={edge.id}>{({ horizontal: '水平道路', climb: '野路攀爬', stairs: '楼梯', ramp: '斜坡' })[edge.kind]} ({edge.from.column},{edge.from.level}) ↔ ({edge.to.column},{edge.to.level})</li>)}</ol></details>}
          </article>)}
          <button className="action secondary" onClick={() => store.recalculateRoutes()}>重算全部路线</button><p className="help-text">创建后到「人力分配」选择同类搬运主体。线路只包含一个起点和一个终点。</p>
        </>}
        {tab === 'roads' && <>
          <div className="section-title"><h3>道路维护</h3><span>调整后需重算</span></div>
          <div className="coordinate-inputs"><label>列 column<input type="number" min="0" max={s.map.columns - 1} aria-label="道路列" value={column} onChange={e => setColumn(Number(e.target.value))} /></label><label>层 level<input type="number" min="0" max={s.map.levels - 1} aria-label="道路层" value={level} onChange={e => setLevel(Number(e.target.value))} /></label></div>
          <div className="road-actions">{[['wild', '野路'], ['stone', '石板路'], ['concrete', '水泥路'], [null, '移除底边']].map(([type, name]) => <button key={name} className="subtle" onClick={() => store.changeRoad({ column, level }, type as 'wild' | 'stone' | 'concrete' | null)}>{name}</button>)}</div>
          <div className="section-title queue-heading"><h3>高度连接</h3><span>每段仅跨一层</span></div>
          {s.network.structures.map(structure => <div className="structure-row" key={structure.id}><div><strong>{structure.kind === 'stairs' ? '楼梯' : `${structure.footprint.length} 格斜坡`}</strong><small>({structure.from.column},{structure.from.level}) → ({structure.to.column},{structure.to.level})</small><small>{structure.kind === 'stairs' ? '人 / 牲畜 · 禁止车辆' : '人 / 牲畜 / 车辆'}</small></div><button className="subtle danger" data-testid={`remove-${structure.id}`} aria-label={`移除${structure.kind === 'stairs' ? '楼梯' : '斜坡'} ${structure.from.column},${structure.from.level}`} onClick={() => store.deleteStructure(structure.id)}>移除</button></div>)}
          <button className="action secondary" onClick={() => store.recalculateRoutes()}>重算全部路线</button><p className="help-text">新楼梯和斜坡从「建造」面板放置，向右上方连接相邻台阶。失效时主体停在当前位置。</p>
        </>}
        {s.message && <div className="operation-message" role="status">{s.message}</div>}
      </div>
      <div className="sidebar-foot"><span className="status-dot" />本地原型 · 刷新重置</div>
    </aside>
  </main>
}
