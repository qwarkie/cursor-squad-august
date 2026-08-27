import { useState } from 'react'

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
  const removeCategory = useBudget((s) => s.removeCategory)
  const select = useBudget((s) => s.select)
  const loadDemo = useBudget((s) => s.loadDemo)
  const reset = useBudget((s) => s.reset)
  const dismissStorageError = useBudget((s) => s.dismissStorageError)

  const [sheet, setSheet] = useState<OpenSheet>('none')
  const [lastChange, setLastChange] = useState<Change | null>(null)

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

      <main className="flex flex-1 flex-col items-center gap-4 py-4">
        <World
          model={model}
          overlay={(scale) => <Settlements model={model} budget={budget} scale={scale} />}
        >
          <River model={model} onSelectTributary={select} />
        </World>

        {/* Clearance for whichever bar is fixed over the bottom of the page —
            the action bar (87px) or the open bottom sheet — plus the notch
            inset. Without it the last category is sliced by the bar on a
            phone, which reads as a broken list rather than a scrollable one. */}
        <ul
          className="w-full max-w-md px-4"
          style={{
            paddingBottom: selected
              ? // The icon picker adds a row of 48px targets, so an expense
                // sheet is taller than a savings one and needs more clearance.
                selected.kind === 'expense'
                ? 'calc(360px + env(safe-area-inset-bottom))'
                : 'calc(280px + env(safe-area-inset-bottom))'
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
      </main>

      {!selected && (
        <div
          className="fixed inset-x-0 bottom-0 z-10 flex gap-3 px-4 pt-3"
          style={{
            background: HEX.night,
            borderTop: `3px solid ${HEX.ink}`,
            paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
          }}
        >
          <button
            type="button"
            onClick={() => setSheet('category')}
            className="min-h-[52px] flex-[2] cursor-pointer font-pixel text-[10px] leading-none"
            style={{ background: HEX.gold, color: HEX.ink, border: `3px solid ${HEX.ink}` }}
          >
            Add category
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
      )}

      {selected && (
        <BottomSheet
          category={selected}
          sliderMax={selected.amount + Math.max(model.remaining, 0)}
          onChange={(amount) => changeAmount(selected.id, selected.label, amount, selected.amount)}
          onIcon={(icon) => setCategoryIcon(selected.id, icon)}
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
