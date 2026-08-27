import { create } from 'zustand'

import { EMPTY_BUDGET, SEEDED_BUDGET } from '../fixtures/budget'
import type { Budget, Category, CategoryIcon, CategoryKind, PaletteKey } from '../types'
import {
  browserStorage,
  readBudget,
  writeBudget,
  type BudgetStorage,
} from './storage'

export interface NewCategory {
  label: string
  amount: number
  kind: CategoryKind
  color: PaletteKey
  /** Optional — omitted means the house, the same as an older saved budget. */
  icon?: CategoryIcon
}

export interface BudgetState {
  budget: Budget
  /** The category whose bottom sheet is open, if any. */
  selectedId: string | null
  /**
   * Set whenever a write to storage failed. Rendered as a visible banner —
   * never logged and swallowed.
   */
  storageError: string | null

  setIncome: (income: number) => void
  addCategory: (input: NewCategory) => void
  setCategoryAmount: (id: string, amount: number) => void
  setCategoryIcon: (id: string, icon: CategoryIcon) => void
  removeCategory: (id: string) => void
  /**
   * Move a category one place up or down the list.
   *
   * Order is not cosmetic here: the engine derives `carried(i)` from the sum of
   * every amount above `i`, so the position of a category decides where its
   * tributary leaves the trunk and how wide the river still is below it. Moving
   * savings to the top draws "pay yourself first" — the same remaining figure,
   * a different river.
   */
  moveCategory: (id: string, direction: 'up' | 'down') => void
  select: (id: string | null) => void
  loadDemo: () => void
  reset: () => void
  dismissStorageError: () => void
}

/** Whole dollars, never negative, never NaN. */
function dollars(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.round(value)
}

/**
 * Ids are derived from the label and de-duplicated against the budget, rather
 * than from `Math.random()` or the clock. Two runs of the same demo produce
 * the same ids, which is what keeps SC-007 true through the store as well as
 * through the engine.
 */
function categoryId(label: string, existing: Category[]): string {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category'
  if (!existing.some((c) => c.id === base)) return base
  let n = 2
  while (existing.some((c) => c.id === `${base}-${n}`)) n++
  return `${base}-${n}`
}

export function createBudgetStore(storage: BudgetStorage | null) {
  /**
   * Every mutation goes through here: apply, persist, surface any write
   * failure. Keeping it in one place is what makes "no silent write" a
   * property of the store rather than a habit each action has to remember.
   */
  const commit = (state: BudgetState, next: Budget): Partial<BudgetState> => {
    void state
    const stamped: Budget = { ...next, updatedAt: new Date().toISOString() }
    return { budget: stamped, storageError: writeBudget(storage, stamped) }
  }

  return create<BudgetState>()((set, get) => ({
    budget: readBudget(storage),
    selectedId: null,
    storageError: null,

    setIncome: (income) =>
      set((s) => commit(s, { ...s.budget, income: dollars(income) })),

    addCategory: (input) =>
      set((s) => {
        const category: Category = {
          id: categoryId(input.label, s.budget.categories),
          label: input.label.trim().slice(0, 20),
          amount: dollars(input.amount),
          kind: input.kind,
          color: input.color,
          ...(input.icon ? { icon: input.icon } : null),
        }
        return commit(s, {
          ...s.budget,
          categories: [...s.budget.categories, category],
        })
      }),

    setCategoryAmount: (id, amount) =>
      set((s) =>
        commit(s, {
          ...s.budget,
          categories: s.budget.categories.map((c) =>
            c.id === id ? { ...c, amount: dollars(amount) } : c,
          ),
        }),
      ),

    /**
     * A savings category keeps whatever it is given but never draws it — its
     * terminus is a reservoir. Storing it anyway means flipping a category
     * back to `expense` restores the icon it had, rather than silently
     * resetting it to a house.
     */
    setCategoryIcon: (id, icon) =>
      set((s) =>
        commit(s, {
          ...s.budget,
          categories: s.budget.categories.map((c) => (c.id === id ? { ...c, icon } : c)),
        }),
      ),

    removeCategory: (id) =>
      set((s) => ({
        ...commit(s, {
          ...s.budget,
          categories: s.budget.categories.filter((c) => c.id !== id),
        }),
        selectedId: s.selectedId === id ? null : s.selectedId,
      })),

    moveCategory: (id, direction) =>
      set((s) => {
        const categories = s.budget.categories
        const from = categories.findIndex((c) => c.id === id)
        const to = from + (direction === 'up' ? -1 : 1)
        // Out of range, or the id is not in this budget: nothing moves, and no
        // write happens — a no-op must not touch storage or the updatedAt stamp.
        if (from === -1 || to < 0 || to >= categories.length) return s

        const next = categories.slice()
        next[from] = categories[to]
        next[to] = categories[from]
        return commit(s, { ...s.budget, categories: next })
      }),

    select: (id) => set({ selectedId: id }),

    loadDemo: () => set((s) => commit(s, SEEDED_BUDGET)),

    reset: () => set((s) => ({ ...commit(s, EMPTY_BUDGET), selectedId: null })),

    dismissStorageError: () => {
      if (get().storageError !== null) set({ storageError: null })
    },
  }))
}

/** The app's store, over real `localStorage` when the browser allows it. */
export const useBudget = createBudgetStore(browserStorage())

/** `income − sum(amounts)`. Exact dollars, may be negative (FR-008). */
export function remainingOf(budget: Budget): number {
  return budget.categories.reduce((left, c) => left - c.amount, budget.income)
}
