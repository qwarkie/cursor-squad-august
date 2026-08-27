import type { ReactNode } from 'react'

import { PixelSprite, type Art } from '../pixel'
import { SPRING_Y, type RiverModel } from '../engine'
import { trunkX } from './path'
import { WORLD_H } from './World'
import { RANK_ART_W, tributaryEnd, tributaryWaterEnd, trunkWidthAt } from './geometry'
import { PAL } from './palette'
import { CRACK, POND, RESERVOIR, RESIDENT, SPRING, WARNING, WORLD_FPS } from './objects'
import { iconArt, iconPlural } from './icons'
import { hamlet } from './hamlet'
import type { Budget, PaletteKey } from '../types'

/**
 * A rank is three houses wide — HOUSE is 9 x 9 art-pixels (art-bible.md §4) —
 * and that width is fixed regardless of which icon a category picked. The
 * rank wraps, so a wider icon simply fits fewer to a row (MARKET at 12 fits
 * two) and the village still stays clear of the trunk. `icons.test.ts` holds
 * every icon to this width; geometry.ts owns the number, because it also
 * decides how far out a village of that width has to stand.
 */
const HOUSE_GAP = 2

/** FR-018 / SC-008 — no essential control below 44 x 44 CSS px. */
const MIN_TOUCH = 44

/**
 * Spec §8 — a settlement arrives building by building rather than all at once.
 *
 * The stagger is per building and the animation runs once, on mount. That is
 * only correct because `hamlet()` keys every spot on `${categoryId}-b${index}`:
 * raise a category's amount and React mounts the seventh house alone, so the
 * six already standing do not blink. Keys were the point of that field.
 */
const SETTLE_MS = 180
const SETTLE_STAGGER_MS = 45

type Props = {
  model: RiverModel
  /** Labels and colours for the signboards — the world knows amounts, only the budget knows names. */
  budget: Budget
  scale: number
  /**
   * Selects the category a village or reservoir belongs to.
   *
   * Optional so this file lands green and inert: the prop is threaded from
   * App.tsx, which is a gated surface, and #52 established that the way across
   * one is to ship the consumer first and ask for the activating line.
   */
  onSelect?: (categoryId: string) => void
  /** Opens the income sheet from the spring. The spring *is* the income. */
  onEditIncome?: () => void
}

/**
 * A pointer shortcut on a world object.
 *
 * Deliberately `aria-hidden` with `tabIndex={-1}`, which is the opposite of
 * what an interactive element usually wants. The reason: every action these
 * shortcuts perform is already reachable as a real, named button in the
 * category list below the world — `Housing $1,500`, `Income $4,200`. Exposing
 * a second control for the same action would put two entries in the
 * accessibility tree for one thing and make the list ambiguous.
 *
 * That is only legitimate because the equivalent exists. It is the chart-and-
 * data-table pattern, not the trap of burying the sole carrier of an action
 * inside `aria-hidden` — which is exactly what happened to the overspend
 * `role="alert"` in this same overlay.
 *
 * `pointer-events-auto` because World.tsx's sprite overlay is
 * `pointer-events-none`; without it the sprites stay decorative and nothing
 * below them is reachable either.
 */
function Touchable({
  onPress,
  label,
  children,
}: {
  onPress?: () => void
  label: string
  children: ReactNode
}) {
  if (!onPress) return <>{children}</>
  return (
    <button
      type="button"
      aria-hidden="true"
      tabIndex={-1}
      title={label}
      onClick={onPress}
      className="pointer-events-auto block cursor-pointer bg-transparent p-0"
      style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH }}
      data-world-touch={label}
    >
      {children}
    </button>
  )
}

/**
 * T016 — houses and residents at every expense tributary's end, a reservoir
 * for savings. T023's overspend art (cracked bed, warning) lives here too:
 * both are DOM sprites positioned in CSS pixels over the SVG, the same
 * overlay World.tsx already carries for this reason (art-bible.md §1).
 */
