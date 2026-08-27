import { unit } from './grass'
import { trunkX } from './path'

/**
 * Pixel-water geometry: the trunk's banks and the two pools, as art-pixel
 * rectangles.
 *
 * **Why rectangles and not a stroked path.** A stroke follows the meander's
 * centre line, and `riverPath` samples that line once per art-pixel — so
 * every row is a fresh one-pixel kink. SVG mitres each of those joins, which
 * on a 24 art-px stroke throws a spike off the outer bank and eats a notch
 * out of the inner one. The result was a river that looked hand-wobbled:
 * jagged down one side, near-straight down the other, with arrowheads where
 * the first and last joins fell. Widening the trunk made it worse, because
 * mitre length scales with stroke width.
 *
 * A column of rectangles has no joins to mitre. Both banks are the same
 * staircase mirrored around `trunkX(y)`, every edge lands on an art-pixel
 * boundary, and the ends are flat. That is what a hand-drawn pixel river
 * looks like, and it is the only way to get one out of a meander.
 *
 * Pure and DOM-free, so it tests in Node alongside `path.ts`.
 */

/** One axis-aligned rectangle in art-pixels. */
export interface Span {
  x: number
  y: number
  w: number
  h: number
}

/** The slice of a segment this module reads — structural, so `world/` keeps no import on `engine/`. */
export interface Band {
  fromY: number
  toY: number
  width: number
}

/**
 * Consecutive rows that share a left edge and a width, merged into one rect.
 *
 * The meander moves at most one art-pixel per row, so runs are long: a full
 * trunk collapses from ~88 rects to ~20. The merge is what keeps the DOM
 * small enough that dragging a category amount stays smooth, and it makes
 * the staircase explicit in the markup rather than implied by 88 identical
 * one-pixel slivers.
 */
function pushRow(spans: Span[], run: Span | null, x: number, y: number, w: number): Span {
  if (run && run.x === x && run.w === w && run.y + run.h === y) {
    run.h += 1
    return run
  }
  const next = { x, y, w, h: 1 }
  spans.push(next)
  return next
}

/**
 * The trunk (or its dry bed) as rectangles, spring to mouth.
 *
 * Bands must be contiguous and top-to-bottom: one band's `toY` is the next
 * one's `fromY`, and that shared row belongs to the downstream band. Drawing
 * it twice is invisible at full opacity and a visible seam at any other,
 * which is exactly where the bed's 0.6 used to show a dark line.
 */
export function bandSpans(bands: readonly Band[] | undefined): Span[] {
  const drawn = drawable(bands)
  const spans: Span[] = []
  let run: Span | null = null

  for (let i = 0; i < drawn.length; i++) {
    const band = drawn[i]
    const w = Math.max(1, Math.round(band.width))
    const from = Math.round(band.fromY)
    const to = Math.round(band.toY) - (i === drawn.length - 1 ? 0 : 1)

    for (let y = from; y <= to; y++) {
      // Floor, not round: an odd width has to lose its half-pixel on one
      // side, and losing it on the same side every row keeps the two banks
      // parallel. Rounding alternates the side and the river shivers.
      run = pushRow(spans, run, trunkX(y) - Math.floor(w / 2), y, w)
    }
  }

  return spans
}

function drawable(bands: readonly Band[] | undefined): Band[] {
  if (!bands || bands.length === 0) return []
  return bands.filter(
    (b) => b.width > 0 && Number.isFinite(b.fromY) && Number.isFinite(b.toY) && b.toY > b.fromY,
  )
}

/**
 * The lit crest, as dashes down the same staircase — the part of the water
 * that moves.
 *
 * It cannot be a stroked, dash-offset path for the same reason the body
 * cannot: mitred joins on a one-pixel-per-row meander turned each dash into
 * an angular blob with corners, and a row of those reads as ice on the river
 * rather than as light on it.
 *
 * So the dashes are rectangles and the whole column slides down instead. It
 * is generated one full `period` above the trunk, so the first dash is
 * already in place when the slide starts, and the caller clips it to the
 * water: sliding rows past a meandering centre line drifts them a pixel or
 * two off it, and the clip is what makes that drift free rather than a crest
 * hanging over the bank.
 */
export function crestSpans(
  bands: readonly Band[] | undefined,
  period: number,
  dash: number,
): Span[] {
  const drawn = drawable(bands)
  if (drawn.length === 0 || !(period > 0) || !(dash > 0)) return []

  const top = Math.round(drawn[0].fromY)
  const bottom = Math.round(drawn[drawn.length - 1].toY)

  const widthAt = (y: number): number => {
    for (const band of drawn) {
      if (y >= band.fromY && y < band.toY) return band.width
    }
    // Above the spring (the pre-roll rows) the crest keeps the first band's
    // width; below the last boundary, the last band's. Both are off-trunk
    // and clipped away — this only has to be a number.
    return y < top ? drawn[0].width : drawn[drawn.length - 1].width
  }

  const spans: Span[] = []
  let run: Span | null = null

  for (let y = top - Math.round(period); y <= bottom; y++) {
    if (((y % period) + period) % period >= dash) continue
    const w = Math.max(1, Math.round(widthAt(y) * 0.3))
    run = pushRow(spans, run, trunkX(y) - Math.floor(w / 2), y, w)
  }

  return spans
}

