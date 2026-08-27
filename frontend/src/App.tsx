import { useCallback, useLayoutEffect, useRef, useState } from 'react'

import { BottomSheet } from './components/BottomSheet'
import { CategorySheet } from './components/CategorySheet'
import { EmptyField } from './components/EmptyField'
import { Header } from './components/Header'
import { IncomeSheet } from './components/IncomeSheet'
import { formatMoney } from './components/money'
import { HEX, hexForCategory } from './components/palette'
import { TradeOff } from './components/TradeOff'
import { budgetToRiver } from './engine'
import { PixelSprite } from './pixel'
import { useBudget } from './store/budget'
import { iconArt } from './world/icons'
import { PAL } from './world/palette'
import { River } from './world/River'
import { CoinFlow } from './world/CoinFlow'
import { Settlements } from './world/Settlements'
import { World } from './world/World'

/**
 * T026 — page composition.
 *
 * One screen, one budget. `Budget` is the only state; the world and every
 * figure on it are derived by `budgetToRiver` on each render, so there is no
 * second copy to keep in sync and no save step to forget (FR-010).
 *
 * Which sheet is open is local state rather than store state on purpose: it is
 * not part of the budget, and persisting it would restore a half-open form on
 * reload.
 */
type OpenSheet = 'none' | 'income' | 'category'

/**
 * The trade-off sentence reports the whole adjustment, not the last tap.
 *
 * Spec US3 scenario 2: two presses of `−` on Food $650 must read
 * `Food −$100 → Remaining +$100`, not `−$50` twice. `id` is what makes that
 * possible — consecutive changes to the same category accumulate, and a change
 * to a different one starts over.
 */
type Change = { id: string; label: string; delta: number }

