import { useState, type FormEvent } from 'react'

import type { CategoryKind, PaletteKey } from '../types'
import { CATEGORY_COLORS, HEX } from './palette'
import { validateAmount } from './validate'

/**
 * T014 — add a category.
 *
 * Kind is a two-button choice rather than a select, because `savings` is not a
 * detail: it is the difference between a settlement and a reservoir, between
 * money spent and money held. Burying it in a dropdown loses the one idea the
 * product is arguing for.
 */
export interface CategorySheetProps {
  onSubmit: (input: { label: string; amount: number; kind: CategoryKind; color: PaletteKey }) => void
  onCancel: () => void
}

export function CategorySheet({ onSubmit, onCancel }: CategorySheetProps) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState<CategoryKind>('expense')
  const [color, setColor] = useState<PaletteKey>(CATEGORY_COLORS[0].key)
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = label.trim()
    if (trimmed === '') {
      setError('Give the category a name — Housing, Food, anything.')
      return
    }
    const parsed = validateAmount(amount)
    if ('error' in parsed) {
      setError(parsed.error)
      return
    }
    setError(null)
    onSubmit({ label: trimmed.slice(0, 20), amount: parsed.amount, kind, color })
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
        style={{ background: HEX.night, borderTop: `3px solid ${HEX.ink}`, color: HEX.paper }}
      >
        <label htmlFor="cat-label" className="font-pixel text-[10px] leading-relaxed">
          Category
        </label>
        <input
          id="cat-label"
          autoFocus
          value={label}
          maxLength={20}
          onChange={(e) => {
            setLabel(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Housing"
          className="mt-2 min-h-[48px] w-full px-4 font-pixel text-[12px]"
          style={{ background: HEX.paper, color: HEX.ink, border: `3px solid ${HEX.ink}` }}
        />

        <label htmlFor="cat-amount" className="mt-4 block font-pixel text-[10px] leading-relaxed">
          Amount
        </label>
        <input
          id="cat-amount"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            if (error) setError(null)
          }}
          placeholder="1500"
          aria-invalid={error !== null}
          className="mt-2 min-h-[48px] w-full px-4 font-pixel text-[12px]"
          style={{ background: HEX.paper, color: HEX.ink, border: `3px solid ${HEX.ink}` }}
        />

        <fieldset className="mt-4">
          <legend className="font-pixel text-[10px]">Kind</legend>
          <div className="mt-2 flex gap-3">
            {(['expense', 'savings'] as CategoryKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className="min-h-[44px] flex-1 cursor-pointer font-pixel text-[10px] leading-none"
                style={{
                  background: kind === k ? HEX.gold : 'transparent',
                  color: kind === k ? HEX.ink : HEX.paper,
                  border: `3px solid ${kind === k ? HEX.ink : HEX.paper}`,
                }}
              >
                {k === 'expense' ? 'Spent' : 'Saved'}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-snug opacity-80">
            {kind === 'expense'
              ? 'Ends in houses — money that turned into something.'
              : 'Ends in a reservoir — money held, not consumed.'}
          </p>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="font-pixel text-[10px]">Colour</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setColor(c.key)}
                aria-pressed={color === c.key}
                aria-label={c.name}
                className="size-[44px] cursor-pointer"
                style={{
                  background: c.hex,
                  border: `3px solid ${color === c.key ? HEX.paper : HEX.ink}`,
                }}
              />
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="mt-3 text-sm leading-snug" style={{ color: HEX.alert }}>
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
            Add tributary
          </button>
        </div>
      </form>
    </div>
  )
}
