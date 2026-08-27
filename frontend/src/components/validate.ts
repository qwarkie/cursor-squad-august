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

export type TerminalState = 'empty' | 'surplus' | 'balanced' | 'overspent'

/**
 * The chrome-side mirror of `RiverModel.state`.
 *
 * The engine (T004) owns the real one and the world draws from it. This exists
 * so the header can render before the engine lands; point it at the model
 * instead once `budgetToRiver` is on main, rather than keeping two.
 */
export function terminalState(income: number, remaining: number): TerminalState {
  if (income === 0) return 'empty'
  if (remaining > 0) return 'surplus'
  if (remaining === 0) return 'balanced'
  return 'overspent'
}
