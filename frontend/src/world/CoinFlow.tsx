import { useMemo } from 'react'

import type { RiverModel } from '../engine'
import { PixelSprite } from '../pixel'

import { coinPlan, routeKeyframes, type CoinRoute } from './coins'
import { COIN } from './objects'
import { PAL } from './palette'
import { riverPath, scalePath } from './path'

/**
 * T013 — money visibly moving down the river, and turning off it.
 *
 * Each coin rides one `offset-path` that runs from the spring, down the same
 * curve `River.tsx` draws the water from, and out along the branch it is
 * spent on. Routing it as a single path is what makes the split at a junction
 * smooth: there is no handover between two animations to fall out of step,
 * and no JavaScript in the frame loop — the browser interpolates one property
 * on ten elements.
 *
 * How many coins each route carries is decided by `coins.ts` from the model:
 * one coin per tenth of income, counted off a running total so a junction
 * passes on exactly what it received.
 *
 * `prefers-reduced-motion` collapses the animation globally in `index.css`.
 * Because the fill mode is `none`, the coins then fall back to the inline
 * `offsetDistance` below — a still frame of the river with its money spread
 * along it, rather than ten coins stacked at the last village (FR-016).
 */

type Props = {
  model: RiverModel
  /** CSS pixels per art pixel, from the world shell. Always an integer. */
  scale: number
}

/** Stable, so the generated keyframes replace each other instead of accumulating. */
const keyframeName = (index: number) => `coin-route-${index}`

export function CoinFlow({ model, scale }: Props) {
  const plan = useMemo(() => coinPlan(model), [model])

  /**
   * One path per route, in CSS pixels.
   *
   * The trunk half comes from `riverPath` — `path.ts` is the only thing
   * allowed to describe that curve, and two hand-built copies would drift
   * until the coins rode beside the water instead of on it. The branch is a
   * single straight `L` to the same `tributaryEnd` that `River.tsx` rasterises
   * its branch from, so the coin turns off exactly where the water does.
   */
  const paths = useMemo(
    () => plan.routes.map((route) => scalePath(routePath(route), scale)),
    [plan, scale],
  )

  const css = useMemo(
    () =>
      plan.routes
        .map((route, i) => routeKeyframes(keyframeName(i), route, plan.cycle))
        .join('\n'),
    [plan],
  )

  if (plan.coins.length === 0) return null

  return (
    <>
      <style>{css}</style>
      {plan.coins.map((coin) => {
        const path = paths[coin.route]
        if (!path) return null
        return (
          <span
            key={coin.key}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              lineHeight: 0,
              offsetPath: `path('${path}')`,
              offsetDistance: `${coin.offset}%`,
              // Without this the element inherits `offset-rotate: auto`, tilts to
              // follow the curve and shears the pixel grid into diagonal mush.
              // Not optional, and not obvious (art-bible.md §5).
              offsetRotate: '0deg',
              animation: `${keyframeName(coin.route)} ${plan.cycle}s linear ${coin.delay}s infinite`,
            }}
          >
            <PixelSprite art={COIN} palette={PAL} scale={scale} fps={8} />
          </span>
        )
      })}
    </>
  )
}

function routePath(route: CoinRoute): string {
  const { points, trunkRows } = route
  if (points.length < 2 || trunkRows < 2) return ''

  const trunk = riverPath({
    segments: [{ fromY: points[0].y, toY: points[trunkRows - 1].y }],
  })
  if (!trunk) return ''

  // A mouth route is trunk all the way; a branch route continues with the
  // drift to the bank and the run out to the settlement.
  return points
    .slice(trunkRows)
    .reduce((d, point) => `${d} L${point.x} ${point.y}`, trunk)
}
