import type { Budget, Category } from '../types'

/**
 * Art-pixel constants for the 96 × 128 world grid (art-bible.md §1).
 *
 * `TRUNK_MAX` is a width the shore has to pay for. At 24 the trunk was a
 * quarter of the world, and once the meander swung it 6 further off centre
 * there was no room left between the bank and the world's edge for a village
 * *and* the stream feeding it — the branch came out as a two-pixel stub and
 * the one thing the world exists to show, money leaving the river, stopped
 * being visible (world/geometry.ts). 16 is still by far the widest object in
 * the world; the house it dwarfs is 9.
 */
export const TRUNK_MAX = 16
export const MIN_WIDTH = 2
export const SPRING_Y = 16
/** Where the mouth sits on a river with nothing taken out of it. A branched river's mouth is computed; see `mouthFor`. */
export const MOUTH_Y = 104

/**
 * Distance between branch points, in art-pixels — fixed, not divided.
 *
 * It used to be a *floor* under an even division of a fixed 88-px span, which
 * meant every category added squeezed all of them closer together: five fitted
 * at 14.7 apart, six collapsed to the 14 floor, and past that the villages
 * piled up around the mouth pool because the river had nowhere left to put
 * them. The span was the constraint and it did not need to be: ADR-0002 rules
 * that `WORLD_H` may follow the Budget, and `World.tsx`'s `drawnDepth` already
 * lets the camera travel to whatever the model draws.
 *
 * So the spacing is now constant and the river lengthens instead. A village is
 * up to ~30 art-px tall and neighbours alternate banks, so same-side
 * neighbours sit 2 x BRANCH_GAP = 40 apart — clear of each other at the tallest
 * village and the deepest drop.
 */
export const BRANCH_GAP = 20

/**
 * Clearance between the last branch point and the mouth pool.
 *
 * The last village hangs `drop` below its branch and reaches about half its
 * own height below that. Without this the pool was drawn level with it and the
 * two crowded — which is what "the towns bunch up at the bottom lake" was.
 * Covers the deepest `DROP_MAX` plus half the tallest village.
 */
export const MOUTH_TAIL = 34

/**
 * How far out a stream reaches, and how far it falls, before it arrives at its
 * village — a range now, not one number for every branch.
 *
 * Every branch used to get exactly 10 and 10. Identical run and identical drop
 * make identical geometry, and `water.ts` derives its curve amplitude from the
 * branch's own length, so the curves came out near-identical too: six copies of
 * one stream leaving the river at six heights.
 *
 * Drop is the wider of the two ranges on purpose. Horizontal room is scarce and
 * unevenly distributed — ADR-0002 measured 0.5 to 14.5 art-px of it, with the
 * least exactly where a branch is widest — while vertical room costs nothing
 * now that the river grows. Varying the fall is what buys visible variety;
 * varying the reach is what stops the arrivals from lining up.
 */
export const REACH_MIN = 7
export const REACH_MAX = 15
export const DROP_MIN = 7
export const DROP_MAX = 18
/** How far the trunk wanders off centre, and the wavelength of that wander — consumed by world/path.ts's xOffset. */
export const MEANDER_A = 6
export const MEANDER_W = 20

export type RiverState = 'empty' | 'surplus' | 'balanced' | 'overspent'

export interface Segment {
  fromY: number
  toY: number
  carried: number
  width: number
}

export interface Tributary {
  categoryId: string
  atY: number
  amount: number
  width: number
  side: 'left' | 'right'
  /** Art-pixels of open water between the bank and the village's near edge. Varies per branch; see REACH_MIN/REACH_MAX. */
  reach: number
  /** Art-pixels the stream falls between its branch point and its village. Varies per branch; see DROP_MIN/DROP_MAX. */
  drop: number
  settlements: number
  residents: number
  reservoir: boolean
}

