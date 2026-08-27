import { describe, it, expect } from 'vitest'

import { budgetToRiver, TRUNK_MAX, MEANDER_A, MEANDER_W } from './river'
import { SEEDED_BUDGET, EMPTY_BUDGET } from '../fixtures/budget'
import type { Budget } from '../types'

function cat(id: string, amount: number, kind: 'expense' | 'savings' = 'expense') {
  return { id, label: id, amount, kind, color: 'r' as const }
}

const budgets: Budget[] = [
  EMPTY_BUDGET,
  SEEDED_BUDGET,
  { income: 4200, categories: [cat('h', 1500), cat('f', 650)], updatedAt: 'x' },
  { income: 1000, categories: [cat('a', 1200)], updatedAt: 'x' },
  { income: 500, categories: [], updatedAt: 'x' },
  { income: 200, categories: [cat('a', 100), cat('b', 100)], updatedAt: 'x' },
  { income: -1, categories: [cat('a', NaN)], updatedAt: 'x' },
]

describe('budgetToRiver: remaining', () => {
  it('equals income minus the sum of amounts across a table of budgets, including negatives', () => {
    for (const b of budgets) {
      const validAmounts = b.categories.map((c) => (Number.isFinite(c.amount) && c.amount > 0 ? c.amount : 0))
      const expected = b.income - validAmounts.reduce((s, a) => s + a, 0)
      expect(budgetToRiver(b).remaining).toBe(Number.isFinite(b.income) ? expected : -validAmounts.reduce((s, a) => s + a, 0))
    }
  })
})

describe('budgetToRiver: segment widths', () => {
  it('are monotonically non-increasing from spring to mouth', () => {
    for (const b of budgets) {
      const { segments } = budgetToRiver(b)
      for (let i = 1; i < segments.length; i++) {
        expect(segments[i].width).toBeLessThanOrEqual(segments[i - 1].width)
      }
    }
  })
})

describe('budgetToRiver: terminal states', () => {
  it('reports empty for zero income', () => {
    expect(budgetToRiver(EMPTY_BUDGET).state).toBe('empty')
  })

  it('reports surplus when remaining is positive', () => {
    const b: Budget = { income: 1000, categories: [cat('a', 400)], updatedAt: 'x' }
    expect(budgetToRiver(b).state).toBe('surplus')
  })

  it('reports balanced, never overspent, when remaining is exactly zero — the seeded month', () => {
    const model = budgetToRiver(SEEDED_BUDGET)
    expect(model.remaining).toBe(0)
    expect(model.state).toBe('balanced')
  })

  it('reports overspent when remaining is negative', () => {
    const b: Budget = { income: 1000, categories: [cat('a', 1200)], updatedAt: 'x' }
    const model = budgetToRiver(b)
    expect(model.remaining).toBe(-200)
    expect(model.state).toBe('overspent')
  })
})

describe('budgetToRiver: determinism', () => {
  it('returns deeply equal results for two calls on the same budget', () => {
    expect(budgetToRiver(SEEDED_BUDGET)).toEqual(budgetToRiver(SEEDED_BUDGET))
  })
})

describe('budgetToRiver: zero-amount category', () => {
  it('yields a tributary with width 0 and stays at its index', () => {
    const b: Budget = {
      income: 1000,
      categories: [cat('a', 300), cat('b', 0), cat('c', 200)],
      updatedAt: 'x',
    }
    const { tributaries } = budgetToRiver(b)
    expect(tributaries[1].categoryId).toBe('b')
    expect(tributaries[1].width).toBe(0)
    expect(tributaries[1].amount).toBe(0)
  })
})

describe('budgetToRiver: junk input', () => {
  it('never throws and returns a valid model for negative income, NaN amounts, and an empty category list', () => {
    expect(() => budgetToRiver({ income: -1, categories: [], updatedAt: 'x' })).not.toThrow()
    expect(() => budgetToRiver({ income: 4200, categories: [cat('a', NaN)], updatedAt: 'x' })).not.toThrow()
    expect(() => budgetToRiver({ income: NaN, categories: [], updatedAt: 'x' })).not.toThrow()

    const negIncome = budgetToRiver({ income: -1, categories: [], updatedAt: 'x' })
    expect(negIncome.state).toBe('empty')
    expect(negIncome.segments[0].width).toBe(0)

    const nanAmount = budgetToRiver({ income: 4200, categories: [cat('a', NaN)], updatedAt: 'x' })
    expect(nanAmount.tributaries[0].amount).toBe(0)
    expect(nanAmount.tributaries[0].width).toBe(0)
  })
})

describe('budgetToRiver: integer output', () => {
  it('produces only whole numbers for every coordinate and width', () => {
    for (const b of budgets) {
      const model = budgetToRiver(b)
      for (const seg of model.segments) {
        expect(Number.isInteger(seg.fromY)).toBe(true)
        expect(Number.isInteger(seg.toY)).toBe(true)
        expect(Number.isInteger(seg.width)).toBe(true)
      }
      for (const trib of model.tributaries) {
        expect(Number.isInteger(trib.atY)).toBe(true)
        expect(Number.isInteger(trib.width)).toBe(true)
      }
    }
  })
})

describe('meander constants (data-model.md §The maths)', () => {
  it('match the spec values consumed by world/path.ts xOffset', () => {
    expect(MEANDER_A).toBe(6)
    expect(MEANDER_W).toBe(20)
  })
})

describe('budgetToRiver: worked example (contracts/engine.md)', () => {
  it('matches the documented income/housing/food geometry exactly', () => {
    const model = budgetToRiver({
      income: 4200,
      categories: [cat('h', 1500), cat('f', 650)],
      updatedAt: 'x',
    })
    expect(model.segments.map((s) => s.width)).toEqual([16, 10, 8])
    expect(model.segments[0].carried).toBe(4200)
    expect(model.segments[1].carried).toBe(2700)
    expect(model.segments[2].carried).toBe(2050)
    expect(model.tributaries[0]).toMatchObject({ categoryId: 'h', amount: 1500, width: 6, side: 'right' })
    expect(model.tributaries[1]).toMatchObject({ categoryId: 'f', amount: 650, width: 2, side: 'left' })
    expect(model.remaining).toBe(2050)
    expect(model.state).toBe('surplus')
    expect(model.segments[0].width).toBe(TRUNK_MAX)
  })
})
