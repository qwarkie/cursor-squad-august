import { formatDelta } from './money'
import { HEX } from './palette'

/**
 * T022 — the trade-off, in words (FR-011).
 *
 * `Food −$100 → Remaining +$100`. The river already shows that something got
 * smaller; the sentence is what makes it a *choice* rather than an animation.
 *
 * Deliberately not in Press Start 2P — it is a sentence, and the display face
 * is unreadable as one at 390 px (art-bible §6).
 *
 * The row is always in the layout, empty or not. Mounting it on the first
 * change pushed the whole world down 35px and unmounting it pulled the world
 * back up, so the river slid twice during the demo's most-repeated beat —
 * press `−`, then press `+` back. A non-breaking space holds the line box
 * without a magic height, and the sentence fades in rather than appearing.
 */
export interface TradeOffProps {
  change: { label: string; delta: number } | null
}

export function TradeOff({ change }: TradeOffProps) {
  const showing = change !== null && change.delta !== 0
  return (
    <p
      role="status"
      aria-live="polite"
      data-showing={showing}
      className="trade-off px-4 py-2 text-center text-sm leading-snug"
      style={{ background: HEX.ink, color: HEX.paper }}
    >
      {showing
        ? `${change.label} ${formatDelta(change.delta)} → Remaining ${formatDelta(-change.delta)}`
        : ' '}
    </p>
  )
}
