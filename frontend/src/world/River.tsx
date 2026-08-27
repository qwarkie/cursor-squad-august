import { useState, type CSSProperties } from 'react'

import { riverPath, trunkX, WORLD_W } from './path'
import { tributaryWaterEnd, trunkWidthAt } from './geometry'
import { branchCurve, branchPath, branchSpans, colorDistance, halfWidthAt, poolRows, type Span } from './water'
import { PAL } from './palette'
import type { RiverModel, Segment } from '../engine'
import type { Budget } from '../types'

type Props = {
  model: RiverModel
  /**
   * Category colours for the tributary rim (SC-002) — the world knows
   * amounts, only the budget knows which colour a category picked.
   *
   * Optional so this file stays green without a composition-root change:
   * the caller is App.tsx, which is nobody's surface on this board. Absent
   * `budget`, a branch draws exactly as it did before this commit — water,
   * no rim. Wiring it (`<River budget={budget} .../>`) is a one-line,
   * Praetor-owned follow-up; see #48.
   */
  budget?: Budget
  /** T019 — every tributary is tappable regardless of its drawn width. */
  onSelectTributary?: (categoryId: string) => void
}

/**
 * Smallest integer scale (art-bible.md §1 Scale table) is ×3, so 44 CSS px
 * of touch target is 44/3 ≈ 14.7 art-px at the worst case — round up. Used
 * only for hit-testing; never for what's drawn (contracts/engine.md
 * obligation 4: inflate hit areas, don't inflate the model).
 */
const MIN_HIT_WIDTH = 15

/**
 * RGB distance (water.ts's `colorDistance`) below which a category colour
 * reads too close to the water to carry a branch on hue alone (SC-002).
 * Measured on art-bible.md §2's five hues against `--color-water`: slate and
 * teal fall at ~85-87, the other three clear 115 — this sits in the gap.
 */
const WEAK_RIM_DISTANCE = 100

/**
 * `shape-rendering="crispEdges"` on the ancestor `<svg>` (World.tsx) is not
 * enough — every shape needs it explicitly, and every stroke needs a `butt`
 * cap rather than the SVG default `round`. Round caps draw a curved
 * silhouette regardless of the rendering hint, which is exactly what makes
 * the trunk read as a smooth vector lozenge instead of the one hard-edged
 * object art-bible.md §1 requires: "the river is the one smooth-edged
 * object in a hard-edged world and looks like a rendering bug."
 */
const CRISP = { shapeRendering: 'crispEdges' as const, strokeLinecap: 'butt' as const }

/**
 * The crest that travels downstream, on the trunk and on every tributary
 * alike — one water sparkle regardless of category, so the flow itself
 * still reads as one river. The category colour lives in a rim around each
 * branch, below (SC-002: art-bible.md §2 puts it in three places — the
 * tributary, the label, the bottom-sheet control; the signboard from
 * Settlements.tsx is additive, not a replacement for it).
 *
 * A pixel-rasterised branch has no stroke left to carry the colour (21897e0
 * moved tributaries off stroked paths for the mitre/notch reasons water.ts
 * documents), so it is drawn as one more layer of `branchSpans` — the same
 * ink-keyline-then-rim-then-body technique `Pool` below already uses.
 * Measured luminance contrast against the trunk water puts every category
 * colour *below* the water's own highlight (waterLit is 1.84:1, the
 * weakest category colour is 1.05:1) — hue separates the branches, not
 * lightness, so the ink layer is load-bearing insurance, not decoration:
 * without it a branch can wash out on a dim screen or for a colour-blind
 * viewer exactly where the colour is doing all the work.
 *
 * `prefers-reduced-motion` is honoured globally in index.css, so this needs
 * no media query of its own.
 */
const FLOW_PERIOD = 10 // art-px: 6 of crest, 4 of gap

const FLOW_DASH = 6

