import type { Category } from '../types'
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

export interface BottomSheetProps {
  category: Category
  /** Ceiling for the slider: this category's amount plus whatever is unspent. */
  sliderMax: number
  onChange: (amount: number) => void
  onRemove: () => void
  onClose: () => void
}

export function BottomSheet({
  category,
  sliderMax,
  onChange,
  onRemove,
  onClose,
}: BottomSheetProps) {
  const swatch = hexForCategory(category.color)
  const step = (delta: number) => onChange(Math.max(0, category.amount + delta))

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 w-full px-4 pb-5 pt-4"
      style={{ background: HEX.night, borderTop: `3px solid ${HEX.ink}`, color: HEX.paper }}
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
