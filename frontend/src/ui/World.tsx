import type { BudgetResponse, CategoryKey } from '../types'
import { District } from './District'

interface Props {
  budget: BudgetResponse
  selected: CategoryKey
  onSelect: (key: CategoryKey) => void
}

const LAYOUT: CategoryKey[][] = [
  ['housing', 'food'],
  ['transport'],
  ['entertainment', 'savings'],
]

export function World({ budget, selected, onSelect }: Props) {
  return (
    <section
      data-overspent={budget.overspent ? 'true' : 'false'}
      className={`town ${budget.overspent ? 'world-overspent' : ''}`}
    >
      {budget.overspent && (
        <p className="storm-banner" aria-live="polite">
          Overspent
        </p>
      )}
      {LAYOUT.map((row) => (
        <div key={row.join('-')} className={row.length === 1 ? 'town-road' : 'town-row'}>
          {row.map((key) => (
            <District
              key={key}
              categoryKey={key}
              amount={budget.categories[key]}
              selected={selected === key}
              onSelect={onSelect}
            />
          ))}
        </div>
      ))}
    </section>
  )
}
