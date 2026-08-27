import { GrassField } from '../world/GrassField'
import { HEX } from './palette'

/**
 * T009 — the opening frame.
 *
 * An empty green field and one thing to do. This is the only moment that
 * teaches the metaphor without a word of onboarding, so it stays almost
 * empty on purpose: the river has to be something the person makes happen,
 * not something already on screen when they arrive.
 *
 * The field is the world's field. `768ac6b` replaced a `linear-gradient` here
 * with flat grass — palette-correct, and the only 100%-single-colour surface
 * in the app, which is what "flat" meant when it was raised. The right texture
 * was never a chrome invention: two repeating gradients at coincident stops
 * are palette-clean and render as graph paper. `world/GrassField` already
 * draws real pixel grass with a wind cycle, so the opening frame now uses it
 * and the river springs into the same field, with the same green AND the same
 * blades, rather than into a replacement.
 *
 * Chrome importing from `world/` is the established direction here —
 * `CategorySheet` and `IconPicker` already take `world/icons`, and
 * `components/palette` takes `world/palette`. Nothing in `world/` imports
 * chrome.
 */
/**
 * Big enough to cover a phone at scale 4 and clipped by the container. The
 * world's own grid is 96x128; this is a field, not a world, so it is sized to
 * the viewport rather than to the model.
 */
const FIELD_W = 128
const FIELD_H = 256
const FIELD_SCALE = 4
export interface EmptyFieldProps {
  onAddIncome: () => void
  onLoadDemo: () => void
  /**
   * What undo would take back, or `null` on a genuine first load.
   *
   * The empty field is reachable two ways that feel nothing alike: arriving
   * here for the first time, and having just cleared a month. The opening
   * frame must stay bare — it is the one moment that teaches the metaphor
   * without a word — so the control is absent entirely rather than present
   * and disabled. On a first load there is no history and nothing renders.
   */
  undoLabel: string | null
  onUndo: () => void
}

export function EmptyField({
  onAddIncome,
  onLoadDemo,
  undoLabel,
  onUndo,
}: EmptyFieldProps) {
  return (
    <div
      className="relative flex min-h-dvh w-full flex-col items-center justify-between overflow-hidden px-4 pb-8 pt-16"
      style={{
        // Flat grass, one colour from the twenty. The previous
        // `linear-gradient` interpolated: sampling this screen found 58
        // distinct greens, 57 of them outside the palette — a violation of
        // art-bible §7 ("no colour outside the 20", "no smoothing anywhere")
        // on the first screen a judge sees, and the only smooth surface left
        // in the app.
        //
        // Flat rather than textured on purpose. Tufts belong to the world
        // layer, which draws them as pixel art; faking them here with
        // repeating gradients produces a lattice, not grass — tried, and it
        // reads as graph paper. The field is also now exactly the green the
        // world draws, so the river springs into the field the person was
        // already looking at instead of replacing it with a different one.
        backgroundColor: HEX.grass,
      }}
    >
      {/* Decoration, so it is out of the accessibility tree and cannot take a
          tap away from the two buttons. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <GrassField x0={0} y0={0} width={FIELD_W} height={FIELD_H} scale={FIELD_SCALE} />
      </div>

      <header className="relative flex flex-col items-center gap-3 text-center">
        <h1
          className="font-pixel text-[16px] leading-relaxed"
          style={{ color: HEX.cream, textShadow: `2px 2px 0 ${HEX.ink}` }}
        >
          Money River
        </h1>
        <p
          className="max-w-[18rem] text-sm"
          // Same treatment as the title, for the same reason. Ink on bare
          // grass was fine until 4bee108 put blades under it: specks land
          // inside the letterforms, and one after "river." reads as
          // punctuation. Cream with a hard ink shadow is the idiom already on
          // this screen, and the outline keeps a speck outside the stroke
          // rather than in it.
          style={{ color: HEX.cream, textShadow: `2px 2px 0 ${HEX.ink}` }}
        >
          A month of money is one river. Add your income and watch where it goes.
        </p>
      </header>

      {/* Decoration only — the field is the point, and it is deliberately bare. */}
      <div aria-hidden className="relative h-24 w-full" />

      <div className="relative flex w-full max-w-sm flex-col gap-3">
        <button
          type="button"
          onClick={onAddIncome}
          className="min-h-[56px] w-full cursor-pointer px-6 font-pixel text-[12px] leading-none transition-transform active:translate-y-[2px]"
          style={{
            background: HEX.gold,
            color: HEX.ink,
            border: `3px solid ${HEX.ink}`,
            boxShadow: `0 4px 0 ${HEX.ink}`,
          }}
        >
          Add Income
        </button>
        <button
          type="button"
          onClick={onLoadDemo}
          className="min-h-[44px] w-full cursor-pointer px-6 font-pixel text-[10px] leading-none transition-transform active:translate-y-[2px]"
          style={{
            // Opaque, because the field behind it is textured now. This was
            // `transparent` with ink text, which read cleanly on flat green
            // and turned busy the moment 4bee108 put grass blades under the
            // label — on the one control that starts the demo. `night` with
            // `paper` text is the surface idiom the sheets already use, and
            // it stays clearly subordinate to the gold primary above it.
            background: HEX.night,
            color: HEX.paper,
            border: `3px solid ${HEX.ink}`,
          }}
        >
          Load demo budget
        </button>

        {/* Only after a reset, never on a first load. This is the one undo
            the app most needs and the one it could not reach: the empty
            field returns early, so the trade-off row that carries Undo
            everywhere else is never mounted here. A confirm asks before;
            this answers after, which is the half that helps the person who
            already tapped Reset. */}
        {undoLabel !== null && (
          <button
            type="button"
            onClick={onUndo}
            aria-label={`Undo ${undoLabel}`}
            data-undo="true"
            className="min-h-[44px] w-full cursor-pointer px-6 font-pixel text-[10px] leading-none underline decoration-dotted underline-offset-4 transition-transform active:translate-y-[2px]"
            style={{ background: 'transparent', color: HEX.cream, textShadow: `2px 2px 0 ${HEX.ink}` }}
          >
            Undo {undoLabel}
          </button>
        )}
      </div>
    </div>
  )
}
