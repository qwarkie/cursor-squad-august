import { PixelSprite } from '../pixel'
import { SPRING_Y, type RiverModel } from '../engine'
import { trunkX } from './path'
import { tributaryEnd } from './geometry'
import { PAL } from './palette'
import { CRACK, HOUSE, RESERVOIR, RESIDENT, SPRING, WARNING } from './objects'

/** HOUSE is 9 x 9 art-pixels (art-bible.md §4); three to a rank keeps the village clear of the trunk. */
const HOUSE_ART_W = 9
const HOUSE_GAP = 2

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
  const hasFlow = model.state !== 'empty'

  return (
    <>
      {hasFlow && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: trunkX(SPRING_Y) * scale, top: SPRING_Y * scale }}
        >
          <PixelSprite art={SPRING} palette={PAL} scale={scale} fps={3} alt="" />
        </div>
      )}

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

        /**
         * Every settlement the engine counted, not a sample of them. FR-007 ties
         * the count to the amount, so capping it made $1,500 of Housing render
         * exactly like $650 of Food — the largest expense stopped looking
         * largest and the metaphor flattened.
         *
         * Six houses in one row would be 54 art-px wide and run into the trunk,
         * so they wrap into ranks of three. HOUSE is 9 art-px (art-bible.md §4).
         */
        const houses = Math.max(0, Math.floor(trib.settlements) || 0)
        const residents = Math.max(0, Math.floor(trib.residents) || 0)
        const rankWidth = 3 * HOUSE_ART_W * scale + 2 * HOUSE_GAP
        return (
          <div key={trib.categoryId} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left, top }}>
            <div
              className="flex flex-wrap items-end justify-center"
              style={{ gap: HOUSE_GAP, width: rankWidth }}
            >
              {Array.from({ length: houses }, (_, i) => (
                <PixelSprite
                  key={i}
                  art={HOUSE}
                  palette={PAL}
                  scale={scale}
                  alt={i === 0 ? `Houses, ${houses}` : ''}
                />
              ))}
            </div>
            {residents > 0 && (
              <div
                className="flex justify-center"
                style={{ gap: HOUSE_GAP, marginTop: scale }}
              >
                {Array.from({ length: residents }, (_, i) => (
                  <PixelSprite
                    key={i}
                    art={RESIDENT}
                    palette={PAL}
                    scale={scale}
                    fps={4}
                    alt={i === 0 ? `Residents, ${residents}` : ''}
                  />
                ))}
              </div>
            )}
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

  // The dry bed starts exactly where the last tributary branches, so its
  // settlements/reservoir sit at almost this same height. Nudging the
  // (still centred) anchor to the side *opposite* that tributary is what
  // clears it — centred-on-trunk only worked when there was no last
  // tributary nearby to collide with. Nudge, not edge-anchor: this stays
  // inside the 96 art-px canvas at every meander phase and scale.
  const lastTrib = model.tributaries[model.tributaries.length - 1]
  const clearSide = lastTrib?.side === 'right' ? 'left' : 'right'
  const nudge = 8 // art-px, away from the trunk centreline
  const left = (trunkX(last.fromY) + (clearSide === 'left' ? -nudge : nudge)) * scale
  const top = (last.fromY + 4) * scale

  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left, top }}>
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

/** Matches components/money.ts's `formatMoney` — a true minus sign (U+2212), not ASCII `-`, so the header and this mark never disagree (Pollen's finding). */
function formatDollars(amount: number): string {
  const sign = amount < 0 ? '−' : ''
  return `${sign}$${Math.abs(amount).toLocaleString('en-US')}`
}
