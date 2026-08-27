import { formatMoney, formatPercent } from '../engine/budget'
import type { BudgetResponse } from '../types'

interface Props {
  budget: BudgetResponse
}

export function Header({ budget }: Props) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-amber-100">Money World</h1>
        <p className="mt-1 text-sm text-slate-300">May 2026</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold tabular-nums text-amber-50">
          {formatMoney(budget.remaining)} left
        </p>
        <p className="mt-1 text-sm text-slate-300">{formatPercent(budget.savings_rate)} saved</p>
        {budget.overspent && (
          <p className="mt-1 text-sm font-semibold text-red-300">Overspent</p>
        )}
      </div>
    </header>
  )
}
