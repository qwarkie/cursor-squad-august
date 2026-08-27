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

/**
 * One step back. `budget` is the state *before* the action that pushed it.
 *
 * `coalesceKey` is what makes a slider drag one step rather than forty:
 * consecutive entries sharing a key collapse into the oldest snapshot, so undo
 * returns to before the whole gesture. It mirrors the rule the trade-off
 * sentence already uses in `App.tsx` — consecutive changes to the same
 * category accumulate, a change to a different one starts over.
 */
export interface HistoryEntry {
  budget: Budget
  /** Names the action, for `Undo ${label}`. Not shown alone. */
  label: string
  coalesceKey: string | null
}

/**
 * Deep enough to cover a demo, short enough that it cannot grow without bound
 * while someone leans on the slider.
 */
export const MAX_HISTORY = 25

export interface BudgetState {
  budget: Budget
  /** The category whose bottom sheet is open, if any. */
  selectedId: string | null
  /**
   * Set whenever a write to storage failed. Rendered as a visible banner —
   * never logged and swallowed.
   */
  storageError: string | null
  /**
   * Oldest first. In memory only, never persisted: the stack is larger than
   * the budget it describes, and restoring it across a reload would offer to
   * undo something the person did yesterday and has no memory of.
   */
  past: HistoryEntry[]
  /** What `undo()` would take back, in words. `null` means nothing to undo. */
  undoLabel: string | null

  setIncome: (income: number) => void
  addCategory: (input: NewCategory) => void
  setCategoryAmount: (id: string, amount: number) => void
  setCategoryIcon: (id: string, icon: CategoryIcon) => void
  setCategoryLabel: (id: string, label: string) => void
  setCategoryKind: (id: string, kind: CategoryKind) => void
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
  undo: () => void
  dismissStorageError: () => void
}

/** Whole dollars, never negative, never NaN. */
function dollars(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.round(value)
}

