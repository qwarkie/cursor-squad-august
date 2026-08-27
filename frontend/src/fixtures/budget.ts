import type { Budget, CategoryKey, CategoryMap } from '../types'

/**
 * Checked-in May 2026 seed. Must stay identical to backend/app/seed/budget.py.
 * Offline fallback (Principle II) renders from these constants when the API is down.
 */
export const SEED_MONTH = '2026-05' as const
export const SEED_INCOME = 4200
export const SEED_CATEGORIES: CategoryMap = {
  housing: 1500,
  food: 650,
  transport: 350,
  entertainment: 300,
  savings: 1400,
}

export const CATEGORY_KEYS = [
  'housing',
  'food',
  'transport',
  'entertainment',
  'savings',
] as const satisfies readonly CategoryKey[]

export const CATEGORY_META: Record<
  CategoryKey,
  { label: string; district: string }
> = {
  housing: { label: 'Housing', district: 'Homes' },
  food: { label: 'Food', district: 'Market' },
  transport: { label: 'Transport', district: 'Roads' },
  entertainment: { label: 'Entertainment', district: 'Park' },
  savings: { label: 'Savings', district: 'Vault' },
}

export function seedBudget(): Budget {
  return {
    month: SEED_MONTH,
    income: SEED_INCOME,
    categories: { ...SEED_CATEGORIES },
  }
}
