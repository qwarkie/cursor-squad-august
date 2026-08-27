import { trunkX, WORLD_W } from './path'

/**
 * A rank of settlements is three icons wide — 3 × 9 art-px (art-bible.md §4),
 * and `icons.test.ts` holds every icon to that width. Settlements.tsx lays the
 * rank out; geometry owns the number, because where a village *stands*
 * depends on how wide it is.
 */
export const RANK_ART_W = 27
const VILLAGE_HALF_W = RANK_ART_W / 2

/**
 * Open water between the bank and the near edge of the village, in art-pixels
 * — the outgoing stream, and the only part of a tributary that ever reaches
 * the screen.
 *
 * That flow is the whole point of a branch: money leaving the river. Two
 * things used to hide it. The reach was measured from the **centre line**, so
 * a full trunk (TRUNK_MAX wide) swallowed half of it; and it was measured to
 * the village's **centre**, so the houses — DOM sprites drawn over the SVG —
 * covered the rest. What survived was a stub about two art-px long. Measured
 * from the bank and to the near edge, the constant below *is* the water you
 * see.
 *
 * T015 landed, and not where this comment expected: the curve lives inside
 * `water.ts`'s column walk, not in `path.ts`, because the walk is what
 * guarantees contiguity and `crispEdges`. `tributaryEnd` was never the thing
 * that needed swapping — it computes where a branch ENDS, and a curved branch
 * ends in the same place a straight one did. Nothing here was provisional
 * after all. (@Glass asked whether this attribution was live; it was stale.)
 */
const STREAM_REACH = 10

/**
 * How far below its branch point a village sits — the stream runs down as well
 * as out.
 *
 * This constant is the ceiling on how steeply a branch can arrive, and it is
 * the reason @Pollen's §1 verdict found branches "bend once, then dead
 * straight". Measured on the seeded month, every branch spends this same 10px
 * over 26-29 columns:
 *
 *     1px of descent every 2.8 columns
 *
 * At whole-art-pixel resolution that is a flat arrival no matter what shape the
 * curve takes — a curve can only redistribute the drop, and concentrating it at
 * the village is a hook rather than a river. Raising it is §5's call, not
 * `water.ts`'s.
 */
const TRIBUTARY_DROP = 10

/** The slice of `RiverModel` the bank offset reads — structural, so `world/` keeps no import on `engine/`. */
export interface TrunkGeometry {
  segments: readonly { fromY: number; toY: number; width: number }[]
}

/**
 * Width of the trunk at height `y`, in art-pixels.
 *
 * A branch point is a segment boundary, so two segments cover it: the wider
 * (upstream) one is the bank the stream actually has to cross, which is why
 * this takes the widest match rather than the first.
 */
export function trunkWidthAt(model: TrunkGeometry | undefined, y: number): number {
  const segments = model?.segments
  if (!segments || segments.length === 0) return 0

  let widest = 0
  for (const seg of segments) {
    if (y >= seg.fromY && y <= seg.toY && seg.width > widest) widest = seg.width
  }
  return widest
}

/**
 * Where a tributary ends, in art-pixels — River.tsx draws to it,
 * Settlements.tsx centres its village on it.
 *
 * The world clips its overflow, so the far edge of the village is clamped
 * inside it: a village pushed past the border loses houses outright, which is
 * worse than one standing a little closer to the water. At the extremes of
 * the meander the clamp shortens the stream rather than cutting the village.
 */
export function tributaryEnd(
  atY: number,
  side: 'left' | 'right',
  trunkWidth = 0,
): { x: number; y: number } {
  const dir = side === 'right' ? 1 : -1
  const bank = Math.max(0, trunkWidth) / 2
  // Round the reach, not the result: `Math.round` breaks a .5 tie upwards,
  // which on the left bank rounds *towards* the river. The two banks would
  // then sit a pixel apart on an otherwise symmetric world.
  const reach = Math.round(bank + STREAM_REACH + VILLAGE_HALF_W)
  const limit = Math.ceil(VILLAGE_HALF_W)

  return {
    x: Math.min(Math.max(trunkX(atY) + dir * reach, limit), WORLD_W - limit),
    y: atY + TRIBUTARY_DROP,
  }
}
