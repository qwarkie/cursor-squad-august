/**
 * Input validation for the chrome layer.
 *
 * Separate from the components so it can be unit-tested in Node — the suite
 * has no DOM environment, and these rules are the part of the form worth
 * testing anyway.
 */

/** `{ income }` when the text is a usable income, `{ error }` with the reason otherwise. */
export function validateIncome(raw: string): { income: number } | { error: string } {
  const text = raw.trim().replace(/[$,\s]/g, '')
  if (text === '') return { error: 'Enter a monthly income to start the river.' }
  if (!/^-?\d+(\.\d+)?$/.test(text)) return { error: 'Numbers only — try 4200.' }
  const value = Number(text)
  if (!Number.isFinite(value)) return { error: 'Numbers only — try 4200.' }
  if (value < 0) return { error: 'Income cannot be negative.' }
  if (value === 0) return { error: 'Income needs to be more than $0 for a river to flow.' }
  return { income: Math.round(value) }
}

/** Category amounts differ from income: `0` is legal — it closes the tributary. */
export function validateAmount(raw: string): { amount: number } | { error: string } {
  const text = raw.trim().replace(/[$,\s]/g, '')
  if (text === '') return { error: 'Enter an amount — 0 is fine, it just closes the tributary.' }
  if (!/^-?\d+(\.\d+)?$/.test(text)) return { error: 'Numbers only — try 1500.' }
  const value = Number(text)
  if (!Number.isFinite(value)) return { error: 'Numbers only — try 1500.' }
  if (value < 0) return { error: 'An amount cannot be negative.' }
  return { amount: Math.round(value) }
}
