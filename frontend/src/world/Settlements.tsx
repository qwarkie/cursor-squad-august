import { PixelSprite } from '../pixel'
import { SPRING_Y, type RiverModel } from '../engine'
import { trunkX } from './path'
import { WORLD_H } from './World'
import { tributaryEnd } from './geometry'
import { PAL } from './palette'
import { CRACK, RESERVOIR, RESIDENT, SPRING, WARNING } from './objects'
import { iconArt, iconPlural } from './icons'
import type { Budget, PaletteKey } from '../types'

/**
 * A rank is three houses wide — HOUSE is 9 x 9 art-pixels (art-bible.md §4) —
 * and that width is fixed regardless of which icon a category picked. The
 * rank wraps, so a wider icon simply fits fewer to a row (MARKET at 12 fits
 * two) and the village still stays clear of the trunk. `icons.test.ts` holds
 * every icon to this width.
 */
const RANK_ART_W = 27
const HOUSE_GAP = 2

type Props = {
  model: RiverModel
  /** Labels and colours for the signboards — the world knows amounts, only the budget knows names. */
  budget: Budget
  scale: number
}

/**
 * T016 — houses and residents at every expense tributary's end, a reservoir
 * for savings. T023's overspend art (cracked bed, warning) lives here too:
 * both are DOM sprites positioned in CSS pixels over the SVG, the same
 * overlay World.tsx already carries for this reason (art-bible.md §1).
 */
export function Settlements({ model, budget, scale }: Props) {
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

        const category = budget.categories.find((c) => c.id === trib.categoryId)
        const rankWidth = RANK_ART_W * scale + 2 * HOUSE_GAP

        if (trib.reservoir) {
          return (
            <div
              key={trib.categoryId}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left, top }}
            >
              {category && (
                <Signboard label={category.label} color={category.color} scale={scale} width={rankWidth} />
              )}
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
        // The category's own icon, or the house for a budget saved before
        // icons existed. `iconArt` is total, so an unknown name draws too.
        const art = iconArt(category?.icon)
        const noun = iconPlural(category?.icon)
        return (
          <div key={trib.categoryId} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left, top }}>
            {category && (
              <Signboard label={category.label} color={category.color} scale={scale} width={rankWidth} />
            )}
            <div
              className="flex flex-wrap items-end justify-center"
              style={{ gap: HOUSE_GAP, width: rankWidth }}
            >
              {Array.from({ length: houses }, (_, i) => (
                <PixelSprite
                  key={i}
                  art={art}
                  palette={PAL}
                  scale={scale}
                  fps={4}
                  alt={i === 0 ? `${noun}, ${houses}` : ''}
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

      <MouthTally model={model} scale={scale} />

      {model.state === 'overspent' && <OverspendMark model={model} scale={scale} />}
    </>
  )
}

/**
 * The one coloured thing in the world.
 *
 * The tributaries used to carry the category colour and it read as six
 * painted bars laid across the map rather than as water (River.tsx). The
 * colour has to live somewhere — without it nothing tells Housing from Food
 * once every branch is blue — so it moves here, onto a signboard over the
 * village it names. Same information, and it now says the category's name
 * outright instead of asking the reader to match a hue against the list.
 */
function Signboard({
  label,
  color,
  scale,
  width,
}: {
  label: string
  color: PaletteKey
  scale: number
  width: number
}) {
  const fill = PAL[color] ?? 'var(--color-water)'
  const border = Math.max(1, Math.round(scale / 2))
  const inner = width - 2 * border - 2 * scale

  /**
   * Press Start 2P advances exactly one em per glyph, so `width / length` is
   * the largest size that still sits over its own village. Without this a
   * long name ("Entertainment") runs off the edge of a world that clips its
   * overflow, and the board loses its last letters.
   */
  const fontSize = Math.max(4, Math.min(scale * 2, Math.floor(inner / Math.max(1, label.length))))

  return (
    <div
      className="absolute bottom-full left-1/2 -translate-x-1/2 whitespace-nowrap"
      style={{
        background: fill,
        color: brightness(fill) > 0.6 ? PAL.k! : PAL.p!,
        border: `${border}px solid ${PAL.k}`,
        padding: `${border}px ${scale}px`,
        marginBottom: scale,
        fontFamily: 'var(--font-pixel)',
        fontSize,
        lineHeight: 1,
      }}
    >
      {label}
    </div>
  )
}

/**
 * Perceived brightness of a `#rrggbb`, 0–1, for picking the lettering.
 * Neither text colour works on all six category colours — paper on gold and
 * ink on brick are each unreadable — so the choice is made per board rather
 * than fixed. 0.6 is the threshold that splits the palette correctly: gold
 * and wheat take ink, the other four take paper.
 */
function brightness(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16)
  if (!Number.isFinite(n)) return 0
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
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

/**
 * What reaches the mouth, stated in dollars on a plate under the pool.
 *
 * The pool's size is capped so a full-width river's mouth stays inside the
 * world, which means it stops growing well before the money does — $50 of
 * surplus and $2,200 of it arrive in a pool of the same size. The figure is
 * what separates them. It sits *below* the water rather than on it so the
 * pool stays unobstructed, and its top is clamped inside the 128 art-px
 * canvas, because a mouth pushed down by many categories would otherwise
 * carry its own label off the bottom edge.
 *
 * Decorative for assistive tech: this overlay is `aria-hidden` in World.tsx
 * and the header already announces the remaining amount, so it must not be
 * read out a second time.
 */
function MouthTally({ model, scale }: { model: RiverModel; scale: number }) {
  const last = model.segments[model.segments.length - 1]
  if (!last || model.state === 'empty') return null

  const border = Math.max(1, Math.round(scale / 2))
  const top = Math.min(last.toY + 12, WORLD_H - 12) * scale

  return (
    <div
      className="absolute -translate-x-1/2 whitespace-nowrap"
      data-testid="mouth-tally"
      style={{
        left: trunkX(last.toY) * scale,
        top,
        background: PAL.n!,
        color: model.remaining > 0 ? PAL.y! : PAL.p!,
        border: `${border}px solid ${PAL.k}`,
        padding: `${border}px ${scale}px`,
        fontFamily: 'var(--font-pixel)',
        fontSize: Math.max(6, scale * 2),
        lineHeight: 1,
      }}
    >
      {formatDollars(model.remaining)} left
    </div>
  )
}
