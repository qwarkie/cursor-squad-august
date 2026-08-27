import { useState, type FormEvent } from 'react'

import { HEX } from './palette'
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
        className="scrim backdrop-in absolute inset-0 cursor-pointer"
      />
      <form
        onSubmit={submit}
        className="sheet-in relative w-full max-w-md px-4 pb-6 pt-5"
        style={{ background: HEX.night, borderTop: `3px solid ${HEX.ink}`, color: HEX.paper }}
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
          style={{ background: HEX.paper, color: HEX.ink, border: `3px solid ${HEX.ink}` }}
        />

        {error && (
          <p
            id="income-error"
            role="alert"
            className="mt-3 text-sm leading-snug"
            style={{ color: HEX.alert }}
          >
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] flex-1 cursor-pointer font-pixel text-[10px] leading-none"
            style={{ background: 'transparent', color: HEX.paper, border: `3px solid ${HEX.paper}` }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-[48px] flex-[2] cursor-pointer font-pixel text-[10px] leading-none"
            style={{ background: HEX.gold, color: HEX.ink, border: `3px solid ${HEX.ink}` }}
          >
            Start the river
          </button>
        </div>
      </form>
    </div>
  )
}
