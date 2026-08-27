import { CATEGORY_META } from '../fixtures/budget'
import { formatMoney } from '../engine/budget'
import type { CategoryKey } from '../types'

interface Props {
  selected: CategoryKey
  amount: number
  impact: string | null
  busy: boolean
  onStep: (delta: 50 | -50) => void
  onReset: () => void
}

export function Controls({ selected, amount, impact, busy, onStep, onReset }: Props) {
  const label = CATEGORY_META[selected].label
  const minusDisabled = busy || amount <= 0

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
      <p className="text-sm text-slate-300">
        Selected: <span className="font-semibold text-amber-100">{label}</span>
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-50">{formatMoney(amount)}</p>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label} by $50`}
          disabled={minusDisabled}
          onClick={() => onStep(-50)}
          className="min-h-11 min-w-11 rounded-lg bg-slate-700 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <div className="h-3 flex-1 rounded-full bg-slate-700">
          <div className="h-3 w-1/2 rounded-full bg-amber-300" />
        </div>
        <button
          type="button"
          aria-label={`Increase ${label} by $50`}
          disabled={busy}
          onClick={() => onStep(50)}
          className="min-h-11 min-w-11 rounded-lg bg-amber-300 text-lg font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </div>

      {impact && <p className="mt-2 text-sm text-slate-200">{impact}</p>}

      <button
        type="button"
        disabled={busy}
        onClick={onReset}
        className="mt-3 min-h-11 w-full rounded-lg border border-slate-500 px-3 text-sm font-medium text-slate-100 disabled:opacity-40"
      >
        Reset
      </button>
    </section>
  )
}
