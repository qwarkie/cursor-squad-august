import { formatMoney } from '../engine/budget'
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

function coinCount(remaining: number): number {
  if (remaining <= 0) return 0
  return Math.min(12, Math.max(1, Math.floor(remaining / 50)))
}

export function World({ budget, selected, onSelect }: Props) {
  const coins = coinCount(budget.remaining)

  return (
    <section
      data-overspent={budget.overspent ? 'true' : 'false'}
      className={`town ${budget.overspent ? 'world-overspent is-storm' : ''}`}
    >
      <div className="sky" aria-hidden>
        <span className="cloud cloud-a" />
        <span className="cloud cloud-b" />
      </div>
      {budget.overspent && (
        <p className="storm-banner" aria-live="polite">
          Overspent
        </p>
      )}
      <div className="treasury">
        <div className="treasury-label">
          <p className="treasury-kicker">Town treasury</p>
          <p className="treasury-copy">
            {budget.overspent
              ? 'The well ran dry — cut a district'
              : budget.remaining === 0
                ? 'Every dollar is already placed'
                : `${formatMoney(budget.remaining)} sitting unused`}
          </p>
        </div>
        <div className="coin-row" aria-hidden>
          {Array.from({ length: coins }, (_, index) => (
            <span key={index} className="coin" />
          ))}
        </div>
      </div>
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
