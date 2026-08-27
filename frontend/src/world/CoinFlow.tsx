import { useMemo } from 'react'

import type { RiverModel } from '../engine'
import { PixelSprite } from '../pixel'

import { coinPlan } from './coins'
import { COIN } from './objects'
import { PAL } from './palette'
import { riverPath, scalePath } from './path'

/**
 * T013 — money visibly moving down the river.
 *
 * Coins ride `offset-path` on the same curve `River.tsx` draws the water from,
 * scaled from art units into CSS pixels. Two hand-built curves would drift and
 * the coins would slide off the water; `path.ts` is the only thing here allowed
 * to make a path string, so there is one curve and the coins cannot leave it.
 *
 * How many coins a stretch carries is decided by `coins.ts` from the model, and
 * it is the metaphor stated a second way: below every branch the trunk is
 * narrower, so below every branch it carries visibly fewer coins. A dry bed
 * carries none.
 *
 * The whole animation is CSS on the compositor — no timers, no React re-renders
 * per frame — and `prefers-reduced-motion` collapses it globally in `index.css`,
 * where the coins simply stop and every figure stays readable (FR-016).
 */

type Props = {
  model: RiverModel
  /** CSS pixels per art pixel, from the world shell. Always an integer. */
  scale: number
}

export function CoinFlow({ model, scale }: Props) {
  const coins = useMemo(() => coinPlan(model), [model])

  /** One path per stretch, in CSS pixels, built once per model and scale. */
  const paths = useMemo(() => {
    const out = new Map<number, string>()
    for (const coin of coins) {
      if (out.has(coin.segment)) continue
      const seg = model.segments[coin.segment]
      if (!seg) continue
      const d = riverPath({ segments: [{ fromY: seg.fromY, toY: seg.toY }] })
      if (d) out.set(coin.segment, scalePath(d, scale))
    }
    return out
  }, [coins, model, scale])

  if (coins.length === 0) return null

  return (
    <>
      {coins.map((coin) => {
        const path = paths.get(coin.segment)
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
              // Without this the element inherits `offset-rotate: auto`, tilts to
              // follow the curve and shears the pixel grid into diagonal mush.
              // Not optional, and not obvious (art-bible.md §5).
              offsetRotate: '0deg',
              animation: `pixel-flow ${coin.duration}s linear ${coin.delay}s infinite`,
            }}
          >
            <PixelSprite art={COIN} palette={PAL} scale={scale} fps={8} />
          </span>
        )
      })}
    </>
  )
}
