import { EMPTY_BUDGET } from '../fixtures/budget'
import type { Budget, Category, CategoryKind } from '../types'

/** The one key. Versioned, so a shape change never tries to read old data. */
export const STORAGE_KEY = 'money-river:budget:v1'

/**
 * The slice of `localStorage` this module needs. Narrowed to two methods so
 * the store can be driven by a fake in tests and by the real thing in the
 * browser, and so a missing or throwing `localStorage` is a value we handle
 * rather than an exception that escapes.
 */
export interface BudgetStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** `localStorage` if it exists and answers; `null` if it does not. */
export function browserStorage(): BudgetStorage | null {
  try {
    const ls = globalThis.localStorage
    if (!ls) return null
    return ls
  } catch {
    // Safari private mode and some embedded webviews throw on access itself.
    return null
  }
}

const KINDS: CategoryKind[] = ['expense', 'savings']

function isCategory(value: unknown): value is Category {
  if (typeof value !== 'object' || value === null) return false
  const c = value as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    c.id.length > 0 &&
    typeof c.label === 'string' &&
    typeof c.amount === 'number' &&
    Number.isFinite(c.amount) &&
    c.amount >= 0 &&
    typeof c.kind === 'string' &&
    KINDS.includes(c.kind as CategoryKind) &&
    typeof c.color === 'string' &&
    (c.color as string).length === 1
  )
}

/**
 * Anything that is not a well-formed `Budget` reads as first load.
 *
 * Deliberately total: absent, empty, not JSON, JSON of the wrong shape, or a
 * budget with one bad category all return the empty field. A judge who opens
 * the app to a crash screen has already stopped watching, and there is nothing
 * in one month of budget worth rescuing from a corrupt string.
 */
export function parseBudget(raw: string | null): Budget {
  if (raw === null || raw === '') return EMPTY_BUDGET
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return EMPTY_BUDGET
  }
  if (typeof value !== 'object' || value === null) return EMPTY_BUDGET
  const b = value as Record<string, unknown>
  if (typeof b.income !== 'number' || !Number.isFinite(b.income) || b.income < 0) {
    return EMPTY_BUDGET
  }
  if (!Array.isArray(b.categories) || !b.categories.every(isCategory)) return EMPTY_BUDGET
  return {
    income: b.income,
    categories: b.categories as Category[],
    updatedAt: typeof b.updatedAt === 'string' ? b.updatedAt : EMPTY_BUDGET.updatedAt,
  }
}

export function readBudget(storage: BudgetStorage | null): Budget {
  if (!storage) return EMPTY_BUDGET
  try {
    return parseBudget(storage.getItem(STORAGE_KEY))
  } catch {
    return EMPTY_BUDGET
  }
}

/**
 * Returns `null` on success, or the message to show the user.
 *
 * A write is the one storage operation that must not fail silently: a read
 * failure renders the empty field and gets noticed immediately, but a silent
 * write failure survives to the demo, where a judge changes a number, reloads,
 * and the change is gone (Constitution, Additional Constraints; FR-014).
 */
export function writeBudget(storage: BudgetStorage | null, budget: Budget): string | null {
  if (!storage) return "This browser is blocking storage, so changes won't survive a reload."
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(budget))
    return null
  } catch {
    return "Couldn't save — changes are live on screen but won't survive a reload."
  }
}
