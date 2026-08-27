import { useState, type FormEvent } from 'react'

import { validateIncome } from './validate'

/**
 * T010 — income entry.
 *
 * Rejects empty, zero, negative and non-numeric input with a message the
 * person can see, and changes nothing when it rejects (spec US1 scenario 4).
 * Validating here rather than in the store is deliberate: the store clamps to
 * keep its own invariants, and a clamp is silent. A judge who types `-5` and
 * watches a river appear at `$0` has been told nothing.
 */
const INK = '#1b2a4a'
const NIGHT = '#101a33'
const PAPER = '#f4efe4'
const GOLD = '#ffd94a'
const ALERT = '#e0453f'

export interface IncomeSheetProps {
  /** Pre-fills the field when editing an existing income. */
  initial?: number
  onSubmit: (income: number) => void
  onCancel: () => void
}

export function IncomeSheet({ initial, onSubmit, onCancel }: IncomeSheetProps) {
  const [raw, setRaw] = useState(initial ? String(initial) : '')
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const result = validateIncome(raw)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setError(null)
    onSubmit(result.income)
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onCancel}
        className="absolute inset-0 cursor-pointer bg-black/50"
      />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md px-4 pb-6 pt-5"
        style={{ background: NIGHT, borderTop: `3px solid ${INK}`, color: PAPER }}
      >
        <label htmlFor="income" className="font-pixel text-[10px] leading-relaxed">
          Monthly income
        </label>
        <input
          id="income"
          name="income"
          type="text"
          inputMode="decimal"
          autoFocus
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value)
            if (error) setError(null)
          }}
          placeholder="4200"
          aria-invalid={error !== null}
          aria-describedby={error ? 'income-error' : undefined}
          className="mt-3 min-h-[56px] w-full px-4 font-pixel text-[14px]"
          style={{ background: PAPER, color: INK, border: `3px solid ${INK}` }}
        />

        {error && (
          <p
            id="income-error"
            role="alert"
            className="mt-3 text-sm leading-snug"
            style={{ color: ALERT }}
          >
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] flex-1 cursor-pointer font-pixel text-[10px] leading-none"
            style={{ background: 'transparent', color: PAPER, border: `3px solid ${PAPER}` }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-[48px] flex-[2] cursor-pointer font-pixel text-[10px] leading-none"
            style={{ background: GOLD, color: INK, border: `3px solid ${INK}` }}
          >
            Start the river
          </button>
        </div>
      </form>
    </div>
  )
}
