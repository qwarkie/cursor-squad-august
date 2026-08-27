/**
 * Mirrors app/schemas/item.py on the backend.
 * Keep the two in sync when the schema changes.
 */
export interface Item {
  id: number
  title: string
  description: string | null
  is_done: boolean
  created_at: string
  updated_at: string
}

export interface ItemCreate {
  title: string
  description?: string | null
  is_done?: boolean
}

export type ItemUpdate = Partial<ItemCreate>

export type CategoryKey = 'housing' | 'food' | 'transport' | 'entertainment' | 'savings'

export interface CategoryMap {
  housing: number
  food: number
  transport: number
  entertainment: number
  savings: number
}

/** Stored monthly plan without server-derived totals. */
export interface Budget {
  month: '2026-05'
  income: number
  categories: CategoryMap
}

export interface BudgetTotals {
  total_allocated: number
  remaining: number
  savings_rate: number
  overspent: boolean
}

/** Mirrors backend/app/schemas/budget.py BudgetResponse. */
export interface BudgetResponse extends Budget, BudgetTotals {
  id: number
  updated_at: string
}
