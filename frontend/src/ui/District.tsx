import { CATEGORY_META } from '../fixtures/budget'
import { formatMoney, units } from '../engine/budget'
import type { CategoryKey } from '../types'

interface Props {
  categoryKey: CategoryKey
  amount: number
  selected: boolean
  onSelect: (key: CategoryKey) => void
}

const SPRITE_CAP: Record<CategoryKey, number> = {
  housing: 8,
  food: 6,
  transport: 6,
  entertainment: 6,
  savings: 8,
}

function SpriteRow({
  categoryKey,
  count,
}: {
  categoryKey: CategoryKey
  count: number
}) {
  const shown = Math.max(count === 0 ? 0 : 1, Math.min(count, SPRITE_CAP[categoryKey]))
  const scale = 0.55 + Math.min(count, 24) / 40

  return (
    <div className="pixel-stage mt-2" style={{ transform: `scale(${scale})` }}>
      {Array.from({ length: shown }, (_, index) => (
        <span key={index} className={`pixel-sprite pixel-${categoryKey}`} />
      ))}
      {categoryKey === 'transport' && count > 0 && <span className="pixel-sprite pixel-car" />}
    </div>
  )
}

export function District({ categoryKey, amount, selected, onSelect }: Props) {
  const meta = CATEGORY_META[categoryKey]
  const count = units(amount)

  return (
    <button
      type="button"
      data-units={String(count)}
      onClick={() => onSelect(categoryKey)}
      className={`district min-h-11 min-w-11 ${selected ? 'is-selected' : ''}`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-400">{meta.district}</p>
      <p className="mt-0.5 text-sm font-semibold">{meta.label}</p>
      <p className="mt-1 text-sm tabular-nums">{formatMoney(amount)}</p>
      <SpriteRow categoryKey={categoryKey} count={count} />
    </button>
  )
}
