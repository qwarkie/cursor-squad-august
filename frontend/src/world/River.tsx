import type { CSSProperties } from 'react'

import { riverPath, trunkX } from './path'
import { tributaryEnd, trunkWidthAt } from './geometry'
import { branchSpans, type Span } from './water'
import type { RiverModel } from '../engine'

type Props = {
  model: RiverModel
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
 * still reads as one river. The category's *stroke* colour is restored
 * below (SC-002: art-bible.md §2 puts it in three places — stroke, label,
 * bottom-sheet control — and the stroke is what makes a branch read as a
 * cut off the trunk rather than the same water continuing; the signboard
 * from Settlements.tsx is additive, not a replacement for it).
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
export function River({ model, onSelectTributary }: Props) {
  const last = model.segments[model.segments.length - 1]

  return (
    <g>
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
          </g>
        )
      })}

      {model.tributaries.map((trib) => {
        if (trib.width <= 0) return null

        const trunkW = trunkWidthAt(model, trib.atY)
        const end = tributaryEnd(trib.atY, trib.side, trunkW)
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
        const body = branchSpans(start, end, trib.width)
        const clip = `river-branch-${trib.categoryId}`
        return (
          <g key={trib.categoryId}>
            <clipPath id={clip}>
              <Rects spans={body} fill="none" />
            </clipPath>
            {/* Water, not the category's colour. A tributary is the same
                river continuing, and six saturated slabs radiating out of a
                blue trunk read as bars laid over the map rather than as
                water leaving it. The colour keeps its three places from
                art-bible.md §2 — the signboard over the settlement, the list
                swatch and the bottom-sheet control. */}
            <Rects spans={body} fill="var(--color-water)" className="river-width" />
            <g clipPath={`url(#${clip})`} opacity={0.55}>
              <g style={branchFlow(dir)}>
                {/* Crest thickness tracks the branch the same way the trunk's
                    does, so a hair-thin $50 tributary gets exactly one lit
                    pixel rather than a highlight wider than the water. */}
                <Rects
                  spans={branchSpans(start, end, trib.width, {
                    period: FLOW_PERIOD,
                    length: FLOW_DASH,
                    scale: 0.3,
                  })}
                  fill="var(--color-water-lit)"
                />
              </g>
            </g>
            {onSelectTributary && (
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="transparent"
                strokeWidth={Math.max(trib.width, MIN_HIT_WIDTH)}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectTributary(trib.categoryId)}
              />
            )}
          </g>
        )
      })}

      {last && model.state === 'surplus' && (
        <ellipse
          cx={trunkX(last.toY)}
          cy={last.toY + 2}
          rx={Math.max(6, last.width)}
          ry={4}
          fill="var(--color-water-lit)"
          opacity={0.85}
          shapeRendering="crispEdges"
        />
      )}

      {last && model.state === 'balanced' && (
        <ellipse
          cx={trunkX(last.toY)}
          cy={last.toY + 2}
          rx={6}
          ry={3}
          fill="none"
          stroke="var(--color-sand)"
          strokeWidth={1}
          shapeRendering="crispEdges"
        />
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
