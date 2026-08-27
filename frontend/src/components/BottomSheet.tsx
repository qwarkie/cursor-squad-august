import { useState } from 'react'

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
  onRename: (label: string) => void
  onChangeKind: (kind: Category['kind']) => void
  onRemove: () => void
  onClose: () => void
  /**
   * The sheet's own root, so the page behind it can clear exactly this sheet
   * rather than a number someone measured once. See the note in `App.tsx`.
   */
  hostRef?: React.Ref<HTMLDivElement>
  /**
   * The way back, while the sheet is open.
   *
   * Undo lives in the fixed action bar — which this sheet covers. Without it
   * here, every edit made *in* the sheet is the one kind you cannot take back:
   * a rename needs you to remember the old name, and a slider drag needs you
   * to remember the old number. The bar and this are mutually exclusive by
   * construction, so exactly one Undo is ever mounted.
   */
  undoLabel: string | null
  onUndo: () => void
}

export function BottomSheet({
  category,
  sliderMax,
  onChange,
  onIcon,
  position,
  total,
  onMove,
  onRename,
  onChangeKind,
  onRemove,
  onClose,
  hostRef,
  undoLabel,
  onUndo,
}: BottomSheetProps) {
  const swatch = hexForCategory(category.color)
  const step = (delta: number) => onChange(Math.max(0, category.amount + delta))

  /**
   * The title is the rename control, so renaming costs the sheet no height.
   *
   * A separate row would have been the obvious build and the wrong one: the
   * sheet's clearance is a hardcoded number in `App.tsx`, and a taller sheet
   * silently slices the last category off the list behind it. The name was
   * already sitting in a 44px row next to the close button.
   *
   * `draft` is local because the store refuses a blank label — without it,
   * clearing the field to retype would be rejected keystroke by keystroke and
   * the input would fight the finger.
   */
  const [draft, setDraft] = useState(category.label)
  /**
   * Re-sync on any change that did not come from this input — switching to
   * another category, or an undo landing while the sheet is open. Comparing
   * against the *committed* form of the draft is what tells the two apart:
   * while typing, the store's label is what this input just sent it.
   */
  const external = `${category.id}\u0000${category.label}`
  const [seen, setSeen] = useState(external)
  if (seen !== external) {
    setSeen(external)
    if (category.label !== draft.trim().slice(0, 20)) setDraft(category.label)
  }

  return (
    <div
      ref={hostRef}
      // Docked to the controls rail from `lg` up rather than spanning the
      // viewport: a sheet 1440px wide to hold a slider and five icons reads as
      // a page, not a sheet, and it covers the river it is there to reshape.
      className="sheet-in fixed inset-x-0 bottom-0 z-20 w-full px-4 pt-4 lg:inset-x-auto lg:bottom-8 lg:right-8 lg:w-[380px]"
      style={{
        background: HEX.night,
        border: `3px solid ${HEX.ink}`,
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
            {/* Editable in place. `id` does not follow the label, so the
                category keeps its position in the list — and position decides
                where this tributary meets the trunk. Fixing a typo by deleting
                and re-adding sends it to the end and reshapes the river. */}
            <input
              type="text"
              value={draft}
              maxLength={20}
              onChange={(e) => {
                setDraft(e.target.value)
                onRename(e.target.value)
              }}
              // Whatever the store settled on wins once the finger leaves —
              // trailing spaces trimmed, and a field left blank snaps back to
              // the name it still has rather than showing an empty title.
              onBlur={() => setDraft(category.label)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              aria-label="Category name"
              data-rename
              className="min-h-[44px] w-full min-w-0 cursor-text bg-transparent font-pixel text-[12px] underline decoration-dotted underline-offset-4 outline-none"
              style={{ color: HEX.paper }}
            />
          </div>
          {/* In the row that already exists, so the sheet gains no height —
              its clearance is measured now, but a taller sheet still costs
              the list room it does not have at 390x844. */}
          {undoLabel !== null && (
            <button
              type="button"
              onClick={onUndo}
              aria-label={`Undo ${undoLabel}`}
              data-undo="true"
              className="min-h-[44px] shrink-0 cursor-pointer px-2 font-pixel text-[8px] leading-none underline decoration-dotted underline-offset-4"
              style={{ background: 'transparent', color: HEX.gold }}
            >
              Undo
            </button>
          )}
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

        {/* Two buttons, not a select — the same choice `CategorySheet` offers
            when a category is created. Kept here too: today's spend can
            become tomorrow's saving without a delete-and-re-add, which would
            cost the category its position the same way a typo used to. */}
        <div className="mt-3 flex gap-2">
          {(['expense', 'savings'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => onChangeKind(k)}
              aria-pressed={category.kind === k}
              className="min-h-[44px] flex-1 cursor-pointer font-pixel text-[9px] leading-none"
              style={{
                background: category.kind === k ? HEX.gold : 'transparent',
                color: category.kind === k ? HEX.ink : HEX.paper,
                border: `2px solid ${category.kind === k ? HEX.ink : HEX.paper}`,
              }}
            >
              {k === 'expense' ? 'Spent' : 'Saved'}
            </button>
          ))}
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