/** The label to name in an undo affordance, or a neutral word if it is gone. */
function labelOf(budget: Budget, id: string): string {
  return budget.categories.find((c) => c.id === id)?.label ?? 'that category'
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

/**
 * Push the pre-change budget onto the stack, coalescing a run of the same
 * gesture into one step.
 *
 * Coalescing keeps the *older* snapshot deliberately: dragging the Food slider
 * from $650 to $200 should be one undo back to $650, not nine undos back
 * through every $50 the finger passed over. The newer label is adopted so the
 * affordance names the whole gesture rather than its first step.
 */
function pushHistory(state: BudgetState, label: string, coalesceKey: string | null) {
  const top = state.past.at(-1)
  if (coalesceKey !== null && top?.coalesceKey === coalesceKey) {
    return {
      past: [...state.past.slice(0, -1), { ...top, label }],
      undoLabel: label,
    }
  }
  const entry: HistoryEntry = { budget: state.budget, label, coalesceKey }
  return { past: [...state.past, entry].slice(-MAX_HISTORY), undoLabel: label }
}

export function createBudgetStore(storage: BudgetStorage | null) {
  /**
   * Every mutation goes through here: record the step back, apply, persist,
   * surface any write failure. Keeping it in one place is what makes "no
   * silent write" a property of the store rather than a habit each action has
   * to remember — and it is why undo covers every action there is rather than
   * the ones somebody remembered to wire it into.
   */
  const commit = (
    state: BudgetState,
    next: Budget,
    label: string,
    coalesceKey: string | null = null,
  ): Partial<BudgetState> => {
    const stamped: Budget = { ...next, updatedAt: new Date().toISOString() }
    return {
      budget: stamped,
      storageError: writeBudget(storage, stamped),
      ...pushHistory(state, label, coalesceKey),
    }
  }

  return create<BudgetState>()((set, get) => ({
    budget: readBudget(storage),
    selectedId: null,
    storageError: null,
    past: [],
    undoLabel: null,

    setIncome: (income) =>
      set((s) => commit(s, { ...s.budget, income: dollars(income) }, 'the income change')),

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
        return commit(
          s,
          { ...s.budget, categories: [...s.budget.categories, category] },
          `adding ${category.label}`,
        )
      }),

    /**
     * Coalesced per category, so one drag of the slider is one step back.
     */
    setCategoryAmount: (id, amount) =>
      set((s) =>
        commit(
          s,
          {
            ...s.budget,
            categories: s.budget.categories.map((c) =>
              c.id === id ? { ...c, amount: dollars(amount) } : c,
            ),
          },
          `the change to ${labelOf(s.budget, id)}`,
          `amount:${id}`,
        ),
      ),

    /**
     * A savings category keeps whatever it is given but never draws it — its
     * terminus is a reservoir. Storing it anyway means flipping a category
     * back to `expense` restores the icon it had, rather than silently
     * resetting it to a house.
     */
    setCategoryIcon: (id, icon) =>
      set((s) =>
        commit(
          s,
          {
            ...s.budget,
            categories: s.budget.categories.map((c) => (c.id === id ? { ...c, icon } : c)),
          },
          `the ${labelOf(s.budget, id)} icon`,
        ),
      ),

    /**
     * Renames in place — the `id` does not move with the label.
     *
     * That is the entire value of the action. `id` is derived from the label
     * once, at creation, and is stable across edits (see `types.ts`), so a
     * rename keeps the category's position in the list. Position is not
     * cosmetic here: index fixes where the tributary meets the trunk, so
     * fixing a typo by deleting and re-adding sends the category to the end
     * and reshapes the river. Renaming does not touch the geometry at all.
     *
     * An all-whitespace label is ignored rather than stored: the label names
     * the tributary in the world and in the list, and a blank one leaves both
     * unreadable. Trimmed and capped at 20 to match `addCategory`.
     */
    setCategoryLabel: (id, label) =>
      set((s) => {
        const next = label.trim().slice(0, 20)
        const current = s.budget.categories.find((c) => c.id === id)
        if (!current || next === '' || next === current.label) return {}
        return commit(
          s,
          {
            ...s.budget,
            categories: s.budget.categories.map((c) =>
              c.id === id ? { ...c, label: next } : c,
            ),
          },
          `renaming ${current.label}`,
          `label:${id}`,
        )
      }),

    /**
     * Swaps the terminus — a village for a reservoir, or back — without
     * touching `amount`, `color`, `icon` or position.
     *
     * The icon is left in the budget rather than cleared: `setCategoryIcon`'s
     * own note says storing it through a savings phase is what lets flipping
     * back to `expense` restore the house it had instead of resetting to the
     * default. This setter is the other half of that promise — it must not
     * be the one place that breaks it.
     *
     * A no-op change (already that kind, or an id no longer in the budget)
     * writes nothing, the same guard `setCategoryLabel` uses.
     */
    setCategoryKind: (id, kind) =>
      set((s) => {
        const current = s.budget.categories.find((c) => c.id === id)
        if (!current || current.kind === kind) return {}
        return commit(
          s,
          {
            ...s.budget,
            categories: s.budget.categories.map((c) => (c.id === id ? { ...c, kind } : c)),
          },
          `${current.label} as ${kind === 'savings' ? 'savings' : 'a spend'}`,
        )
      }),

    removeCategory: (id) =>
      set((s) => ({
        ...commit(
          s,
          { ...s.budget, categories: s.budget.categories.filter((c) => c.id !== id) },
          `removing ${labelOf(s.budget, id)}`,
        ),
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
        return commit(
          s,
          { ...s.budget, categories: next },
          `moving ${categories[from].label}`,
        )
      }),

    select: (id) => set({ selectedId: id }),

    loadDemo: () => set((s) => commit(s, SEEDED_BUDGET, 'loading the demo budget')),

    /**
     * Undoable, and that is not redundant with the confirm in `App.tsx`.
     * A confirm asks before; undo answers after, which is the one that helps
     * the person who already tapped it.
     */
    reset: () => set((s) => ({ ...commit(s, EMPTY_BUDGET, 'the reset'), selectedId: null })),

    /**
     * One step back, and never a step that leaves a sheet open on a category
     * that no longer exists — undoing `addCategory` removes the very thing the
     * bottom sheet may be pointing at.
     *
     * Undo does not push history of its own: there is no redo, deliberately.
     * Redo needs a second stack and an invalidation rule, and everything it
     * would buy on a one-screen sandbox is already one tap away by hand.
     */
    undo: () =>
      set((s) => {
        const entry = s.past.at(-1)
        if (!entry) return {}
        const past = s.past.slice(0, -1)
        const stillThere =
          s.selectedId !== null && entry.budget.categories.some((c) => c.id === s.selectedId)
        return {
          budget: entry.budget,
          storageError: writeBudget(storage, entry.budget),
          past,
          undoLabel: past.at(-1)?.label ?? null,
          selectedId: stillThere ? s.selectedId : null,
        }
      }),

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
