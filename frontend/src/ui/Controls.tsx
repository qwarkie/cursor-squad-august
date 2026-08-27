import { CATEGORY_META } from '../fixtures/budget'
import { formatMoney } from '../engine/budget'
import type { CategoryKey } from '../types'

interface Props {
  selected: CategoryKey
  amount: number
  impact: string | null
  busy: boolean
  onStep: (delta: 50 | -50) => void
  onSetAmount: (amount: number) => void
  onReset: () => void
}

const SLIDER_MAX = 3000

export function Controls({
  selected,
  amount,
  impact,
  busy,
  onStep,
  onSetAmount,
  onReset,
}: Props) {
  const label = CATEGORY_META[selected].label
  const minusDisabled = busy || amount <= 0
  const sliderMax = Math.max(SLIDER_MAX, amount)

  return (
    <section className="controls">
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
          className="hit"
        >
          −
        </button>
        <input
          type="range"
          min={0}
          max={sliderMax}
          step={50}
          value={amount}
          disabled={busy}
          aria-label={`${label} amount`}
          className="slider"
          onChange={(event) => onSetAmount(Number(event.target.value))}
        />
        <button
          type="button"
          aria-label={`Increase ${label} by $50`}
          disabled={busy}
          onClick={() => onStep(50)}
          className="hit hit-plus"
        >
          +
        </button>
      </div>

      {impact && <p className="mt-2 text-sm text-slate-200">{impact}</p>}

      <button type="button" disabled={busy} onClick={onReset} className="hit-reset">
        Reset
      </button>
    </section>
  )
}
