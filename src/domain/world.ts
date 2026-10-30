export type Coord = { column: number; level: number }
export type Ground = { state: 'ground'; material: 'soil' | 'rock'; supportsBuilding: boolean; walkable: boolean }
export type TerrainCell = Ground | { state: 'air' }
export type WorldConfig = { columns: number; levels: number; cellWidth: number; stepHeight: number }
export type TerracedWorld = WorldConfig & { cells: Readonly<Record<string, TerrainCell>> }

export const coordKey = (p: Coord): string => `${p.column},${p.level}`
export const sameCoord = (a: Coord, b: Coord): boolean => a.column === b.column && a.level === b.level
export const solidGround = (options: Partial<Omit<Ground, 'state'>> = {}): Ground => ({
  state: 'ground', material: 'soil', supportsBuilding: true, walkable: true, ...options,
})

export function insideWorld(world: WorldConfig, p: Coord): boolean {
  return Number.isInteger(p.column) && Number.isInteger(p.level)
    && p.column >= 0 && p.column < world.columns && p.level >= 0 && p.level < world.levels
}

export function terrainAt(world: TerracedWorld, p: Coord): TerrainCell {
  return insideWorld(world, p) ? world.cells[coordKey(p)] ?? { state: 'air' } : { state: 'air' }
}

export function supportsBuilding(world: TerracedWorld, p: Coord): boolean {
  const cell = terrainAt(world, p)
  return cell.state === 'ground' && cell.supportsBuilding
}

export function isWalkable(world: TerracedWorld, p: Coord): boolean {
  const cell = terrainAt(world, p)
  return cell.state === 'ground' && cell.walkable
}

export function createWorld(config: WorldConfig, fill: (p: Coord) => TerrainCell = () => ({ state: 'air' })): TerracedWorld {
  if (!Number.isInteger(config.columns) || !Number.isInteger(config.levels) || config.columns < 1 || config.levels < 1
    || !Number.isFinite(config.stepHeight) || !Number.isFinite(config.cellWidth) || config.stepHeight <= 0 || config.cellWidth <= 0) {
    throw new Error('Invalid world configuration')
  }
  if (config.cellWidth !== config.stepHeight) throw new Error('World cells must be square: cellWidth must equal stepHeight')
  const cells: Record<string, TerrainCell> = {}
  for (let level = 0; level < config.levels; level++) {
    for (let column = 0; column < config.columns; column++) {
      const p = { column, level }
      cells[coordKey(p)] = fill(p)
    }
  }
  return { ...config, cells }
}

export function withTerrain(world: TerracedWorld, p: Coord, cell: TerrainCell): TerracedWorld {
  if (!insideWorld(world, p)) throw new Error('Terrain coordinate outside world')
  return { ...world, cells: { ...world.cells, [coordKey(p)]: cell } }
}
