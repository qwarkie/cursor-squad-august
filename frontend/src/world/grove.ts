import { SPRING_Y, MOUTH_Y } from '../engine'
import { trunkX, WORLD_H, WORLD_W } from './path'
import { RANK_ART_W, trunkWidthAt, tributaryEnd, type TrunkGeometry } from './geometry'

/**
 * Where foliage stands on the open field.
 *
 * Pure geometry in art-pixels: a fixed lattice, filtered against everything
 * already on the board. No `Math.random`, no `Date`, no viewport — the same
 * budget produces the same grove on every load, which is FR-015 and what
 * `walk_demo.py` fingerprints as sprite rectangles across two loads.
 *
 * Viewport is deliberately not an input. Scale is applied at the render site,
 * so a 320px screen and a 390px screen place the same trees in the same art
 * cells and differ only in how many CSS pixels each cell is worth.
 */

export type Foliage = 'tree' | 'bush'

export interface GroveSpot {
  /** Top-left of the sprite, in art-pixels. */
  x: number
  y: number
  kind: Foliage
}

export interface GroveInput extends TrunkGeometry {
  tributaries: readonly { atY: number; side: 'left' | 'right' }[]
}

/** art-bible.md §4 sizes. A spot is rejected on the box, not on a centre point. */
const SIZE: Record<Foliage, { w: number; h: number }> = {
  tree: { w: 7, h: 9 },
  bush: { w: 5, h: 4 },
}

/**
 * Lattice pitch, and an odd-row stagger so the field does not read as graph
 * paper — the failure mode a repeating gradient produced when it was tried in
 * chrome. Coprime-ish pitches keep the stagger from re-aligning into columns.
 */
const STEP_X = 13
const STEP_Y = 11
const ROW_STAGGER = 6

/** Grass left between a trunk bank and the nearest foliage pixel. */
const BANK_CLEARANCE = 4

/** Grass left around a village rank and the stream feeding it. */
const VILLAGE_PAD = 3

/** The spring and the mouth are pools, wider than the trunk they belong to. */
const POOL_RX = 20
const POOL_RY = 11

const clearOfPools = (cx: number, cy: number): boolean =>
  [SPRING_Y, MOUTH_Y].every((py) => {
    const dx = (cx - trunkX(py)) / POOL_RX
    const dy = (cy - py) / POOL_RY
    return dx * dx + dy * dy >= 1
  })

/**
 * The trunk meanders, so a box is tested against the centre line at **every
 * row it occupies** rather than at its anchor. Testing one row lets a tall
 * sprite lean into the water where the river bends away from its top edge.
 */
function clearOfTrunk(model: GroveInput, x: number, y: number, w: number, h: number): boolean {
  const left = x
  const right = x + w
  for (let row = y; row < y + h; row++) {
    const bank = trunkWidthAt(model, row) / 2 + BANK_CLEARANCE
    const centre = trunkX(row)
    if (right > centre - bank && left < centre + bank) return false
  }
  return true
}

/**
 * A tributary occupies more than its own line: the stream runs out and down
 * from the branch, and the village stands at the end of it. Both are kept
 * clear, as one box spanning bank to village on that side.
 */
function clearOfTributaries(model: GroveInput, x: number, y: number, w: number, h: number): boolean {
  return model.tributaries.every((trib) => {
    const end = tributaryEnd(trib.atY, trib.side, trunkWidthAt(model, trib.atY))
    const near = trunkX(trib.atY)
    const outer = end.x + (trib.side === 'right' ? RANK_ART_W / 2 : -RANK_ART_W / 2)
    const bandL = Math.min(near, outer) - VILLAGE_PAD
    const bandR = Math.max(near, outer) + VILLAGE_PAD
    // The keep-out is the union of two things, not just the stream: the
    // corridor running down from the branch, and the village box centred on
    // its own anchor. The village's top edge sits above the branch line when
    // the drop is shorter than half a rank, so taking the branch line alone
    // leaves a sliver of village uncovered.
    const half = RANK_ART_W / 2
    const bandT = Math.min(trib.atY, end.y - half) - VILLAGE_PAD
    const bandB = Math.max(trib.atY, end.y + half) + VILLAGE_PAD
    return x + w <= bandL || x >= bandR || y + h <= bandT || y >= bandB
  })
}

