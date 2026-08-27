import { formatDelta } from './money'
import { HEX } from './palette'

/**
 * T022 — the trade-off, in words (FR-011) — and the way back from it.
 *
 * `Food −$100 → Remaining +$100`. The river already shows that something got
 * smaller; the sentence is what makes it a *choice* rather than an animation.
 * Undo sits in the same row because it is the same thought: this is what just
 * changed, and this is how you take it back.
 *
 * Deliberately not in Press Start 2P — it is a sentence, and the display face
 * is unreadable as one at 390 px (art-bible §6).
 *
 * The row is always in the layout, empty or not, and its height is a constant
 * rather than a consequence. Mounting the sentence on the first change pushed
 * the whole world down 35px and unmounting it pulled the world back up, so the
 * river slid twice during the demo's most-repeated beat — press `−`, then
 * press `+` back. The same trap applies to the button: it is always mounted
 * and merely fades, because appearing on the first change would move the world
 * exactly the way the sentence used to. Nothing in this row changes its size.
 */
export interface TradeOffProps {
  change: { label: string; delta: number } | null
  /**
   * What undo would take back, in words — `removing Food`. `null` means there
   * is nothing to take back, and the control fades out rather than unmounting.
   */
  undoLabel: string | null
  onUndo: () => void
}

export function TradeOff({ change, undoLabel, onUndo }: TradeOffProps) {
  const showing = change !== null && change.delta !== 0
  const canUndo = undoLabel !== null
  return (
    <div
      className="flex min-h-[44px] w-full items-center gap-2 px-4"
      style={{ background: HEX.ink, color: HEX.paper }}
    >
      {/* The button is a sibling of the live region, never a child of it.
          Inside, every announcement of the sentence would drag the word
          "Undo" along with it, and a control read out on every slider step
          is noise rather than an affordance. */}
      <p
        role="status"
        aria-live="polite"
        data-showing={showing}
        className="trade-off min-w-0 flex-1 text-center text-sm leading-snug"
      >
        {showing
          ? `${change.label} ${formatDelta(change.delta)} → Remaining ${formatDelta(-change.delta)}`
          : ' '}
      </p>
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        // Disabled takes it out of the tab order, and hidden takes it out of
        // the accessibility tree — so an empty history offers nothing to a
        // pointer, a keyboard, or a screen reader, while still holding its box.
        aria-hidden={!canUndo}
        aria-label={canUndo ? `Undo ${undoLabel}` : undefined}
        data-undo={canUndo}
        className="trade-off min-h-[44px] shrink-0 cursor-pointer px-2 font-pixel text-[8px] leading-none underline decoration-dotted underline-offset-4 disabled:cursor-default"
        style={{ color: HEX.gold }}
      >
        Undo
      </button>
    </div>
  )
}
