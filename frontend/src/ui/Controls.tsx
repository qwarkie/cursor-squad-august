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
      <p className="controls-kicker">Selected district</p>
      <p className="controls-selected">
        <span className={`swatch swatch-${selected}`} aria-hidden />
        {label}
      </p>
      <p className="controls-amount">{formatMoney(amount)}</p>

      <div className="stepper">
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

      {impact && <p className="impact">{impact}</p>}

      <button type="button" disabled={busy} onClick={onReset} className="hit-reset">
        Reset town
      </button>
    </section>
  )
}
