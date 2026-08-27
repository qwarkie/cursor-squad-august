import { riverPath, trunkX } from './path'
import { PAL } from './palette'
import { tributaryEnd } from './geometry'
import type { RiverModel } from '../engine'
import type { Budget } from '../types'

type Props = {
  model: RiverModel
  budget: Budget
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
 * T011 — the trunk, drawn as one `<path>` per segment so each can carry its
 * own `stroke-width` (contracts/engine.md obligation 1: draw the model,
 * never recompute it). T023 — the three terminal states live here too,
 * because they are drawn on the same curve as the trunk, not overlaid on it.
 */
export function River({ model, budget, onSelectTributary }: Props) {
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
              strokeLinecap="round"
              opacity={overspent ? 1 : 0.6}
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
              strokeLinecap="round"
            />
            <path
              d={d}
              fill="none"
              stroke="var(--color-water-lit)"
              strokeWidth={Math.max(1, Math.round(seg.width * 0.3))}
              strokeLinecap="round"
              opacity={0.55}
            />
          </g>
        )
      })}

      {model.tributaries.map((trib) => {
        if (trib.width <= 0) return null
        const category = budget.categories.find((c) => c.id === trib.categoryId)
        const color = (category && PAL[category.color]) || 'var(--color-water)'
        const { x: x2, y: y2 } = tributaryEnd(trib.atY, trib.side)
        const x1 = trunkX(trib.atY)
        return (
          <g key={trib.categoryId}>
            <line x1={x1} y1={trib.atY} x2={x2} y2={y2} stroke={color} strokeWidth={trib.width} strokeLinecap="round" />
            {onSelectTributary && (
              <line
                x1={x1}
                y1={trib.atY}
                x2={x2}
                y2={y2}
                stroke="transparent"
                strokeWidth={Math.max(trib.width, MIN_HIT_WIDTH)}
                strokeLinecap="round"
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
        />
      )}
    </g>
  )
}