/**
 * Half-width of an ellipse `dy` rows from its centre, in art-pixels.
 *
 * Exported because the pool's surface streaks have to be measured against
 * the same curve that draws its edge — a streak sized off `rx` alone pokes
 * out through the bank on every row but the middle one.
 */
export function halfWidthAt(rx: number, ry: number, dy: number): number {
  if (!(rx >= 1) || !(ry >= 1)) return 0
  const t = 1 - (dy * dy) / (ry * ry)
  return t <= 0 ? 0 : Math.round(rx * Math.sqrt(t))
}

/**
 * A filled pixel ellipse, as rows relative to its own centre.
 *
 * Half-widths are rounded per row, so the silhouette is a staircase with the
 * same read as the trunk's banks — a smooth `<ellipse>` next to a pixel
 * river is the "one smooth-edged object in a hard-edged world" the art bible
 * calls a rendering bug, and the mouth pool was exactly that.
 */
export function poolRows(rx: number, ry: number): Span[] {
  if (!(rx >= 1) || !(ry >= 1)) return []

  const spans: Span[] = []
  let run: Span | null = null

  for (let dy = -Math.round(ry); dy <= Math.round(ry); dy++) {
    const half = halfWidthAt(rx, ry, dy)
    if (half < 1) continue
    run = pushRow(spans, run, -half, dy, half * 2)
  }

  return spans
}

/**
 * A tributary as art-pixel rectangles, rasterised down its long axis.
 *
 * The branch is shallow — it reaches ~16 art-px sideways while dropping 10 —
 * so it is walked one **column** at a time and each column is a vertical run
 * `width` tall. A stroked line put a mitre spike where it left the bank and a
 * butt cap hanging square in the grass at the far end; that is what made the
 * branches read as bolted onto the river rather than poured out of it.
 *
 * `from` is meant to be *inside* the bank, not on the centre line: a branch
 * drawn from the middle of a 24 art-px trunk spends half its length in water
 * it is supposed to be leaving, and the join comes out as a notch cut into
 * the river.
 *
 * With `dash`, the same walk emits a thinner, broken crest instead of the
 * solid body, generated a full period past each end so the caller can slide
 * it along the branch (clipped to the body) without a dash ever appearing
 * out on the grass or stopping short of the bank.
 */
/**
 * How a tributary bends on its way to its village.
 *
 * Spec §1: branches "look too straight and resemble roads". They were straight
 * by construction — `branchSpans` lerped `y` from start to end, so the only
 * thing distinguishing two branches was their endpoints. There was no curve in
 * the system to tune.
 *
 * Every term below is a pure function of the category's id. §1 requires that
 * "a layout should only change when the underlying financial data changes", and
 * the trunk's own meander is already a closed form of `y` alone — that is what
 * makes SC-007 true by construction. Same discipline here: no clock, no
 * `Math.random`, no accumulation from whatever was drawn before.
 */
export interface BranchCurve {
  /** Signed peak offset in art-pixels. Bounded so a branch bends, never kinks. */
  amp: number
  /** Moves the peak along the run: < 1 early, > 1 late. */
  skew: number
  /** A second, smaller harmonic — the difference between an arc and a river. */
  wiggle: number
}

export const STRAIGHT: BranchCurve = { amp: 0, skew: 1, wiggle: 0 }

/** A string seed as the two ints `unit` wants, order-dependent so "ab" != "ba". */
function seedOf(seed: string): [number, number] {
  let a = 0
  let b = 0
  for (let i = 0; i < seed.length; i += 1) {
    a = (Math.imul(a, 31) + seed.charCodeAt(i)) | 0
    b = (Math.imul(b, 131) + seed.charCodeAt(i) * (i + 1)) | 0
  }
  return [a, b]
}

/**
 * The curve for one branch, from its category id and its own length.
 *
 * Amplitude is tied to length rather than fixed: a 6px stub bent 5px is a
 * hook, and the same 5px on a 40px run is a lazy meander. Bounded at both
 * ends so a huge expense cannot throw its branch off the field — §5's
 * "bounded scaling... rather than direct unlimited value-to-distance mapping",
 * applied to curvature.
 */
export function branchCurve(seed: string, run: number, drop: number): BranchCurve {
  const [a, b] = seedOf(seed)
  const length = Math.hypot(run, drop)
  if (length < MIN_CURVE_LENGTH) return STRAIGHT

  const reach = Math.min(MAX_AMP, Math.max(MIN_AMP, length / AMP_DIVISOR))
  const sign = unit(a, b, 11) < 0.5 ? -1 : 1
  return {
    amp: sign * reach * (0.6 + unit(a, b, 13) * 0.4),
    skew: 0.8 + unit(a, b, 17) * 0.5,
    wiggle: (unit(a, b, 19) - 0.5) * 0.5,
  }
}