const FLOW = {
  strokeDasharray: `${FLOW_DASH} ${FLOW_PERIOD - FLOW_DASH}`,
  style: {
    '--flow-period': `${FLOW_PERIOD}px`,
    animation: `river-flow 1.4s steps(${FLOW_PERIOD}) infinite`,
  } as CSSProperties,
}

/**
 * A branch's crest is rectangles, not a dashed stroke, so it slides bodily
 * along the branch instead of a dash offset moving under it. Same period and
 * duration as the trunk's `FLOW`, so nothing runs at two speeds.
 * `--flow-dir` is +1 on the right bank and −1 on the left: downstream on a
 * tributary is away from the river, whichever side it leaves on.
 */
function branchFlow(dir: 1 | -1): CSSProperties {
  return {
    '--flow-period': `${FLOW_PERIOD}px`,
    '--flow-dir': dir,
    animation: `branch-flow 1.4s steps(${FLOW_PERIOD}) infinite`,
  } as CSSProperties
}

/**
 * T011 — the trunk, drawn as one `<path>` per segment so each can carry its
 * own `stroke-width` (contracts/engine.md obligation 1: draw the model,
 * never recompute it). T023 — the three terminal states live here too,
 * because they are drawn on the same curve as the trunk, not overlaid on it.
 */
