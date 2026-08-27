import { CATEGORY_KEYS, SEED_CATEGORIES, SEED_INCOME, SEED_MONTH } from '../fixtures/budget'
import type { Budget, BudgetTotals, CategoryKey, CategoryMap } from '../types'

const STEP = 50

export function deriveTotals(income: number, categories: CategoryMap): BudgetTotals {
  const total_allocated = CATEGORY_KEYS.reduce((sum, key) => sum + categories[key], 0)
  const remaining = income - total_allocated
  const savings_rate = income === 0 ? 0 : categories.savings / income
  return {
    total_allocated,
    remaining,
    savings_rate,
    overspent: remaining < 0,
  }
}

export function units(amount: number): number {
  return Math.floor(amount / STEP)
}

function signedMoney(delta: number): string {
  const sign = delta < 0 ? '-' : '+'
  return `${sign}$${Math.abs(delta)}`
}

/** ASCII impact line, e.g. `Food -$100 → Remaining +$100`. */
export function impactLine(label: string, delta: number, remainingDelta: number): string {
  return `${label} ${signedMoney(delta)} → Remaining ${signedMoney(remainingDelta)}`
}

/**
 * Apply a UI $50 step. Amounts cannot go below 0.
 * Returns a new budget; other categories are copied unchanged.
 */
export function adjust(budget: Budget, key: CategoryKey, delta: number): Budget {
  const nextAmount = budget.categories[key] + delta
  if (nextAmount < 0) {
    return {
      ...budget,
      categories: { ...budget.categories },
    }
  }
  return {
    ...budget,
    categories: {
      ...budget.categories,
      [key]: nextAmount,
    },
  }
}

export function formatMoney(amount: number): string {
  const grouped = Math.abs(amount).toLocaleString('en-US')
  return amount < 0 ? `-$${grouped}` : `$${grouped}`
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

export function reset(): Budget {
  return {
    month: SEED_MONTH,
    income: SEED_INCOME,
    categories: { ...SEED_CATEGORIES },
  }
}
