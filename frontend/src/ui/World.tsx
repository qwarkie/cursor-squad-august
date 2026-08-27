import { CATEGORY_KEYS } from '../fixtures/budget'
import type { BudgetResponse, CategoryKey } from '../types'
import { District } from './District'

interface Props {
  budget: BudgetResponse
  selected: CategoryKey
  onSelect: (key: CategoryKey) => void
}

export function World({ budget, selected, onSelect }: Props) {
  return (
    <section
      data-overspent={budget.overspent ? 'true' : 'false'}
      className={`world-grid grid grid-cols-2 gap-2 rounded-xl border p-3 ${
        budget.overspent
          ? 'world-overspent border-red-400 bg-red-950/40'
          : 'border-slate-700 bg-slate-900/60'
      }`}
    >
      {CATEGORY_KEYS.map((key) => (
        <District
          key={key}
          categoryKey={key}
          amount={budget.categories[key]}
          selected={selected === key}
          onSelect={onSelect}
        />
      ))}
    </section>
  )
}
