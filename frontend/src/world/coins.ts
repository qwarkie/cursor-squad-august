import type { RiverModel } from '../engine'

/**
 * How much money each stretch of the river is carrying, expressed as coins.
 *
 * Density is the data (art-bible.md §5): a thin river must visibly carry fewer
 * coins than a wide one, and the stretch below a branch must carry fewer than
 * the stretch above it. That is the narrowing metaphor stated a second way, in
 * motion rather than in width — so the count is derived from the model, never
 * chosen for looks.
 *
 * Pure and DOM-free so it tests in Node like the rest of the geometry. Nothing
 * here reads the clock or a random source: stagger comes from the index, which
 * is what keeps two loads identical (FR-015, SC-007).
 */

/** Seconds for a coin to travel the whole trunk, spring to mouth (art-bible §5). */
export const TRAVERSE_SECONDS = 3

/** Art-pixels of trunk width per coin. */
const PX_PER_COIN = 4

/** Never more than this on one stretch, however wide — past it they read as a shoal. */
const MAX_PER_SEGMENT = 6

/**
 * Coins carried by a stretch of trunk of the given width.
 *
 * A dry bed carries nothing — `width: 0` is the overspent state, and money that
 * is not there should not be shown flowing. Any live stretch carries at least
 * one, so a small category is still visibly moving money.
 */
export function coinsFor(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 0
  return Math.min(MAX_PER_SEGMENT, Math.max(1, Math.round(width / PX_PER_COIN)))
}

export interface Coin {
  /** Stable across renders — segment index and position within it. */
  key: string
  /** Index into `model.segments`; the world builds that segment's path. */
  segment: number
  /** Seconds. Negative, so the river is already carrying coins on the first frame. */
  delay: number
  /** Seconds for this coin to cross its own stretch. */
  duration: number
}

const round3 = (n: number) => Math.round(n * 1000) / 1000

/**
 * Every coin on the river, in segment order.
 *
 * Each coin crosses only its own stretch, and stretches are timed so the coins
 * move at one speed down the whole river — a fixed 3s per segment would make
 * short stretches look faster and break the illusion of one current.
 */
export function coinPlan(model: Pick<RiverModel, 'segments'> | undefined): Coin[] {
  const segments = model?.segments
  if (!segments || segments.length === 0) return []

  const lengths = segments.map((seg) => Math.max(0, Math.round(seg.toY) - Math.round(seg.fromY)))
  const total = lengths.reduce((sum, n) => sum + n, 0)
  if (total <= 0) return []

  const coins: Coin[] = []
  segments.forEach((seg, index) => {
    const count = coinsFor(seg.width)
    if (count === 0 || lengths[index] === 0) return

    const duration = round3((TRAVERSE_SECONDS * lengths[index]) / total)
    for (let i = 0; i < count; i += 1) {
      coins.push({
        key: `${index}:${i}`,
        segment: index,
        delay: round3(-(i / count) * duration),
        duration,
      })
    }
  })
  return coins
}
