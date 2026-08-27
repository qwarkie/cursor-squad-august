import { describe, expect, it } from 'vitest'

import { budgetToRiver } from '../engine'
import { SEEDED_BUDGET } from '../fixtures/budget'
import type { Budget } from '../types'

import { COIN_SPEED, COINS_PER_INCOME, coinCounts, coinPlan, coinRoutes, routeKeyframes } from './coins'

const budget = (income: number, amounts: number[]): Budget => ({
  ...SEEDED_BUDGET,
  income,
  categories: amounts.map((amount, i) => ({
    id: `c${i}`,
    label: `C${i}`,
    amount,
    color: 'r',
    kind: 'expense',
  })) as Budget['categories'],
})

const model = (income: number, amounts: number[]) => budgetToRiver(budget(income, amounts))

describe('coinCounts', () => {
  it('gives one coin per tenth of income — the worked example from the brief', () => {
    // $3,000 income: $300 is a tenth, $600 two, $1,500 five.
    expect(coinCounts(model(3000, [300, 600, 1500])).branches).toEqual([1, 2, 5])
  })

  it('sends the unclaimed remainder on to the mouth', () => {
    const counts = coinCounts(model(3000, [300, 600, 1500]))
    expect(counts.mouth).toBe(COINS_PER_INCOME - 8) // $600 left over, two tenths
  })

  it('conserves coins at every junction', () => {
    const counts = coinCounts(model(4000, [950, 725, 480, 1145]))
    const spent = counts.branches.reduce((sum, n) => sum + n, 0)
    expect(spent + counts.mouth).toBe(COINS_PER_INCOME)
  })

  it('leaves nothing for the mouth when the month is balanced', () => {
    expect(coinCounts(budgetToRiver(SEEDED_BUDGET)).mouth).toBe(0)
  })

  it('still moves a coin down a category too small to round to one', () => {
    const counts = coinCounts(model(3000, [40, 40]))
    expect(counts.branches).toEqual([1, 1])
  })

  it('carries nothing without income', () => {
    expect(coinCounts(model(0, [100])).branches).toEqual([0])
    expect(coinCounts(model(0, [100])).mouth).toBe(0)
    expect(coinCounts(undefined)).toEqual({ branches: [], mouth: 0 })
  })
})

describe('coinRoutes', () => {
  it('routes one path per funded branch, plus the surplus to the mouth', () => {
    const routes = coinRoutes(model(3000, [300, 600, 1500]))
    expect(routes.map((r) => r.id)).toEqual(['c0', 'c1', 'c2', 'mouth'])
  })

  it('starts every route at the spring and ends a branch off the trunk', () => {
    const m = model(3000, [300, 600, 1500])
    const routes = coinRoutes(m)
    for (const route of routes) {
      expect(route.points[0].y).toBe(m.segments[0].fromY)
    }
    const branch = routes[0]
    expect(branch.points[branch.points.length - 1].y).toBeGreaterThan(m.tributaries[0].atY)
  })

  it('times every route at one speed, so nothing on the river outruns anything else', () => {
    for (const route of coinRoutes(model(3000, [300, 600, 1500]))) {
      expect(route.duration).toBeCloseTo(route.length / COIN_SPEED, 2)
    }
  })

  it('does not run coins down a dry bed', () => {
    const overspent = coinRoutes(model(1000, [700, 700]))
    expect(overspent.some((r) => r.id === 'mouth')).toBe(false)
  })

  it('draws nothing before any income', () => {
    expect(coinRoutes(model(0, [100]))).toEqual([])
    expect(coinRoutes(undefined)).toEqual([])
  })
})

describe('coinPlan', () => {
  const plan = coinPlan(model(3000, [300, 600, 1500]))

  it('schedules exactly the coins the counts called for', () => {
    expect(plan.coins.length).toBe(COINS_PER_INCOME)
  })

  it('shares one cycle across every route — the longest one sets it', () => {
    expect(plan.cycle).toBe(Math.max(...plan.routes.map((r) => r.duration)))
  })

  it('spreads departures evenly across the cycle', () => {
    const delays = plan.coins.map((c) => -c.delay).sort((a, b) => a - b)
    const gaps = delays.slice(1).map((d, i) => d - delays[i])
    for (const gap of gaps) expect(gap).toBeCloseTo(plan.cycle / plan.coins.length, 2)
  })

  it('interleaves routes rather than sending them in batches', () => {
    const order = plan.coins.map((c) => c.route)
    expect(new Set(order.slice(0, 4)).size).toBeGreaterThan(1)
  })

  it('is identical across two builds of the same budget (SC-007)', () => {
    expect(coinPlan(model(3000, [300, 600, 1500]))).toEqual(plan)
  })
})

describe('routeKeyframes', () => {
  it('holds a short route hidden at its settlement for the rest of the cycle', () => {
    const short = coinPlan(model(3000, [300, 600, 1500])).routes[0]
    const css = routeKeyframes('coin-route-0', short, 10)
    expect(css).toContain('offset-distance: 0%')
    expect(css).toMatch(/100% \{ offset-distance: 100%; opacity: 0; \}/)
    // arrives before the cycle is out
    const arrive = Number(/([\d.]+)% \{ offset-distance: 100%/.exec(css)![1])
    expect(arrive).toBeLessThan(100)
    expect(arrive).toBeGreaterThan(0)
  })
})