/** Below this a branch is too short to bend without reading as a kink. */
const MIN_CURVE_LENGTH = 8
const MIN_AMP = 1.5
const MAX_AMP = 5
const AMP_DIVISOR = 7

/** Offset from the straight line at `t` in [0, 1]. Zero at both ends, always. */
function curveAt(curve: BranchCurve, t: number): number {
  if (curve.amp === 0) return 0
  const main = Math.sin(Math.PI * Math.pow(t, curve.skew))
  const second = Math.sin(2 * Math.PI * t)
  return curve.amp * (main * (1 - Math.abs(curve.wiggle)) + curve.wiggle * second)
}

export function branchSpans(
  from: { x: number; y: number },
  to: { x: number; y: number },
  width: number,
  dash?: { period: number; length: number; scale: number },
  curve: BranchCurve = STRAIGHT,
): Span[] {
  const w = Math.max(1, Math.round(width))
  const x1 = Math.round(from.x)
  const y1 = Math.round(from.y)
  const run = Math.round(to.x) - x1
  const drop = Math.round(to.y) - y1
  if (run === 0 || !Number.isFinite(run) || !Number.isFinite(drop)) return []

  const step = run > 0 ? 1 : -1
  const columns = Math.abs(run)
  const thickness = dash ? Math.max(1, Math.round(w * dash.scale)) : w
  const pad = dash ? Math.round(dash.period) : 0

  const spans: Span[] = []
  let current: Span | null = null
  let previous: { top: number; bottom: number } | null = null

  for (let i = -pad; i <= columns + pad; i++) {
    if (dash && ((i % dash.period) + dash.period) % dash.period >= dash.length) continue

    const x = x1 + i * step
    // Clamped so the dash padding either side of the run follows the branch's
    // ends flat instead of continuing the curve out past them, where it has no
    // meaning and would swing away from the water it is highlighting.
    const t = Math.min(1, Math.max(0, i / columns))
    const centre = y1 + drop * t + curveAt(curve, t)
    let top = Math.round(centre) - Math.floor(thickness / 2)
    let height = thickness

    // Contiguity, guaranteed rather than hoped for (spec §7: "no disconnected
    // pixels, holes... clipping"). One column per x means a slope steeper than
    // the thickness would step past the previous column and leave a hole. The
    // rect is stretched to meet its neighbour instead. Straight branches never
    // reach this — measured 0 breaks across shallow, steep and very steep runs
    // before the curve went in — so it costs nothing today and stops the curve
    // from being able to introduce one.
    if (previous !== null) {
      const bottom = top + height
      if (top > previous.bottom) {
        height = bottom - previous.bottom
        top = previous.bottom
      } else if (bottom < previous.top) {
        height = previous.top - top
      }
    }
    previous = { top, bottom: top + height }

    const y = top
    const joins = current !== null && current.y === y && current.h === height

    // Walking right a run grows off its right edge; walking left, each new
    // column is one to the left of the last, so the rect's origin moves.
    if (joins && current!.x + current!.w === x) {
      current!.w += 1
      continue
    }
    if (joins && current!.x - 1 === x) {
      current!.x -= 1
      current!.w += 1
      continue
    }

    current = { x, y, w: 1, h: height }
    spans.push(current)
  }

  return spans
}

/**
 * How close two `#rrggbb` colours read, in RGB space.
 *
 * Measured against the branch-legibility problem (SC-002), not against WCAG:
 * a luminance-contrast ratio alone picked the wrong two weak branches, because
 * it misses hue. Brick's contrast against water is *lower* than teal's
 * (1.32:1 vs 1.39:1) and yet brick reads as the stronger branch by eye — hue
 * distance is carrying it. Plain Euclidean RGB distance folds hue and
 * lightness into one number and ranks the branches the way a person actually
 * sees them: slate and teal — the two hues nearest water's blue — come out
 * lowest and everything else clears them by a wide margin.
 */
export function colorDistance(a: string, b: string): number {
  const [ar, ag, ab] = rgb(a)
  const [br, bg, bb] = rgb(b)
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2)
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * The branch's centre line as an SVG path, for the invisible tap target.
 *
 * A `<line>` between the endpoints was correct while branches were straight.
 * It drifts by the full amplitude once they are not, which would leave the
 * hit target hanging off the side of its own water — the tributary would look
 * tappable and miss.
 */
export function branchPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  curve: BranchCurve,
  steps = 12,
): string {
  const x1 = Math.round(from.x)
  const y1 = Math.round(from.y)
  const run = Math.round(to.x) - x1
  const drop = Math.round(to.y) - y1
  const points: string[] = []
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    points.push(`${(x1 + run * t).toFixed(2)} ${(y1 + drop * t + curveAt(curve, t)).toFixed(2)}`)
  }
  return `M${points.join(' L')}`
}
