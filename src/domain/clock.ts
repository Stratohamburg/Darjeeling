export type Clock = () => number

export const systemClock: Clock = () => Date.now()

export function getProgress(startedAt: number, buildTimeMs: number, now: number): number {
  if (buildTimeMs <= 0) return 1
  return Math.max(0, Math.min(1, (now - startedAt) / buildTimeMs))
}
