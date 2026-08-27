/**
 * Whole dollars, grouped, no cents — `$4,200`.
 *
 * Negative figures read `−$400`, with a true minus sign and the sign outside
 * the currency mark. `-$400` in a hyphen is easy to miss at 10 px on a phone,
 * and the overspent figure is the one number a judge must not misread.
 */
const FORMAT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return '$0'
  const rounded = Math.round(amount)
  const magnitude = FORMAT.format(Math.abs(rounded))
  return rounded < 0 ? `−${magnitude}` : magnitude
}

/** `Food −$100 → Remaining +$100` — the trade-off sentence (FR-011). */
export function formatDelta(amount: number): string {
  const rounded = Math.round(amount)
  const magnitude = FORMAT.format(Math.abs(rounded))
  if (rounded === 0) return `${magnitude}`
  return rounded < 0 ? `−${magnitude}` : `+${magnitude}`
}