export function River({ model, budget, onSelectTributary }: Props) {
  const last = model.segments[model.segments.length - 1]
  const first = model.segments[0]
  // #67 — the trunk's width already answers "which category takes the
  // biggest bite"; it never answers "how much do I have left after rent
  // and groceries, before I decide about entertainment." `segment.carried`
  // is that number, computed by the engine for width already — tapping the
  // trunk surfaces it as a figure instead of leaving it implicit in a band's
  // thickness. Lowest hit-test priority in the world (#66's ruling): drawn
  // and hit-tested before the tributaries below, so an overlapping tap
  // always resolves to the narrower, more specific target.
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null)

  return (
    <g>
      {/* The spring. Income has to arrive somewhere rather than simply
          beginning: with no pool the trunk starts at a flat cap in open
          grass, which reads as the drawing being cut off, not as a source. */}
      {first && model.state !== 'empty' && first.width > 0 && (
        <Pool
          cx={trunkX(first.fromY)}
          cy={first.fromY}
          {...poolSize(first.width, 10, 24, 0.42)}
          fill="var(--color-water)"
          rim="var(--color-water-deep)"
          shimmer
        />
      )}

      {model.segments.map((seg, i) => {
        const d = riverPath({ segments: [{ fromY: seg.fromY, toY: seg.toY }] })
        if (!d) return null

        if (seg.width <= 0) {
          // `empty` (income 0) still returns one full-length, width-0
          // segment — the trunk's course, not its visibility. Draw nothing:
          // flooring this to a visible bed paints a ghost river across the
          // opening frame, before Add Income has ever been pressed.
          if (model.state === 'empty') return null

          // Balanced and overspent both zero out the trailing segment
          // (data-model.md), so only `model.state` — never the width
          // alone — may decide which one this is (FR-012, spec US4).
          const overspent = model.state === 'overspent'
          return (
            <path
              key={`bed-${i}`}
              d={d}
              fill="none"
              stroke="var(--color-sand)"
              strokeWidth={overspent ? 4 : 2}
              opacity={overspent ? 1 : 0.6}
              {...CRISP}
            />
          )
        }

        return (
          <g key={`seg-${i}`}>
            <path
              d={d}
              fill="none"
              stroke="var(--color-water)"
              strokeWidth={seg.width}
              className="river-width"
              {...CRISP}
            />
            <path
              d={d}
              fill="none"
              stroke="var(--color-water-lit)"
              strokeWidth={Math.max(1, Math.round(seg.width * 0.3))}
              opacity={0.55}
              {...CRISP}
              {...FLOW}
            />
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={Math.max(seg.width, MIN_HIT_WIDTH)}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedSegment((current) => (current === i ? null : i))}
            />
          </g>
        )
      })}

      {selectedSegment !== null && model.segments[selectedSegment] && (
        <RunningTotal segment={model.segments[selectedSegment]} />
      )}

      {model.tributaries.map((trib) => {
        if (trib.width <= 0) return null

        const trunkW = trunkWidthAt(model, trib.atY)
        const end = tributaryWaterEnd(trib.atY, trib.side, trunkW)
        const dir: 1 | -1 = trib.side === 'right' ? 1 : -1

        // Start two art-pixels inside the bank rather than on the centre
        // line. From the centre, the branch's first half is drawn over water
        // it is meant to be leaving and the join reads as a notch bitten out
        // of the trunk; from the bank exactly, a one-pixel seam of grass
        // opens at the join wherever the meander steps sideways on that row.
        const start = {
          x: trunkX(trib.atY) + dir * Math.max(0, Math.round(trunkW / 2) - 2),
          y: trib.atY,
        }
        // One curve per tributary, shared by every layer that draws it. The
        // ink keyline, the colour rim, the water body, the flow highlight and
        // the tap target are five renderings of ONE branch — give any of them
        // its own curve and the rim slides off the water.
        const curve = branchCurve(trib.categoryId, end.x - start.x, end.y - start.y)
        const body = branchSpans(start, end, trib.width, undefined, curve)
        const category = budget?.categories.find((c) => c.id === trib.categoryId)
        const rimColor = category ? PAL[category.color] : null
        // Hue alone doesn't carry every colour equally: slate and teal sit
        // close to the water's own blue in RGB space (~85-87 apart) while
        // the rest clear it by 115+ (WEAK_RIM_DISTANCE splits the two
        // groups).
        //
        // #57 — a weak-rim branch never keeps a water core, at any width.
        // #54's fix (skip the body when there's no room) only removed the
        // diluting water pixel on branches narrow enough to hit the floor —
        // Fizz measured Savings (teal, width 8) keeping a 4-art-px water
        // core wide enough to read as "water with some teal in it" rather
        // than as teal, while Transport and Entertainment (both width 2)
        // read clean only because they happened to be too narrow for any
        // core to survive. A width accident isn't a fix. If a colour is
        // close enough to water that it needs the wider inset at all, an
        // interior water core is exactly the pixels that make it read as
        // water — so weak branches drop the core unconditionally; strong
        // branches (hue alone already separates them) keep the width-based
        // inset, since there the core is a stylistic choice about "the same
        // river continuing," not a legibility cost.
        const weakRim = rimColor !== null && colorDistance(rimColor, PAL.b!) < WEAK_RIM_DISTANCE
        const bodyWidth = trib.width - 2
        const showBody = rimColor ? !weakRim && bodyWidth >= 1 : true
        const clip = `river-branch-${trib.categoryId}`
        return (
          <g
            key={trib.categoryId}
            data-tributary={trib.categoryId}
            // Mount-only by construction: the key is the category id, so React
            // remounts this group when a category ARRIVES and leaves it alone
            // when its amount changes. Raise Housing and its branch widens
            // without re-opening — the same property @Pollen's per-building
            // keys give the settlements.
            className="branch-grow"
            style={
              {
                '--grow-l': trib.side === 'right' ? '0%' : '100%',
                '--grow-r': trib.side === 'right' ? '100%' : '0%',
              } as CSSProperties
            }
          >
            <clipPath id={clip}>
              <Rects spans={body} fill="none" />
            </clipPath>
            {/* Ink keyline, then the category's colour, then the water body
                on top — three concentric branchSpans layers, same technique
                as Pool's ink/rim/body below. Still the same river continuing
                (the body stays water, not a saturated slab), but now with a
                rim a stranger can tell apart from the trunk and from its
                neighbours without reading the signboard. */}
            {rimColor && (
              <>
                <Rects spans={branchSpans(start, end, trib.width + 2, undefined, curve)} fill="var(--color-ink)" />
                <Rects spans={branchSpans(start, end, trib.width, undefined, curve)} fill={rimColor} />
              </>
            )}
            {showBody && (
              <Rects
                spans={branchSpans(start, end, rimColor ? bodyWidth : trib.width, undefined, curve)}
                fill="var(--color-water)"
                className="river-width"
              />
            )}
            <g clipPath={`url(#${clip})`} opacity={0.55}>
              <g style={branchFlow(dir)}>
                {/* Crest thickness tracks the branch the same way the trunk's
                    does, so a hair-thin $50 tributary gets exactly one lit
                    pixel rather than a highlight wider than the water. */}
                <Rects
                  spans={branchSpans(
                    start,
                    end,
                    trib.width,
                    { period: FLOW_PERIOD, length: FLOW_DASH, scale: 0.3 },
                    curve,
                  )}
                  fill="var(--color-water-lit)"
                />
              </g>
            </g>
            {onSelectTributary && (
              <path
                d={branchPath(start, end, curve)}
                fill="none"
                stroke="transparent"
                strokeWidth={Math.max(trib.width, MIN_HIT_WIDTH)}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectTributary(trib.categoryId)}
              />
            )}
          </g>
        )
      })}

      {/* What reaches the bottom, drawn as somewhere the river arrives. A
          smooth <ellipse> among the staircases was the one soft-edged shape
          in a hard-edged world — art-bible.md §1 calls that a rendering bug. */}
      {last && model.state === 'surplus' && (
        <MouthPool
          y={last.toY}
          {...poolSize(last.width, 13, 26, 0.55)}
          fill="var(--color-water)"
          rim="var(--color-water-deep)"
          shimmer
        />
      )}

      {last && model.state === 'balanced' && (
        // Every dollar allocated, so nothing reaches the mouth: the same
        // basin, dry. Still a basin and never the cracked bed — the seeded
        // month opens here and must not read as a warning (FR-012).
        <MouthPool y={last.toY} rx={11} ry={5} fill="var(--color-sand)" rim="var(--color-ink)" />
      )}
    </g>
  )
}

