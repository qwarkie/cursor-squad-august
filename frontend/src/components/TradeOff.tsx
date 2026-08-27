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
 */
export interface TradeOffProps {
  change: { label: string; delta: number } | null
}

export function TradeOff({ change }: TradeOffProps) {
  if (!change || change.delta === 0) return null
  return (
    <p
      role="status"
      aria-live="polite"
      className="px-4 py-2 text-center text-sm leading-snug"
      style={{ background: HEX.ink, color: HEX.paper }}
    >
      {change.label} {formatDelta(change.delta)} → Remaining {formatDelta(-change.delta)}
    </p>
  )
}
