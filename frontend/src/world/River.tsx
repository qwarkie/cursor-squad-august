import type { CSSProperties } from 'react'

import { riverPath, trunkX } from './path'
import { tributaryEnd } from './geometry'
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
 * alike. A tributary is the same water as the river it leaves, so it is
 * drawn in the same two blues rather than in its category's colour: six
 * saturated slabs radiating out of a blue river read as bars laid over the
 * map, not as water leaving it. The category's colour now lives on the
 * signboard above its settlement (Settlements.tsx), which is where a reader
 * looks to tell one village from another anyway.
 *
 * `prefers-reduced-motion` is honoured globally in index.css, so this needs
 * no media query of its own.
 */
const FLOW_PERIOD = 10 // art-px: 6 of crest, 4 of gap

const FLOW = {
  strokeDasharray: '6 4',
  style: {
    '--flow-period': `${FLOW_PERIOD}px`,
    animation: `river-flow 1.4s steps(${FLOW_PERIOD}) infinite`,
  } as CSSProperties,
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
            <path d={d} fill="none" stroke="var(--color-water)" strokeWidth={seg.width} {...CRISP} />
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
        const { x: x2, y: y2 } = tributaryEnd(trib.atY, trib.side)
        const x1 = trunkX(trib.atY)
        // Crest width tracks the branch the same way the trunk's does, so a
        // hair-thin $50 tributary still gets exactly one lit pixel rather
        // than a highlight wider than the water under it.
        const crest = Math.max(1, Math.round(trib.width * 0.3))
        return (
          <g key={trib.categoryId}>
            <line
              x1={x1}
              y1={trib.atY}
              x2={x2}
              y2={y2}
              stroke="var(--color-water)"
              strokeWidth={trib.width}
              {...CRISP}
            />
            <line
              x1={x1}
              y1={trib.atY}
              x2={x2}
              y2={y2}
              stroke="var(--color-water-lit)"
              strokeWidth={crest}
              opacity={0.55}
              {...CRISP}
              {...FLOW}
            />
            {onSelectTributary && (
              <line
                x1={x1}
                y1={trib.atY}
                x2={x2}
                y2={y2}
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
