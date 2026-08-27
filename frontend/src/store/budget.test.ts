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

  /**
   * Icons arrived after the storage key was already `v1` and already in
   * browsers. A month saved before them has no `icon` on any category, and
   * dropping it would empty the field on reload — the one failure this module
   * exists to prevent. It loads as it was; `iconArt()` draws the house.
   */
  it('loads a budget saved before icons existed', () => {
    const raw = JSON.stringify({
      income: 4200,
      updatedAt: '2026-08-26T09:00:00.000Z',
      categories: [{ id: 'housing', label: 'Housing', amount: 1500, kind: 'expense', color: 'r' }],
    })
    expect(parseBudget(raw).categories).toEqual([
      { id: 'housing', label: 'Housing', amount: 1500, kind: 'expense', color: 'r' },
    ])
  })

  /** Same reasoning for an icon a later build named and this one cannot draw. */
  it('drops an unrecognised icon rather than rejecting the month', () => {
    const raw = JSON.stringify({
      income: 4200,
      updatedAt: '2026-08-26T09:00:00.000Z',
      categories: [
        { id: 'housing', label: 'Housing', amount: 1500, kind: 'expense', color: 'r', icon: 'castle' },
      ],
    })
    expect(parseBudget(raw).categories[0].icon).toBeUndefined()
  })

  it('keeps an icon it recognises', () => {
    const raw = JSON.stringify({
      income: 4200,
      updatedAt: '2026-08-26T09:00:00.000Z',
      categories: [
        { id: 'food', label: 'Food', amount: 650, kind: 'expense', color: 'f', icon: 'market' },
      ],
    })
    expect(parseBudget(raw).categories[0].icon).toBe('market')
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

  it('adds a category with the icon it was given, and none when it was given none', () => {
    const store = createBudgetStore(storage)
    store.getState().addCategory({ label: 'Food', amount: 650, kind: 'expense', color: 'f', icon: 'market' })
    store.getState().addCategory({ label: 'Housing', amount: 1500, kind: 'expense', color: 'r' })
    const [food, housing] = store.getState().budget.categories
    expect(food.icon).toBe('market')
    expect(housing.icon).toBeUndefined()
  })

  it('changes one category\'s icon and persists it, leaving the others alone', () => {
    const store = createBudgetStore(storage)
    store.getState().loadDemo()
    store.getState().setCategoryIcon('housing', 'clinic')
    const after = store.getState().budget.categories
    expect(after.find((c) => c.id === 'housing')?.icon).toBe('clinic')
    expect(after.find((c) => c.id === 'food')?.icon).toBe('market')
    expect(parseBudget(storage.data[STORAGE_KEY]).categories[0].icon).toBe('clinic')
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

describe('moveCategory — order is what the river draws', () => {
  const ids = (store: ReturnType<typeof createBudgetStore>) =>
    store.getState().budget.categories.map((c) => c.id)

  const seeded = () => {
    const store = createBudgetStore(fakeStorage())
    store.getState().loadDemo()
    return store
  }

  it('swaps a category with the one above it', () => {
    const store = seeded()
    const before = ids(store)
    store.getState().moveCategory(before[2], 'up')
    const after = ids(store)
    expect(after[1]).toBe(before[2])
    expect(after[2]).toBe(before[1])
  })

  it('swaps a category with the one below it', () => {
    const store = seeded()
    const before = ids(store)
    store.getState().moveCategory(before[0], 'down')
    const after = ids(store)
    expect(after[0]).toBe(before[1])
    expect(after[1]).toBe(before[0])
  })

  it('keeps every category — a move is not a delete', () => {
    const store = seeded()
    const before = ids(store)
    store.getState().moveCategory(before[3], 'up')
    expect([...ids(store)].sort()).toEqual([...before].sort())
  })

  /**
   * The whole point of the feature: order changes what the trunk carries below
   * each branch, while the arithmetic outcome is untouched. Savings first is
   * "pay yourself first" — the same money left, taken in a different order.
   */
  it('changes what the trunk carries without changing what is left', () => {
    const store = seeded()
    const before = remainingOf(store.getState().budget)
    const savings = store.getState().budget.categories.find((c) => c.kind === 'savings')!
    const wasAt = ids(store).indexOf(savings.id)

    for (let i = wasAt; i > 0; i -= 1) store.getState().moveCategory(savings.id, 'up')

    expect(ids(store)[0]).toBe(savings.id)
    expect(remainingOf(store.getState().budget)).toBe(before)
  })

  it('does nothing at the ends, and does not touch storage doing it', () => {
    const storage = fakeStorage()
    const store = createBudgetStore(storage)
    store.getState().loadDemo()
    const written = storage.data[STORAGE_KEY]
    const list = ids(store)

    store.getState().moveCategory(list[0], 'up')
    store.getState().moveCategory(list[list.length - 1], 'down')

    expect(ids(store)).toEqual(list)
    expect(storage.data[STORAGE_KEY]).toBe(written)
  })

  it('ignores an id that is not in the budget', () => {
    const store = seeded()
    const before = ids(store)
    store.getState().moveCategory('not-a-real-id', 'up')
    expect(ids(store)).toEqual(before)
  })

  it('persists the new order, so a reload draws the same river', () => {
    const storage = fakeStorage()
    const store = createBudgetStore(storage)
    store.getState().loadDemo()
    const target = ids(store)[4]
    store.getState().moveCategory(target, 'up')

    const reloaded = createBudgetStore(storage)
    expect(reloaded.getState().budget.categories.map((c) => c.id)).toEqual(ids(store))
  })

  it('surfaces a failed write rather than swallowing it', () => {
    const store = createBudgetStore(fakeStorage())
    store.getState().loadDemo()
    const target = ids(store)[1]

    const failing = createBudgetStore(fakeStorage({}, true))
    failing.getState().loadDemo()
    failing.getState().moveCategory(target, 'up')
    expect(failing.getState().storageError).toBeTruthy()
  })
})
