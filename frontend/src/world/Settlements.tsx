import { PixelSprite } from '../pixel'
import type { RiverModel } from '../engine'
import { tributaryEnd } from './geometry'
import { PAL } from './palette'
import { CRACK, HOUSE, RESERVOIR, RESIDENT, WARNING } from './objects'

type Props = {
  model: RiverModel
  scale: number
}

/**
 * T016 — houses and residents at every expense tributary's end, a reservoir
 * for savings. T023's overspend art (cracked bed, warning) lives here too:
 * both are DOM sprites positioned in CSS pixels over the SVG, the same
 * overlay World.tsx already carries for this reason (art-bible.md §1).
 */
export function Settlements({ model, scale }: Props) {
  return (
    <>
      {model.tributaries.map((trib) => {
        if (trib.width <= 0) return null
        const { x, y } = tributaryEnd(trib.atY, trib.side)
        const left = x * scale
        const top = y * scale

        if (trib.reservoir) {
          return (
            <div
              key={trib.categoryId}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left, top }}
            >
              <PixelSprite art={RESERVOIR} palette={PAL} scale={scale} fps={3} alt="Savings reservoir" />
            </div>
          )
        }

        const houses = Math.min(trib.settlements, 3)
        const spacing = 9 * scale
        return (
          <div key={trib.categoryId} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left, top }}>
            <div className="relative flex items-end" style={{ gap: 2 }}>
              {Array.from({ length: houses }, (_, i) => (
                <PixelSprite key={i} art={HOUSE} palette={PAL} scale={scale} alt={i === 0 ? 'Houses' : ''} />
              ))}
              {trib.residents > 0 && (
                <div className="absolute" style={{ left: -spacing * 0.4, bottom: -scale * 2 }}>
                  <PixelSprite art={RESIDENT} palette={PAL} scale={scale} fps={4} alt="Residents" />
                </div>
              )}
            </div>
          </div>
        )
      })}

      {model.state === 'overspent' && <OverspendMark model={model} scale={scale} />}
    </>
  )
}

function OverspendMark({ model, scale }: { model: RiverModel; scale: number }) {
  const last = model.segments[model.segments.length - 1]
  if (!last) return null
  const midY = (last.fromY + last.toY) / 2
  const left = 48 * scale
  const top = midY * scale

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
      style={{ left, top }}
    >
      <div className="flex items-center justify-center gap-1">
        <PixelSprite art={CRACK} palette={PAL} scale={scale} alt="" />
        <PixelSprite art={WARNING} palette={PAL} scale={scale} fps={2} alt="Overspent" />
        <PixelSprite art={CRACK} palette={PAL} scale={scale} alt="" />
      </div>
      <p
        role="alert"
        className="mt-1 whitespace-nowrap text-[8px] text-[var(--color-alert)]"
        style={{ fontFamily: 'var(--font-pixel)' }}
      >
        OVER BUDGET — {formatDollars(model.remaining)}
      </p>
    </div>
  )
}

function formatDollars(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  return `${sign}$${Math.abs(amount).toLocaleString('en-US')}`
}