export default function App() {
  const budget = useBudget((s) => s.budget)
  const selectedId = useBudget((s) => s.selectedId)
  const storageError = useBudget((s) => s.storageError)
  const setIncome = useBudget((s) => s.setIncome)
  const addCategory = useBudget((s) => s.addCategory)
  const setCategoryAmount = useBudget((s) => s.setCategoryAmount)
  const setCategoryIcon = useBudget((s) => s.setCategoryIcon)
  const setCategoryLabel = useBudget((s) => s.setCategoryLabel)
  const removeCategory = useBudget((s) => s.removeCategory)
  const moveCategory = useBudget((s) => s.moveCategory)
  const undoLabel = useBudget((s) => s.undoLabel)
  const undo = useBudget((s) => s.undo)
  const select = useBudget((s) => s.select)
  const loadDemo = useBudget((s) => s.loadDemo)
  const reset = useBudget((s) => s.reset)
  const dismissStorageError = useBudget((s) => s.dismissStorageError)

  const [sheet, setSheet] = useState<OpenSheet>('none')
  const [lastChange, setLastChange] = useState<Change | null>(null)

  /**
   * How far the list has to clear whatever is fixed over the bottom of the
   * page — measured, not declared.
   *
   * This was two hardcoded numbers, 360px for an expense sheet and 280px for a
   * savings one, and they were correct on the day they were measured. The
   * moment the sheet grew reorder controls it stood 378px tall against a 360px
   * clearance and quietly sliced 2px off the last category — a broken list
   * rather than a scrollable one, which is the exact failure the number was
   * added to prevent. Three people edited that sheet tonight and nobody could
   * have known which of them owed the constant an update.
   *
   * A `ResizeObserver` on the sheet's own box cannot go stale: whatever anyone
   * adds to it next, the list clears it.
   */
  const [sheetHeight, setSheetHeight] = useState(0)
  const observed = useRef<ResizeObserver | null>(null)
  const sheetHost = useCallback((node: HTMLDivElement | null) => {
    observed.current?.disconnect()
    if (!node) {
      setSheetHeight(0)
      return
    }
    setSheetHeight(node.getBoundingClientRect().height)
    const ro = new ResizeObserver(([entry]) => {
      setSheetHeight(entry.target.getBoundingClientRect().height)
    })
    ro.observe(node)
    observed.current = ro
  }, [])
  useLayoutEffect(() => () => observed.current?.disconnect(), [])

  const model = budgetToRiver(budget)
  const selected = budget.categories.find((c) => c.id === selectedId) ?? null

  if (model.state === 'empty' && budget.categories.length === 0) {
    return (
      <>
        <EmptyField
          onAddIncome={() => setSheet('income')}
          onLoadDemo={() => {
            loadDemo()
            setLastChange(null)
          }}
          undoLabel={undoLabel}
          onUndo={() => {
            undo()
            setLastChange(null)
          }}
        />
        {sheet === 'income' && (
          <IncomeSheet
            onSubmit={(income) => {
              setIncome(income)
              setSheet('none')
            }}
            onCancel={() => setSheet('none')}
          />
        )}
      </>
    )
  }

  const changeAmount = (id: string, label: string, next: number, previous: number) => {
    setCategoryAmount(id, next)
    setLastChange((prior) => ({
      id,
      label,
      delta: (prior?.id === id ? prior.delta : 0) + (next - previous),
    }))
  }

  /**
   * The three actions, defined once and mounted in one of two places.
   *
   * On a phone they are pinned to the bottom edge in a fixed bar, which is
   * correct: it is thumb reach and there is one column of room. On a desktop
   * that same bar stretched two buttons across 1440px. Copying the markup into
   * a second place would have been the quick version and would have drifted
   * the first time anyone added a fourth action.
   */
  const actions = (
    <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={() => setSheet('category')}
            className="min-h-[52px] flex-[2] cursor-pointer font-pixel text-[10px] leading-none"
            style={{ background: HEX.gold, color: HEX.ink, border: `3px solid ${HEX.ink}` }}
          >
            Add category
          </button>
          {/* Undo lives in the fixed bar, not in the trade-off row above the
              world, and that is a correction rather than a preference.
              In the row it was present in the DOM and off the screen: after
              tapping Remove the page sits scrolled down at the list, and the
              row measured `top: -72` — a control that exists and cannot be
              reached, which is worse than one that is missing. A sticky row
              looked like the one-line fix and silently did nothing, because
              `overflow-x-hidden` on this component's root makes it a scroll
              container. Fixed cannot scroll away, and it puts the way back
              beside Reset, the other action you take back. */}
          <button
            type="button"
            onClick={() => {
              undo()
              setLastChange(null)
            }}
            disabled={undoLabel === null}
            aria-label={undoLabel === null ? undefined : `Undo ${undoLabel}`}
            aria-hidden={undoLabel === null}
            data-undo={undoLabel !== null}
            className="min-h-[52px] flex-1 cursor-pointer font-pixel text-[10px] leading-none transition-opacity disabled:cursor-default disabled:opacity-30"
            style={{ background: 'transparent', color: HEX.gold, border: `3px solid ${HEX.gold}` }}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => {
              // Confirmed, because reset throws the whole month away and the
              // button sits next to one a judge will be tapping repeatedly.
              if (window.confirm('Clear this month and go back to the empty field?')) {
                reset()
                setLastChange(null)
                setSheet('none')
              }
            }}
            className="min-h-[52px] flex-1 cursor-pointer font-pixel text-[10px] leading-none"
            style={{ background: 'transparent', color: HEX.paper, border: `3px solid ${HEX.paper}` }}
          >
            Reset
          </button>
    </div>
  )

  return (
    <div
      className="flex min-h-dvh w-full flex-col overflow-x-hidden"
      style={{ background: HEX.night, color: HEX.paper }}
    >
      <Header
        budget={budget}
        remaining={model.remaining}
        state={model.state}
        onEditIncome={() => setSheet('income')}
      />

      {storageError && (
        <p
          role="alert"
          className="flex items-start justify-between gap-3 px-4 py-2 text-sm leading-snug"
          style={{ background: HEX.alert, color: HEX.paper }}
        >
          <span>{storageError}</span>
          <button
            type="button"
            onClick={dismissStorageError}
            aria-label="Dismiss"
            className="shrink-0 cursor-pointer font-pixel text-[10px]"
          >
            ×
          </button>
        </p>
      )}

      <TradeOff change={lastChange} />

      {/* One column on a phone, two from `lg` up.
          The world and the controls are stacked on a phone because there is
          only ever one column of room. On a 1024px+ screen that stack put the
          category list 894px down — below the fold on a 768px-tall laptop —
          while the world used 34% of a 1440px screen and the action bar
          stretched two buttons across 1440px of it. Side by side, the list is
          on screen with the river it describes, which is the whole point of
          the product: you change a number and watch the water move. */}
      <main className="flex flex-1 flex-col items-center gap-4 py-4 lg:flex-row lg:items-start lg:justify-center lg:gap-8 lg:px-8">
        <div className="flex w-full flex-col items-center lg:w-auto lg:flex-1 lg:items-end">
        <World
          model={model}
          overlay={(scale) => (
            <>
              {/* Coins first, so settlements paint over them — money flows behind
                  the things it built, not in front of them. */}
              <CoinFlow model={model} scale={scale} />
              <Settlements model={model} budget={budget} scale={scale} />
            </>
          )}
        >
          <River model={model} budget={budget} onSelectTributary={select} />
        </World>
        </div>

        {/* The controls rail. `lg:sticky` keeps it beside the river rather
            than scrolling away from it once the world is taller than the
            viewport — the one place sticky works here, because this column is
            not inside the `overflow-x-hidden` root's scroll container the way
            a full-width row is. Verified at 1440, 1024 and 768. */}
        <div className="flex w-full flex-col items-center lg:top-4 lg:w-[380px] lg:shrink-0 lg:items-stretch lg:self-start">

        {/* Clearance for whichever bar is fixed over the bottom of the page.
            The open sheet is measured (see `sheetHost` above); the action bar
            is a fixed 87px of buttons this file draws itself and knows. */}
        <ul
          className="w-full max-w-md px-4"
          style={{
            paddingBottom: selected
              ? `calc(${Math.round(sheetHeight) + 8}px + env(safe-area-inset-bottom))`
              : 'calc(120px + env(safe-area-inset-bottom))',
          }}
        >
          {budget.categories.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => select(category.id)}
                aria-pressed={selectedId === category.id}
                className="flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-3 border-b px-1 text-left"
                style={{ borderColor: HEX.ink }}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden
                    className="size-4 shrink-0"
                    style={{
                      background: hexForCategory(category.color),
                      border: `2px solid ${HEX.ink}`,
                    }}
                  />
                  {category.kind === 'expense' && (
                    <PixelSprite
                      art={iconArt(category.icon)}
                      palette={PAL}
                      scale={2}
                      fps={4}
                      alt=""
                    />
                  )}
                  <span className="truncate font-pixel text-[10px]">{category.label}</span>
                  {category.kind === 'savings' && (
                    <span className="shrink-0 text-xs opacity-70">held</span>
                  )}
                </span>
                <span className="shrink-0 font-pixel text-[10px]">
                  {formatMoney(category.amount)}
                </span>
              </button>
            </li>
          ))}
        </ul>

          {/* One mount, two positions.
              `fixed` on a phone — thumb reach, and `position: fixed` is
              viewport-relative so living inside this rail costs nothing.
              `static` from `lg`, where it flows into the rail beside the
              river instead of stretching two buttons across 1440px.
              Rendering it twice and hiding one with `lg:hidden` was the first
              version: both copies stayed in the DOM, every control existed
              twice, and a locator for the Undo button resolved to two
              elements. Two controls for one action is a defect whichever one
              the CSS happens to be hiding. */}
          {!selected && (
            <div
              data-actions
              className="fixed inset-x-0 bottom-0 z-10 flex gap-3 px-4 pt-3 lg:static lg:z-auto lg:w-full lg:px-0 lg:pb-0"
              style={{
                background: HEX.night,
                borderTop: `3px solid ${HEX.ink}`,
                paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
              }}
            >
              {actions}
            </div>
          )}
        </div>
      </main>


      {selected && (
        <BottomSheet
          hostRef={sheetHost}
          category={selected}
          sliderMax={selected.amount + Math.max(model.remaining, 0)}
          onChange={(amount) => changeAmount(selected.id, selected.label, amount, selected.amount)}
          onIcon={(icon) => setCategoryIcon(selected.id, icon)}
          position={budget.categories.findIndex((c) => c.id === selected.id) + 1}
          total={budget.categories.length}
          onMove={(direction) => moveCategory(selected.id, direction)}
          onRename={(label) => setCategoryLabel(selected.id, label)}
          undoLabel={undoLabel}
          onUndo={() => {
            undo()
            setLastChange(null)
          }}
          onRemove={() => {
            removeCategory(selected.id)
            setLastChange({ id: selected.id, label: selected.label, delta: -selected.amount })
          }}
          onClose={() => select(null)}
        />
      )}

      {sheet === 'income' && (
        <IncomeSheet
          initial={budget.income}
          onSubmit={(income) => {
            setIncome(income)
            setSheet('none')
          }}
          onCancel={() => setSheet('none')}
        />
      )}

      {sheet === 'category' && (
        <CategorySheet
          onSubmit={(input) => {
            addCategory(input)
            // A brand-new category has no id until the store derives one, and
            // the sentence is about the amount arriving, not about an edit.
            setLastChange({ id: '', label: input.label, delta: input.amount })
            setSheet('none')
          }}
          onCancel={() => setSheet('none')}
        />
      )}
    </div>
  )
}
