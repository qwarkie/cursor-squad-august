/**
 * Where the buildings of one settlement stand.
 *
 * Before this, they did not stand anywhere — `Settlements.tsx` handed the
 * sprites to a `flex flex-wrap` of fixed width and let the browser lay them
 * out. Three to a row, one uniform gap, every roofline on the same line, every
 * village the same shape as every other. There was no placement algorithm to
 * make organic, because there was no placement algorithm.
 *
 * Pure art-pixels and no React, for the same reason `grove.ts` is: it runs in
 * Node, so the thing worth asserting — that nothing overlaps, that it fits its
 * corridor, that it is identical on every load — is a unit test rather than a
 * screenshot.
 *
 * Determinism is not decoration here. FR-015/SC-007 make the whole picture a
 * pure function of the Budget, and it is what lets `baseline_390` pin the
 * world byte-for-byte. So every offset comes from a hash of the category id
 * and the building's own index: irregular, but the *same* irregular, on every
 * device and every reload, until the category's own data changes.
 */

/** A box in art-pixels. */
export type Size = { w: number; h: number }

export type HamletSpot = {
  /**
   * Stable across re-renders and across data changes that do not remove this
   * building — the id an animation can interpolate between two layouts with.
   */
  key: string
  kind: 'building' | 'resident'
  x: number
  y: number
  w: number
  h: number
}

export type Hamlet = {
  spots: HamletSpot[]
  /** The settlement's own bounding box, which is the thing nothing else knew. */
  w: number
  h: number
}

export type HamletInput = {
  /** The category's id — the only thing the arrangement is keyed on. */
  id: string
  buildings: number
  residents: number
  /** Size of one building sprite; a market is wider than a house. */
  building: Size
  resident: Size
  /**
   * The corridor the settlement must stay inside, in art units.
   *
   * `geometry.ts` owns this number (`RANK_ART_W`) because it also decides how
   * far out a village has to stand to clear the trunk, and `grove.ts` keeps
   * foliage out of the same box. Widening it is a `geometry.ts` decision, not
   * one this file may take on its own — so it is a parameter.
   */
  maxWidth: number
}

/** Horizontal breathing room when a row is short enough to afford any. */
const MAX_GAP = 3
/**
 * Vertical pitch above the tallest possible jitter. Rows may lean +-1, so
 * anything under `h + 3` lets two rows touch — and "buildings must not overlap
 * each other" is the one rule in the brief that a reader can check by eye.
 */
const ROW_CLEARANCE = 3
/** How far a roofline may lean off its row. One pixel reads; two reads broken. */
const LEAN = 1
/** How far a row may slide off centre. */
const STAGGER = 2
/**
 * Every building sprite in the app, by size — art-bible.md §4 and
 * `world/icons.ts`. Sizes rather than art, so this module stays free of the
 * sprite format and of which icon any category chose.
 */
const BUILDING_SIZES: readonly Size[] = [
  { w: 9, h: 9 }, // house, clinic
  { w: 12, h: 9 }, // market
  { w: 10, h: 10 }, // arcade — the tallest
  { w: 8, h: 5 }, // car
]
/** RESIDENT is 5x5; the rank below a village adds its height plus a gap. */
const RESIDENT_H = 5

/**
 * A stable value from an id and an index. Same inputs, same number, forever —
 * `Math.random` would re-place every village on every render and break both
 * FR-015 and any hope of animating between two layouts.
 */
function hash(id: string, salt: number): number {
  let h = 0x811c9dc5 ^ salt
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 0x01000193)
  }
  h = Math.imul(h ^ (h >>> 15), 0x2545f491)
  return (h ^ (h >>> 13)) >>> 0
}

/** `hash` folded into `[0, n)`. */
const pick = (id: string, salt: number, n: number) => (n <= 1 ? 0 : hash(id, salt) % n)

/**
 * How many buildings stand in each row.
 *
 * Rows of unequal length are most of what stops a cluster reading as a grid,
 * and they cost nothing: the count still comes from the amount (FR-007), only
 * its arrangement varies. A trailing row of one is rebalanced away — it reads
 * as a mistake rather than as a hamlet.
 */
export function rowPlan(id: string, count: number, perRow: number): number[] {
  if (count <= 0) return []
  if (perRow <= 1) return Array.from({ length: count }, () => 1)

  // Never taller than a tight packing. Irregularity that costs rows costs
  // vertical space, and vertical space is what the neighbouring category and
  // the lower lake are competing for — a village that sprawls downward is a
  // worse defect than a village that reads as a block.
  const rowCount = Math.ceil(count / perRow)
  const rows = Array.from({ length: rowCount }, (_, i) =>
    Math.floor(count / rowCount) + (i < count % rowCount ? 1 : 0),
  )

  // Within that budget, move one building between two rows so the silhouette
  // is not a rectangle. Only where it is possible: six houses in rows of three
  // have exactly one arrangement, and the lean and the stagger carry it there.
  for (let i = 0; i + 1 < rows.length; i++) {
    const take = pick(id, 101 + i, 2)
    if (take === 1 && rows[i] > 2 && rows[i + 1] + 1 <= perRow) {
      rows[i] -= 1
      rows[i + 1] += 1
    }
  }
  return rows
}

