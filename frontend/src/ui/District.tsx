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
  housing: 6,
  food: 5,
  transport: 1,
  entertainment: 5,
  savings: 6,
}

function House() {
  return (
    <span className="spr house">
      <span className="house-smoke" />
      <span className="house-chimney" />
      <span className="house-roof" />
      <span className="house-body" />
      <span className="house-window" />
      <span className="house-door" />
    </span>
  )
}

function Stall() {
  return (
    <span className="spr stall">
      <span className="stall-awning" />
      <span className="stall-body" />
      <span className="stall-crate" />
    </span>
  )
}

function Road() {
  return (
    <span className="roadbed">
      <span className="road-line" />
      <span className="car" />
    </span>
  )
}

function Tree() {
  return (
    <span className="spr tree">
      <span className="tree-leaf" />
      <span className="tree-trunk" />
    </span>
  )
}

function Arcade() {
  return <span className="spr arcade" />
}

function Vault() {
  return <span className="spr vault" />
}

function SpriteRow({
  categoryKey,
  count,
}: {
  categoryKey: CategoryKey
  count: number
}) {
  const shown = Math.max(count === 0 ? 0 : 1, Math.min(count, SPRITE_CAP[categoryKey]))
  const scale = 0.72 + Math.min(count, 20) / 50

  return (
    <div className="pixel-stage" style={{ transform: `scale(${scale})` }}>
      {categoryKey === 'housing' && Array.from({ length: shown }, (_, i) => <House key={i} />)}
      {categoryKey === 'food' && Array.from({ length: shown }, (_, i) => <Stall key={i} />)}
      {categoryKey === 'transport' && count > 0 && <Road />}
      {categoryKey === 'entertainment' &&
        Array.from({ length: shown }, (_, i) => (i % 2 === 0 ? <Tree key={i} /> : <Arcade key={i} />))}
      {categoryKey === 'savings' && (
        <>
          <Vault />
          {Array.from({ length: Math.max(0, shown - 1) }, (_, i) => (
            <Tree key={i} />
          ))}
        </>
      )}
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
      className={`district district-${categoryKey} min-h-11 min-w-11 ${selected ? 'is-selected' : ''}`}
    >
      <p className="district-name">{meta.district}</p>
      <p className="district-label">{meta.label}</p>
      <p className="district-amount">{formatMoney(amount)}</p>
      <SpriteRow categoryKey={categoryKey} count={count} />
    </button>
  )
}
