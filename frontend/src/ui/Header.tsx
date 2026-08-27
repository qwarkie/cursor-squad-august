import { formatMoney, formatPercent } from '../engine/budget'
import type { BudgetResponse } from '../types'

interface Props {
  budget: BudgetResponse
}

function remainingTone(remaining: number): string {
  if (remaining < 0) return 'is-over'
  if (remaining > 0) return 'is-plus'
  return 'is-tight'
}

export function Header({ budget }: Props) {
  return (
    <header className="hud">
      <div className="hud-top">
        <div>
          <p className="hud-kicker">Pixel budget</p>
          <h1 className="hud-title">Money World</h1>
        </div>
        {budget.overspent && <p className="over-chip">Overspent</p>}
      </div>
      <p className="hud-month">May 2026 · Income {formatMoney(budget.income)}</p>
      <div className="hud-stats">
        <p className={`hud-remaining ${remainingTone(budget.remaining)}`}>
          {formatMoney(budget.remaining)} left
        </p>
        <p className="hud-saved">{formatPercent(budget.savings_rate)} saved</p>
      </div>
    </header>
  )
}