export interface RiverModel {
  segments: Segment[]
  tributaries: Tributary[]
  remaining: number
  state: RiverState
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Same formula for the trunk and every tributary, so a $X category is exactly as wide as the trunk narrows. */
function widthFor(dollars: number, income: number): number {
  if (!(dollars > 0) || !(income > 0)) return 0
  return clamp(Math.round((TRUNK_MAX * dollars) / income), MIN_WIDTH, TRUNK_MAX)
}

function settlementsFor(category: Category): number {
  if (category.kind === 'savings' || !(category.amount > 0)) return 0
  return clamp(1 + Math.floor(category.amount / 250), 1, 6)
}

function residentsFor(category: Category): number {
  if (category.kind === 'savings' || !(category.amount > 0)) return 0
  return clamp(Math.floor(category.amount / 500), 0, 4)
}

/**
 * FNV-1a over the category id.
 *
 * A branch's shape has to be varied but not arbitrary: the same category must
 * come back identical on the next load, or SC-007 — two loads, one picture —
 * stops holding. `Math.random` is forbidden here for exactly that reason, and a
 * noise dependency was removed from this project once already. Six lines and no
 * state does the job.
 */
function hashOf(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** A stable [0, 1) per (id, salt), so one id yields several independent draws. */
function draw(id: string, salt: string): number {
  return (hashOf(`${salt}#${id}`) % 4096) / 4096
}

/** Picks an integer in [min, max] from the id — same id, same answer, always. */
function vary(id: string, salt: string, min: number, max: number): number {
  return min + Math.round(draw(id, salt) * (max - min))
}

/**
 * Branch points, a constant BRANCH_GAP apart.
 *
 * No division by `n`: the river grows downward instead of the branches
 * compressing. See BRANCH_GAP.
 */
function branchYs(n: number): number[] {
  return Array.from({ length: n }, (_, i) => SPRING_Y + (i + 1) * BRANCH_GAP)
}

/**
 * Where the mouth pool sits.
 *
 * A river with no branches keeps the classic MOUTH_Y so the opening frame is
 * unchanged, and a short budget stays inside the original world box. Past that
 * the pool follows the last branch down, keeping MOUTH_TAIL of clearance so the
 * last village is not standing in it.
 */
function mouthFor(ys: number[]): number {
  if (ys.length === 0) return MOUTH_Y
  return Math.max(MOUTH_Y, ys[ys.length - 1] + MOUTH_TAIL)
}

/**
 * Pure geometry: Budget in, RiverModel out. No I/O, no Date, no Math.random.
 * Contract: specs/001-money-river/contracts/engine.md.
 */
export function budgetToRiver(budget: Budget): RiverModel {
  const income = Number.isFinite(budget?.income) ? budget.income : 0
  const categories = Array.isArray(budget?.categories) ? budget.categories : []

  const amounts = categories.map((c) => (Number.isFinite(c.amount) && c.amount > 0 ? c.amount : 0))
  const remaining = income - amounts.reduce((sum, a) => sum + a, 0)

  const state: RiverState =
    income <= 0 ? 'empty' : remaining > 0 ? 'surplus' : remaining === 0 ? 'balanced' : 'overspent'

  const ys = branchYs(categories.length)
  const mouthY = mouthFor(ys)

  const segments: Segment[] = []
  let boundary = SPRING_Y
  let carried = income
  for (let i = 0; i < categories.length; i++) {
    segments.push({
      fromY: boundary,
      toY: ys[i],
      carried: Math.max(carried, 0),
      width: widthFor(Math.max(carried, 0), income),
    })
    boundary = ys[i]
    carried -= amounts[i]
  }
  segments.push({
    fromY: boundary,
    toY: mouthY,
    carried: Math.max(carried, 0),
    width: widthFor(Math.max(carried, 0), income),
  })

  const tributaries: Tributary[] = categories.map((category, i) => ({
    categoryId: category.id,
    atY: ys[i],
    amount: amounts[i],
    width: widthFor(amounts[i], income),
    side: i % 2 === 0 ? 'right' : 'left',
    reach: vary(category.id, 'reach', REACH_MIN, REACH_MAX),
    drop: vary(category.id, 'drop', DROP_MIN, DROP_MAX),
    settlements: settlementsFor(category),
    residents: residentsFor(category),
    reservoir: category.kind === 'savings',
  }))

  return { segments, tributaries, remaining, state }
}