/** A window onto the meadow, in absolute art-pixels. May be negative. */
export interface GroveRegion {
  x0: number
  y0: number
  w: number
  h: number
}

/** Positive modulo — `-1 % 2` is `-1` in JS, and the lattice runs negative. */
const mod = (n: number, m: number): number => ((n % m) + m) % m

/**
 * Foliage across a window of the meadow, in absolute art-pixel coordinates.
 *
 * The lattice is anchored to the world origin and extends in every direction,
 * including negative, so a spot's position and species depend only on which
 * lattice cell it is — never on the window that asked for it. That is the
 * property that makes the field seamless: widen the window and trees appear at
 * the edges, but no tree already on screen moves or changes species.
 *
 * The keep-outs are unchanged. Outside the river's own 96 x `worldH` core they
 * are trivially satisfied — there is no trunk out there to clear — so the open
 * meadow fills up freely.
 *
 * The one rule that needed care: the old 1px inset from the world's edge is
 * evaluated against the ABSOLUTE core, not against the window. Window-relative
 * it would move as you pan, which is precisely the seam this is meant to
 * remove. Inside the core the output is byte-identical to before, which the
 * certified 390x844 baseline would catch if it were not.
 *
 * Region is a parameter rather than an import so this module stays free of
 * `World.tsx` and therefore of React — it runs in Node, which is the whole
 * reason the placement is testable at all.
 */
export function grove(model: GroveInput, region: GroveRegion | number): GroveSpot[] {
  // `grove(model, worldH)` still means the river's own world, so the callers
  // that only ever wanted that do not have to say it twice.
  const { x0, y0, w: rw, h: rh } =
    typeof region === 'number'
      ? { x0: 0, y0: 0, w: WORLD_W, h: region }
      : region
  const coreH = typeof region === 'number' ? region : WORLD_H

  const spots: GroveSpot[] = []

  const firstRow = Math.floor(y0 / STEP_Y) - 1
  const lastRow = Math.ceil((y0 + rh) / STEP_Y) + 1

  for (let row = firstRow; row <= lastRow; row++) {
    const y = STEP_Y * (row + 1)
    if (y < y0 || y >= y0 + rh) continue

    const base = mod(row, 2) === 0 ? 4 : 4 + ROW_STAGGER
    const firstK = Math.floor((x0 - base) / STEP_X)
    const lastK = Math.ceil((x0 + rw - base) / STEP_X)

    for (let k = firstK; k <= lastK; k++) {
      const x = base + k * STEP_X
      if (x < x0 || x >= x0 + rw) continue

      // Alternating kind is a function of the cell, not of what got accepted
      // before it, so rejecting one spot never shifts the species of another.
      const kind: Foliage = mod(row + Math.floor(x / STEP_X), 3) === 0 ? 'bush' : 'tree'
      const { w, h } = SIZE[kind]

      // Inset from the river's own world edge, absolutely. A spot fully
      // outside the core has no edge to be clipped by and is left alone.
      const insideCoreX = x + w > 0 && x < WORLD_W
      const insideCoreY = y + h > 0 && y < coreH
      if (insideCoreX && insideCoreY) {
        if (x < 1 || x + w > WORLD_W - 1) continue
        if (y < 1 || y + h > coreH - 1) continue
      }

      if (!clearOfPools(x + w / 2, y + h / 2)) continue
      if (!clearOfTrunk(model, x, y, w, h)) continue
      if (!clearOfTributaries(model, x, y, w, h)) continue

      spots.push({ x, y, kind })
    }
  }

  return spots
}