/** Art-pixel rectangles from `water.ts`, drawn. Every one carries the crisp hint (art-bible.md §1). */
function Rects({
  spans,
  fill,
  className,
}: {
  spans: readonly Span[]
  fill: string
  className?: string
}) {
  return (
    <>
      {spans.map((s) => (
        <rect
          key={`${s.x},${s.y}`}
          x={s.x}
          y={s.y}
          width={s.w}
          height={s.h}
          fill={fill}
          className={className}
          shapeRendering="crispEdges"
        />
      ))}
    </>
  )
}

/** A one-art-pixel shuffle of the surface streaks, so a pool is never a dead disc. */
const SHIMMER: CSSProperties = { animation: 'water-shimmer 2s steps(2, jump-none) infinite' }

/**
 * Radii for a pool, in art-pixels.
 *
 * A pool has to be visibly wider than the water feeding it, or it reads as
 * the river's blunt end rather than as somewhere the river arrives. Hence the
 * `+ 8` and the floor: even a two-pixel trickle opens into something. The
 * ceiling keeps a full-width river's mouth inside the 96 x 128 world.
 *
 * §6 — a caller's `max` has to clear `width + 8` at the widest width that
 * caller ever sees, or the pool stops answering long before the trunk does.
 * The spring's ceiling was 18 against a trunk that reaches 16 (TRUNK_MAX):
 * `width + 8` saturates at 18 once width hits 10, so roughly the top half
 * of the income range — every carried amount from 10/16 to 16/16 of the
 * trunk's width — drew an identical spring. Financially distinct months
 * looked the same at the one place income actually arrives. Fixed at the
 * call site, not here: `poolSize` is shared with the mouth pool, whose
 * ceiling (26) never was the problem — mouth's width also tops out at
 * TRUNK_MAX, and 16 + 8 = 24 never reaches 26.
 */
function poolSize(width: number, min: number, max: number, flatten: number) {
  const rx = Math.min(max, Math.max(min, Math.round(Math.max(0, width)) + 8))
  return { rx, ry: Math.max(4, Math.round(rx * flatten)) }
}

