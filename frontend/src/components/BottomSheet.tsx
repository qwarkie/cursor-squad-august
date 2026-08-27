import type { Category, CategoryIcon } from '../types'
import { IconPicker } from './IconPicker'
import { formatMoney } from './money'
import { HEX, hexForCategory } from './palette'

/**
 * T020 — reshape one tributary.
 *
 * Collapsed to the bottom third so the world stays the thing you are looking
 * at. The point of the interaction is watching the river change, not reading
 * the control that changed it.
 */
const STEP = 50

/**
 * Spelled out to about the number of categories a month has room for; past
 * that the numeral is fine, and nobody is ordering a fourteenth tributary.
 */
const ORDINAL: Record<number, string> = {
  1: 'first',
  2: 'second',
  3: 'third',
  4: 'fourth',
  5: 'fifth',
  6: 'sixth',
  7: 'seventh',
  8: 'eighth',
}

export interface BottomSheetProps {
  category: Category
  /** Ceiling for the slider: this category's amount plus whatever is unspent. */
  sliderMax: number
  onChange: (amount: number) => void
  onIcon: (icon: CategoryIcon) => void
  /**
   * Where this category sits in the order the river is taken in, 1-based, and
   * how many there are. Both are needed to disable the ends: at the top there
   * is nothing to move above, at the bottom nothing to move below.
   */
  position: number
  total: number
  onMove: (direction: 'up' | 'down') => void
  onRemove: () => void
  onClose: () => void
}

export function BottomSheet({
  category,
  sliderMax,
  onChange,
  onIcon,
  position,
  total,
  onMove,
  onRemove,
  onClose,
}: BottomSheetProps) {
  const swatch = hexForCategory(category.color)
  const step = (delta: number) => onChange(Math.max(0, category.amount + delta))

  return (
    <div
      className="sheet-in fixed inset-x-0 bottom-0 z-20 w-full px-4 pt-4"
      style={{
        background: HEX.night,
        borderTop: `3px solid ${HEX.ink}`,
        color: HEX.paper,
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
      }}
    >
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="size-4 shrink-0"
              style={{ background: swatch, border: `2px solid ${HEX.ink}` }}
            />
            <span className="truncate font-pixel text-[12px]">{category.label}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="size-[44px] shrink-0 cursor-pointer font-pixel text-[12px]"
            style={{ background: 'transparent', color: HEX.paper }}
          >
            ×
          </button>
        </div>

        <p className="mt-2 font-pixel text-[16px]" style={{ color: swatch }}>
          {formatMoney(category.amount)}
        </p>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => step(-STEP)}
            aria-label={`Reduce ${category.label} by $${STEP}`}
            disabled={category.amount === 0}
            className="size-[52px] cursor-pointer font-pixel text-[14px] leading-none disabled:opacity-40"
            style={{ background: HEX.paper, color: HEX.ink, border: `3px solid ${HEX.ink}` }}
          >
            −
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(sliderMax, category.amount)}
            step={STEP}
            value={category.amount}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label={`${category.label} amount`}
            className="h-[44px] min-w-0 flex-1 cursor-pointer"
            style={{ accentColor: swatch }}
          />
          <button
            type="button"
            onClick={() => step(STEP)}
            aria-label={`Increase ${category.label} by $${STEP}`}
            className="size-[52px] cursor-pointer font-pixel text-[14px] leading-none"
            style={{ background: HEX.paper, color: HEX.ink, border: `3px solid ${HEX.ink}` }}
          >
            +
          </button>
        </div>

        {/* Under the slider, not above it: the amount is what a judge came to
            this sheet for, and the icon is a decision made once. A savings
            category has no icon — it ends in a reservoir. */}
        {category.kind === 'expense' && (
          <div className="mt-3">
            <IconPicker value={category.icon} onChange={onIcon} />
          </div>
        )}

        {/* Order is not cosmetic: the trunk narrows in the order these are
            taken, so the same six numbers draw a different river depending on
            what comes first. The label says which position you are in rather
            than just offering arrows, because the arrows alone do not tell you
            that position is a thing that matters. */}
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onMove('up')}
            disabled={position <= 1}
            aria-label={`Take ${category.label} earlier`}
            className="size-[48px] shrink-0 cursor-pointer font-pixel text-[12px] leading-none disabled:cursor-default disabled:opacity-30"
            style={{ background: 'transparent', color: HEX.paper, border: `2px solid ${HEX.paper}` }}
          >
            ▲
          </button>
          <p className="min-w-0 flex-1 text-center text-xs leading-snug opacity-70">
            Taken {ORDINAL[position] ?? `${position}th`} of {total}
          </p>
          <button
            type="button"
            onClick={() => onMove('down')}
            disabled={position >= total}
            aria-label={`Take ${category.label} later`}
            className="size-[48px] shrink-0 cursor-pointer font-pixel text-[12px] leading-none disabled:cursor-default disabled:opacity-30"
            style={{ background: 'transparent', color: HEX.paper, border: `2px solid ${HEX.paper}` }}
          >
            ▼
          </button>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="mt-3 min-h-[44px] w-full cursor-pointer text-sm"
          style={{ background: 'transparent', color: HEX.paper, border: `2px solid ${HEX.paper}` }}
        >
          Remove {category.label}
        </button>
      </div>
    </div>
  )
}