/**
 * Buildings that fit side by side inside the corridor, at least one.
 *
 * `MIN_SLACK` is reserved rather than spent. A row that exactly fills the
 * corridor has nowhere to slide, so every full row lands on the same pixel
 * column as every other full row — six houses in two rows of three came out as
 * the same rectangle the flex-wrap drew, with the rooflines leaning by a pixel.
 * Leaving room to stagger is what makes a second row a different row.
 */
export function perRowFor(building: Size, maxWidth: number): number {
  const w = Math.max(1, building.w)
  const wide = Math.floor(maxWidth / w)
  // Give up a column for stagger room only when the wide row would have none
  // to give. Taking `MIN_SLACK` unconditionally cost a market — 12 art-px in a
  // 27 corridor — its second column, and six markets became a single stack:
  // the repeated-line failure §2 removed, turned ninety degrees.
  return wide > 1 && maxWidth - wide * w < 1 ? wide - 1 : Math.max(1, wide)
}

/**
 * The tallest cluster a given count can produce, over every building sprite in
 * the app.
 *
 * `grove.ts` needs a village's extent to keep foliage out of it and cannot see
 * which icon a category picked — that lives on the Budget, and the placement
 * modules stay free of it. The worst case over all icons is the honest bound:
 * a little generous for a village of cars, exact for a village of arcades, and
 * never smaller than what is actually drawn, which is the direction that
 * matters when the alternative is a tree between the houses.
 */
export function maxHamletHeight(count: number, maxWidth: number): number {
  const n = Math.max(0, Math.floor(count) || 0)
  // Zero buildings is not zero village: the engine floors settlements at one,
  // but a caller that passes none still gets the villagers' rank drawn, and a
  // bound that says nothing is there is exactly the under-report this exists
  // to prevent.
  let tallest = 0
  for (const b of BUILDING_SIZES) {
    const rows = Math.ceil(n / perRowFor(b, maxWidth))
    tallest = Math.max(tallest, rows * (b.h + ROW_CLEARANCE) - ROW_CLEARANCE + 2 * LEAN)
  }
  // Villagers fall below the last row when it has no room beside it.
  return tallest + RESIDENT_H + 2
}

/**
 * The settlement, as boxes.
 *
 * Coordinates are relative to the settlement's own top-left, so the caller
 * places the whole cluster and never a single building — which is what makes
 * the bounding box meaningful to anyone laying out the river around it.
 */
export function hamlet(input: HamletInput): Hamlet {
  const { id, building, resident, maxWidth } = input
  const buildings = Math.max(0, Math.floor(input.buildings) || 0)
  const residents = Math.max(0, Math.floor(input.residents) || 0)

  const perRow = perRowFor(building, maxWidth)
  const rows = rowPlan(id, buildings, perRow)
  const spots: HamletSpot[] = []

  let index = 0
  rows.forEach((n, r) => {
    // Only a row with room to spare gets a gap; three houses in a 27-wide
    // corridor abut, and their irregularity has to come from the lean and the
    // stagger instead.
    const spare = maxWidth - n * building.w
    const gap = n > 1 ? Math.min(MAX_GAP, Math.max(0, Math.floor(spare / (n - 1)))) : 0
    const rowW = n * building.w + (n - 1) * gap
    const slack = maxWidth - rowW
    const drift = slack > 0 ? pick(id, 201 + r, 2 * STAGGER + 1) - STAGGER : 0
    const x0 = Math.min(Math.max(Math.round(slack / 2) + drift, 0), slack)
    const rowTop = r * (building.h + ROW_CLEARANCE) + LEAN

    for (let c = 0; c < n; c++) {
      spots.push({
        key: `${id}-b${index}`,
        kind: 'building',
        x: x0 + c * (building.w + gap),
        y: rowTop + (pick(id, 301 + index, 2 * LEAN + 1) - LEAN),
        w: building.w,
        h: building.h,
      })
      index++
    }
  })

  const bottom = spots.reduce((b, s) => Math.max(b, s.y + s.h), 0)

  if (residents > 0) {
    const gap = 2
    const lastRow = spots.filter((s) => s.kind === 'building' && s.y + s.h >= bottom - 2)
    const rowRight = lastRow.reduce((r, s) => Math.max(r, s.x + s.w), 0)
    const rowTop = lastRow.reduce((t, s) => Math.min(t, s.y), bottom)
    const beside = maxWidth - rowRight - gap
    const rowW = residents * resident.w + (residents - 1) * gap

    // Villagers stand among the houses when the last row leaves room for them,
    // and only fall into a rank of their own when it does not. A row of people
    // under a row of roofs is the same repeated-line failure one sprite over.
    const inRow = beside >= rowW && resident.h <= bottom - rowTop
    const x0 = inRow
      ? rowRight + gap
      : Math.min(Math.max(Math.round((maxWidth - rowW) / 2), 0), Math.max(0, maxWidth - rowW))
    const yBase = inRow ? bottom - resident.h : bottom + 1

    for (let i = 0; i < residents; i++) {
      spots.push({
        key: `${id}-r${i}`,
        kind: 'resident',
        x: x0 + i * (resident.w + gap),
        y: yBase + pick(id, 401 + i, 2) * (inRow ? -1 : 1),
        w: resident.w,
        h: resident.h,
      })
    }
  }

  return {
    spots,
    w: spots.reduce((b, s) => Math.max(b, s.x + s.w), 0),
    h: spots.reduce((b, s) => Math.max(b, s.y + s.h), 0),
  }
}
