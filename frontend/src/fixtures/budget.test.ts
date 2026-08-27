import { describe, expect, it } from 'vitest'
import { EMPTY_BUDGET, SEEDED_BUDGET } from './budget'

/**
 * T025's stated acceptance is `budgetToRiver(SEEDED_BUDGET).remaining === 0`,
 * which cannot run until the engine (T004) lands. These assert the same
 * property at the level the fixture actually owns — the arithmetic and the
 * shape — so the seed cannot drift before the engine test exists to catch it.
 */
describe('SEEDED_BUDGET', () => {
  const total = SEEDED_BUDGET.categories.reduce((sum, c) => sum + c.amount, 0)

  it('sums to income exactly, so the demo opens balanced and not overspent', () => {
    expect(total).toBe(SEEDED_BUDGET.income)
    expect(SEEDED_BUDGET.income - total).toBe(0)
  })

  it('carries the brief figures', () => {
    expect(SEEDED_BUDGET.income).toBe(4200)
    expect(SEEDED_BUDGET.categories.map((c) => [c.label, c.amount])).toEqual([
      ['Housing', 1500],
      ['Food', 650],
      ['Transport', 350],
      ['Entertainment', 300],
      ['Savings', 1400],
    ])
  })

  it('holds exactly one savings category, which is what renders a reservoir', () => {
    const savings = SEEDED_BUDGET.categories.filter((c) => c.kind === 'savings')
    expect(savings).toHaveLength(1)
    expect(savings[0].label).toBe('Savings')
  })

  it('uses whole dollars and unique stable ids', () => {
    for (const c of SEEDED_BUDGET.categories) {
      expect(Number.isInteger(c.amount)).toBe(true)
      expect(c.amount).toBeGreaterThanOrEqual(0)
      expect(c.label.length).toBeGreaterThanOrEqual(1)
      expect(c.label.length).toBeLessThanOrEqual(20)
    }
    const ids = SEEDED_BUDGET.categories.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every category its own colour, so the world reads without labels', () => {
    const colors = SEEDED_BUDGET.categories.map((c) => c.color)
    expect(new Set(colors).size).toBe(colors.length)
  })

  it('does not read the clock', () => {
    expect(SEEDED_BUDGET.updatedAt).toBe('2026-08-26T09:00:00.000Z')
  })
})

describe('EMPTY_BUDGET', () => {
  it('is the empty green field: no income, no categories', () => {
    expect(EMPTY_BUDGET.income).toBe(0)
    expect(EMPTY_BUDGET.categories).toEqual([])
  })
})