export function Settlements({ model, budget, scale, onSelect, onEditIncome }: Props) {
  const hasFlow = model.state !== 'empty'

  return (
    <>
      {hasFlow && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: trunkX(SPRING_Y) * scale, top: SPRING_Y * scale }}
        >
          <Touchable onPress={onEditIncome} label="Edit income">
            <PixelSprite art={SPRING} palette={PAL} scale={scale} fps={WORLD_FPS} alt="" />
          </Touchable>
        </div>
      )}

      {model.tributaries.map((trib) => {
        if (trib.width <= 0) return null
        const trunkW = trunkWidthAt(model, trib.atY)
        const { x, y } = tributaryEnd(trib.atY, trib.side, trunkW)
        const left = x * scale
        const top = y * scale
        // The shore the branch arrives at. Drawn from the settlement's frame
        // rather than the river's so the two cannot disagree about where the
        // water stops — one call, one answer.
        const shore = tributaryWaterEnd(trib.atY, trib.side, trunkW)

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
                <Signboard label={category.label} color={category.color} scale={scale} width={rankWidth} side={trib.side} />
              )}
              <Touchable
                onPress={onSelect && (() => onSelect(trib.categoryId))}
                label={category ? `Select ${category.label}` : 'Select savings'}
              >
                <PixelSprite art={RESERVOIR} palette={PAL} scale={scale} fps={WORLD_FPS} alt="Savings reservoir" />
              </Touchable>
            </div>
          )
        }

        /**
         * Every settlement the engine counted, not a sample of them. FR-007 ties
         * the count to the amount, so capping it made $1,500 of Housing render
         * exactly like $650 of Food — the largest expense stopped looking
         * largest and the metaphor flattened.
         *
         * Where they stand is `hamlet.ts`. It used to be a `flex flex-wrap` of
         * fixed width, which is to say the browser decided: three to a row, one
         * uniform gap, every roofline on the same line, and every village the
         * same shape as every other one. There was no arrangement to vary.
         */
        const houses = Math.max(0, Math.floor(trib.settlements) || 0)
        const residents = Math.max(0, Math.floor(trib.residents) || 0)
        // The category's own icon, or the house for a budget saved before
        // icons existed. `iconArt` is total, so an unknown name draws too.
        const art = iconArt(category?.icon)
        const noun = iconPlural(category?.icon)
        const village = hamlet({
          id: trib.categoryId,
          buildings: houses,
          residents,
          building: artSize(art),
          resident: artSize(RESIDENT),
          maxWidth: RANK_ART_W,
        })
        // One alt per kind, on the first sprite of each: six buildings
        // announcing themselves individually would bury the world's own label.
        const labelled = new Map<string, string>()
        const firstOf = (kind: 'building' | 'resident') =>
          village.spots.find((s) => s.kind === kind)?.key
        if (houses > 0) labelled.set(firstOf('building') ?? '', `${noun}, ${houses}`)
        if (residents > 0) labelled.set(firstOf('resident') ?? '', `Residents, ${residents}`)
        return (
          <div key={trib.categoryId} className="absolute">
            <span
              data-settlement="pond"
              aria-hidden="true"
              className="absolute -translate-x-1/2 -translate-y-1/2 block"
              style={{ left: shore.x * scale, top: shore.y * scale }}
            >
              <PixelSprite art={POND} palette={PAL} scale={scale} fps={WORLD_FPS} alt="" />
            </span>
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left, top }}
            >
            {category && (
              <Signboard label={category.label} color={category.color} scale={scale} width={rankWidth} side={trib.side} />
            )}
            <Touchable
              onPress={onSelect && (() => onSelect(trib.categoryId))}
              label={category ? `Select ${category.label}` : 'Select category'}
            >
            <div
              className="relative"
              style={{ width: village.w * scale, height: village.h * scale }}
            >
              {village.spots.map((spot, order) => (
                  <span
                    key={spot.key}
                    data-settlement={spot.kind}
                    className="absolute block"
                    style={{
                      left: spot.x * scale,
                      top: spot.y * scale,
                      // One art-pixel, whatever the zoom.
                      ['--settle-rise' as string]: `${scale}px`,
                      animation: `pixel-settle ${SETTLE_MS}ms steps(2) both`,
                      animationDelay: `${order * SETTLE_STAGGER_MS}ms`,
                    }}
                  >
                    <PixelSprite
                      art={spot.kind === 'building' ? art : RESIDENT}
                      palette={PAL}
                      scale={scale}
                      fps={WORLD_FPS}
                      alt={labelled.get(spot.key) ?? ''}
                    />
                  </span>
              ))}
            </div>
            </Touchable>
            </div>
          </div>
        )
      })}

      <MouthTally model={model} scale={scale} />

      {model.state === 'overspent' && <OverspendMark model={model} scale={scale} />}
    </>
  )
}

/**
 * One art frame's size in art-pixels. `hamlet.ts` lays out boxes and must stay
 * free of the sprite format, so the measuring happens here.
 */
function artSize(art: Art | readonly Art[]): { w: number; h: number } {
  const frame = (Array.isArray(art[0]) ? (art as readonly Art[])[0] : art) as Art
  return { w: frame[0]?.length ?? 0, h: frame.length }
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
  side,
}: {
  label: string
  color: PaletteKey
  scale: number
  width: number
  /** Which bank the village stands on — its tributary arrives from the other one. */
  side: 'left' | 'right'
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
      // A marker, so a gate can find a board by asking rather than by guessing
      // at a background colour. @Pollen's #75 found four of six boards
      // overlapping something with every gate on the board green — labels were
      // the only thing in the world with no geometric check at all, because
      // they carry a background colour rather than an image and so were never
      // in the sprite census.
      data-signboard={label}
      className="absolute bottom-full left-1/2 whitespace-nowrap"
      style={{
        // Anchored away from the river rather than centred on the village.
        // Centred, the board sits exactly where its own tributary arrives —
        // measured at 390x844, four of six labels overlapped something, and
        // Entertainment's board had six rects of its own water under it.
        // The branch always comes from the trunk, so the far edge is the one
        // side of a village that nothing else is using.
        transform: `translateX(${side === 'right' ? '-30%' : '-70%'})`,
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
        {/* The pulse is scale and opacity on the wrapper, never on the sprite art
            and never hue (art-bible.md §5, and FR-012 forbids colour-only
            signals). The global reduced-motion rule stops it with everything
            else, and the triangle still reads without it. */}
        <span className="warning-pulse inline-block">
          <PixelSprite art={WARNING} palette={PAL} scale={scale} fps={WORLD_FPS} alt="Overspent" />
        </span>
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
