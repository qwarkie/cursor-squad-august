import { beforeEach, describe, expect, it } from 'vitest'

import { EMPTY_BUDGET, SEEDED_BUDGET } from '../fixtures/budget'
import { createBudgetStore, remainingOf } from './budget'
import { parseBudget, readBudget, writeBudget, STORAGE_KEY, type BudgetStorage } from './storage'

/** A `localStorage` stand-in. `fail` makes writes throw, like a full quota. */
function fakeStorage(seed: Record<string, string> = {}, fail = false): BudgetStorage & {
  data: Record<string, string>
} {
  const data = { ...seed }
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      if (fail) throw new Error('QuotaExceededError')
      data[k] = v
    },
  }
}

describe('parseBudget', () => {
  it('treats absent, empty, and non-JSON content as first load', () => {
    expect(parseBudget(null)).toEqual(EMPTY_BUDGET)
    expect(parseBudget('')).toEqual(EMPTY_BUDGET)
    expect(parseBudget('{not json')).toEqual(EMPTY_BUDGET)
  })

  it('treats JSON of the wrong shape as first load rather than crashing', () => {
    expect(parseBudget('42')).toEqual(EMPTY_BUDGET)
    expect(parseBudget('null')).toEqual(EMPTY_BUDGET)
    expect(parseBudget('[]')).toEqual(EMPTY_BUDGET)
    expect(parseBudget('{"income":"lots","categories":[]}')).toEqual(EMPTY_BUDGET)
    expect(parseBudget('{"income":-1,"categories":[]}')).toEqual(EMPTY_BUDGET)
    expect(parseBudget('{"income":100}')).toEqual(EMPTY_BUDGET)
  })

  it('rejects a budget with one malformed category rather than half-loading it', () => {
    const raw = JSON.stringify({
      income: 4200,
      updatedAt: '2026-08-26T09:00:00.000Z',
      categories: [
        { id: 'housing', label: 'Housing', amount: 1500, kind: 'expense', color: 'r' },
        { id: 'food', label: 'Food', amount: 650, kind: 'rent', color: 'f' },
      ],
    })
    expect(parseBudget(raw)).toEqual(EMPTY_BUDGET)
  })

  it('round-trips a well-formed budget', () => {
    expect(parseBudget(JSON.stringify(SEEDED_BUDGET))).toEqual(SEEDED_BUDGET)
  })
})