/** Surface streaks, measured against the same curve that draws the pool's edge. */
function streaks(rx: number, ry: number): Span[] {
  const bodyRx = Math.max(1, rx - 3)
  const bodyRy = Math.max(1, ry - 2)
  const rows: [number, number, number][] = [
    [-Math.round(ry * 0.35), 1.1, -0.25],
    [Math.round(ry * 0.1), 1.4, 0.15],
    [Math.round(ry * 0.55), 0.8, -0.3],
  ]

  return rows
    .map(([dy, span, shift]) => {
      const half = halfWidthAt(bodyRx, bodyRy, dy)
      const w = Math.round(half * span)
      return { x: Math.round(half * shift) - Math.floor(w / 2), y: dy, w, h: 1 }
    })
    .filter((s) => s.w >= 2)
}

type PoolProps = {
  cx: number
  cy: number
  rx: number
  ry: number
  fill: string
  rim: string
  shimmer?: boolean
}

/** Ink keyline, then rim, then body — the three-layer read every sprite has. */
function Pool({ cx, cy, rx, ry, fill, rim, shimmer }: PoolProps) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <Rects spans={poolRows(rx + 1, ry + 1)} fill="var(--color-ink)" />
      <Rects spans={poolRows(rx, ry)} fill={rim} />
      <Rects spans={poolRows(rx - 2, ry - 1)} fill={fill} />
      {shimmer && (
        <g style={SHIMMER}>
          <Rects spans={streaks(rx, ry)} fill="var(--color-water-lit)" />
        </g>
      )}
    </g>
  )
}

/** Sits just below the last row of trunk, so the water runs into it. */
function MouthPool({ y, ...pool }: Omit<PoolProps, 'cx' | 'cy'> & { y: number }) {
  return <Pool cx={trunkX(y)} cy={y + Math.round(pool.ry / 3)} {...pool} />
}

/**
 * Whole dollars, grouped, no minus sign needed — `segment.carried` is
 * clamped non-negative at source (`engine/river.ts`), so this is a smaller
 * copy of `components/money.ts`'s `formatMoney` rather than an import of
 * it: world stays free of a dependency on chrome, the direction every other
 * file in this layer already keeps.
 */
function formatCarried(amount: number): string {
  return `$${Math.round(Math.max(0, amount)).toLocaleString('en-US')}`
}

/**
 * The figure `segment.carried` drives width with but never states — tapping
 * the trunk (#67) surfaces it. A `foreignObject` rather than SVG `<text>`:
 * plain SVG text has no crisp-edges equivalent and would antialias exactly
 * the way art-bible.md §7 spent tonight ruling out; a `foreignObject` embeds
 * ordinary DOM, styled like `Settlements.tsx`'s `Signboard`, and needs no
 * prop threaded through `World.tsx`/`App.tsx` to get there.
 */
function RunningTotal({ segment }: { segment: Segment }) {
  const midY = (segment.fromY + segment.toY) / 2
  const midX = trunkX(midY)
  // Open ground is whichever side of the meander has more of it — the
  // same call Signboard makes by centring over its own village, just
  // decided here because the trunk (unlike a village) can sit anywhere
  // across the world's width.
  const onRight = midX < WORLD_W / 2
  const label = `${formatCarried(segment.carried)} left`
  const boxW = Math.min(WORLD_W - 4, Math.max(24, label.length * 4 + 4))
  const x = onRight ? Math.min(WORLD_W - boxW - 2, midX + 8) : Math.max(2, midX - boxW - 8)

  return (
    <foreignObject x={x} y={midY - 5} width={boxW} height={10} style={{ overflow: 'visible' }}>
      <div
        style={{
          width: 'fit-content',
          maxWidth: boxW,
          background: 'var(--color-ink)',
          color: 'var(--color-paper)',
          border: '1px solid var(--color-ink)',
          padding: '0 2px',
          fontFamily: 'var(--font-pixel)',
          fontSize: 5,
          lineHeight: '10px',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
    </foreignObject>
  )
}
