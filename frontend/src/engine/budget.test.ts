import { describe, it, expect } from 'vitest'

import { SEED_CATEGORIES, SEED_INCOME, seedBudget } from '../fixtures/budget'
import { adjust, deriveTotals, impactLine, reset, units } from './budget'

const seedRate = SEED_CATEGORIES.savings / SEED_INCOME

describe('deriveTotals', () => {
  it('gives remaining 0 and rate 1400/4200 on the seed', () => {
    const totals = deriveTotals(SEED_INCOME, { ...SEED_CATEGORIES })
    expect(totals.total_allocated).toBe(4200)
    expect(totals.remaining).toBe(0)
    expect(totals.savings_rate).toBe(seedRate)
    expect(totals.overspent).toBe(false)
  })

  it('marks overspent only when remaining is below 0', () => {
    const over = deriveTotals(SEED_INCOME, { ...SEED_CATEGORIES, food: 700 })
    expect(over.remaining).toBe(-50)
    expect(over.overspent).toBe(true)
  })
})

describe('units', () => {
  it('is floor(amount / 50)', () => {
    expect(units(650)).toBe(13)
    expect(units(550)).toBe(11)
    expect(units(0)).toBe(0)
  })
})

describe('adjust', () => {
  it('reduces Food by $100 and leaves remaining 100 without touching savings', () => {
    const afterOne = adjust(seedBudget(), 'food', -50)
    const afterTwo = adjust(afterOne, 'food', -50)
    expect(afterTwo.categories.food).toBe(550)
    expect(afterTwo.categories.housing).toBe(1500)
    expect(afterTwo.categories.transport).toBe(350)
    expect(afterTwo.categories.entertainment).toBe(300)
    expect(afterTwo.categories.savings).toBe(1400)
    expect(deriveTotals(afterTwo.income, afterTwo.categories).remaining).toBe(100)
    expect(units(seedBudget().categories.food)).toBe(13)
    expect(units(afterTwo.categories.food)).toBe(11)
  })

  it('does not mutate the input budget', () => {
    const seed = seedBudget()
    adjust(seed, 'food', -50)
    expect(seed.categories.food).toBe(650)
  })

  it('clamps at $0 and does not send the amount negative', () => {
    let budget = seedBudget()
    budget = { ...budget, categories: { ...budget.categories, food: 0 } }
    const next = adjust(budget, 'food', -50)
    expect(next.categories.food).toBe(0)
  })
})

describe('reset', () => {
  it('restores the exact seed after a mutation', () => {
    const mutated = adjust(adjust(seedBudget(), 'food', 50), 'housing', 50)
    const restored = reset()
    expect(restored.categories).toEqual(SEED_CATEGORIES)
    expect(restored.income).toBe(SEED_INCOME)
    expect(deriveTotals(restored.income, restored.categories).remaining).toBe(0)
    expect(mutated.categories.food).toBe(700)
  })
})

describe('impactLine', () => {
  it('formats the Food -$100 demo line', () => {
    expect(impactLine('Food', -100, 100)).toBe('Food -$100 → Remaining +$100')
  })
})