describe('readBudget / writeBudget', () => {
  it('reads the empty field when there is no storage at all', () => {
    expect(readBudget(null)).toEqual(EMPTY_BUDGET)
  })

  it('reports a message instead of throwing when storage is absent', () => {
    expect(writeBudget(null, SEEDED_BUDGET)).toMatch(/blocking storage/i)
  })

  it('reports a message instead of throwing when the write fails', () => {
    expect(writeBudget(fakeStorage({}, true), SEEDED_BUDGET)).toMatch(/won't survive a reload/i)
  })

  it('returns null and stores the budget on success', () => {
    const s = fakeStorage()
    expect(writeBudget(s, SEEDED_BUDGET)).toBeNull()
    expect(parseBudget(s.data[STORAGE_KEY])).toEqual(SEEDED_BUDGET)
  })
})

describe('the store', () => {
  let storage: ReturnType<typeof fakeStorage>

  beforeEach(() => {
    storage = fakeStorage()
  })

  it('starts on the empty field and hydrates a saved budget on the next load', () => {
    expect(createBudgetStore(storage).getState().budget).toEqual(EMPTY_BUDGET)
    createBudgetStore(storage).getState().loadDemo()
    expect(createBudgetStore(storage).getState().budget.income).toBe(4200)
  })

  it('hydrates the empty field from a corrupt key rather than crashing', () => {
    const store = createBudgetStore(fakeStorage({ [STORAGE_KEY]: '{"income":' }))
    expect(store.getState().budget).toEqual(EMPTY_BUDGET)
  })

  it('surfaces a failed write instead of swallowing it', () => {
    const store = createBudgetStore(fakeStorage({}, true))
    store.getState().setIncome(4200)
    expect(store.getState().storageError).toMatch(/won't survive a reload/i)
    // The change still applies on screen — the warning is about durability.
    expect(store.getState().budget.income).toBe(4200)
    store.getState().dismissStorageError()
    expect(store.getState().storageError).toBeNull()
  })

  it('leaves no storageError on a healthy write', () => {
    const store = createBudgetStore(storage)
    store.getState().setIncome(4200)
    expect(store.getState().storageError).toBeNull()
  })

  it('rounds to whole dollars and floors negative or non-finite input at 0', () => {
    const store = createBudgetStore(storage)
    store.getState().setIncome(4200.6)
    expect(store.getState().budget.income).toBe(4201)
    store.getState().setIncome(-5)
    expect(store.getState().budget.income).toBe(0)
    store.getState().setIncome(Number.NaN)
    expect(store.getState().budget.income).toBe(0)
  })

  it('appends categories in order, because order fixes the branch points', () => {
    const store = createBudgetStore(storage)
    store.getState().setIncome(4200)
    store.getState().addCategory({ label: 'Housing', amount: 1500, kind: 'expense', color: 'r' })
    store.getState().addCategory({ label: 'Food', amount: 650, kind: 'expense', color: 'f' })
    expect(store.getState().budget.categories.map((c) => c.id)).toEqual(['housing', 'food'])
    expect(remainingOf(store.getState().budget)).toBe(2050)
  })

  it('derives ids without the clock or a random source, and de-duplicates them', () => {
    const store = createBudgetStore(storage)
    store.getState().addCategory({ label: 'Food', amount: 100, kind: 'expense', color: 'f' })
    store.getState().addCategory({ label: 'Food', amount: 100, kind: 'expense', color: 'f' })
    store.getState().addCategory({ label: '  ', amount: 100, kind: 'expense', color: 'f' })
    expect(store.getState().budget.categories.map((c) => c.id)).toEqual([
      'food',
      'food-2',
      'category',
    ])
  })

  it('keeps a category at amount 0 in the list — the tributary closes, the row stays', () => {
    const store = createBudgetStore(storage)
    store.getState().addCategory({ label: 'Food', amount: 650, kind: 'expense', color: 'f' })
    store.getState().setCategoryAmount('food', 0)
    expect(store.getState().budget.categories).toHaveLength(1)
    expect(store.getState().budget.categories[0].amount).toBe(0)
  })

  it('loads the seeded month at remaining 0, which is balanced and not a warning', () => {
    const store = createBudgetStore(storage)
    store.getState().loadDemo()
    expect(remainingOf(store.getState().budget)).toBe(0)
  })

  it('resets to the empty field and drops the selection with it', () => {
    const store = createBudgetStore(storage)
    store.getState().loadDemo()
    store.getState().select('housing')
    store.getState().reset()
    expect(store.getState().budget.categories).toEqual([])
    expect(store.getState().budget.income).toBe(0)
    expect(store.getState().selectedId).toBeNull()
  })

  it('clears the selection when the selected category is removed', () => {
    const store = createBudgetStore(storage)
    store.getState().loadDemo()
    store.getState().select('food')
    store.getState().removeCategory('food')
    expect(store.getState().selectedId).toBeNull()
    expect(store.getState().budget.categories.map((c) => c.id)).not.toContain('food')
  })
})

describe('remainingOf', () => {
  it('is exactly income minus the sum of amounts, and may go negative', () => {
    expect(remainingOf(SEEDED_BUDGET)).toBe(0)
    expect(remainingOf({ ...SEEDED_BUDGET, income: 3800 })).toBe(-400)
    expect(remainingOf(EMPTY_BUDGET)).toBe(0)
  })
})
