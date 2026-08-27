import type { Budget } from '../types'

/**
 * The seeded month behind **Load demo budget** — specs/001-money-river/
 * data-model.md §Seeded month, checked in per the constitution.
 *
 * The figures are the hackathon brief's own seed and they sum to income
 * exactly, so this loads at `remaining $0` and state `balanced`. That is
 * deliberate and it is the single most likely thing to be mistaken for a
 * warning (T023): balanced is an empty basin, overspent is a cracked bed.
 * The demo's first move creates surplus.
 *
 * `updatedAt` is a fixed literal rather than `new Date()`. A fixture that
 * reads the clock is not deterministic, and SC-007 asks two loads of the same
 * budget to produce identical geometry.
 */
export const SEEDED_BUDGET: Budget = {
  income: 4200,
  updatedAt: '2026-08-26T09:00:00.000Z',
  categories: [
    { id: 'housing', label: 'Housing', amount: 1500, kind: 'expense', color: 'r' },
    { id: 'food', label: 'Food', amount: 650, kind: 'expense', color: 'f' },
    { id: 'transport', label: 'Transport', amount: 350, kind: 'expense', color: 't' },
    { id: 'entertainment', label: 'Entertainment', amount: 300, kind: 'expense', color: 'm' },
    { id: 'savings', label: 'Savings', amount: 1400, kind: 'savings', color: 'v' },
  ],
}

/** The empty green field — first load, and what reset returns to. */
export const EMPTY_BUDGET: Budget = {
  income: 0,
  updatedAt: '2026-08-26T09:00:00.000Z',
  categories: [],
}
