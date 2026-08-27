import { describe, expect, it } from 'vitest'

import { budgetToRiver } from '../engine'
import { SEEDED_BUDGET } from '../fixtures/budget'
import type { Budget } from '../types'

import {
  COIN_SPEED,
  COINS_PER_INCOME,
  coinCounts,
  coinPlan,
  coinRoutes,
  departureOrder,
  routeKeyframes,
} from './coins'

/** Largest run of consecutive departures claimed by one route — a clump. */
const longestRun = (order: readonly number[]) =>
  order.reduce(
    (acc, r, i) => {
      const run = i > 0 && order[i - 1] === r ? acc.run + 1 : 1
      return { run, max: Math.max(acc.max, run) }
    },
    { run: 0, max: 0 },
  ).max

/** Cyclic gaps between one route's departures — how evenly it is spread. */
const gapsFor = (order: readonly number[], route: number) => {
  const at = order.flatMap((r, i) => (r === route ? [i] : []))
  return at.map((v, i) => (i === 0 ? v + order.length - at[at.length - 1] : v - at[i - 1]))
}

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

describe('departureOrder', () => {
  it('alternates strictly when two routes want the same share', () => {
    expect(departureOrder([5, 5])).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 0, 1])
  })

  it('spreads a lone coin through the sequence instead of grouping the singles', () => {
    // The shape that made the trunk clump: several one-coin branches all
    // claiming the middle of the cycle and departing back to back.
    const order = departureOrder([1, 1, 1, 1, 6])
    expect(longestRun(order)).toBeLessThanOrEqual(2)
    for (const route of [0, 1, 2, 3]) expect(gapsFor(order, route)).toEqual([10])
  })

  it('keeps the whole stream even, not just each route on its own', () => {
    // What a reader sees on one stretch of trunk is the coins still riding it:
    // everything bound for a junction further down. So every such tail has to
    // be spread too — a branch whose coins left in a batch takes its shape out
    // of the water below its own junction and leaves a hole there.
    for (const counts of [
      [4, 2, 1, 1, 2],
      [4, 3, 2, 1],
      [2, 2, 2, 2, 2],
      [3, 3, 4],
    ]) {
      const order = departureOrder(counts)
      for (let junction = 0; junction < counts.length - 1; junction += 1) {
        const at = order.flatMap((r, i) => (r > junction ? [i] : []))
        if (at.length < 2) continue
        const gaps = at.map((v, i) => (i === 0 ? v + order.length - at[at.length - 1] : v - at[i - 1]))
        expect(Math.max(...gaps)).toBeLessThanOrEqual((2 * order.length) / at.length)
      }
    }
  })

  it('never leaves a route waiting more than twice its fair share', () => {
    // Departures are whole slots and there are only ten of them, so a route's
    // gaps cannot all be its exact ideal. What they must not do is bunch: a
    // gap of twice the mean is a hole a reader sees on the water.
    for (const counts of [
      [4, 3, 2, 1],
      [4, 2, 1, 1, 2],
      [3, 2, 1, 1, 1, 2],
      [2, 1, 1, 1, 5],
    ]) {
      const order = departureOrder(counts)
      const total = counts.reduce((a, b) => a + b, 0)
      counts.forEach((n, route) => {
        expect(Math.max(...gapsFor(order, route))).toBeLessThanOrEqual((2 * total) / n)
      })
    }
  })

  it('does not send the small branches out back to back — the bug this replaced', () => {
    // Four one-coin branches and a six-coin mouth. Sorting each route's coins
    // by its own midpoint put every single at 0.5 of the cycle, so all four
    // left the spring in a row and the mouth's six followed as one queue:
    // 4,4,4,0,1,2,3,4,4,4. That is the clump and the hole, in one sequence.
    const order = departureOrder([1, 1, 1, 1, 6])
    const singles = order.flatMap((r, i) => (r < 4 ? [i] : []))
    for (let i = 1; i < singles.length; i += 1) {
      expect(singles[i] - singles[i - 1]).toBeGreaterThan(1)
    }
  })

  it('hands out exactly the departures it was asked for', () => {
    const counts = [4, 3, 2, 1]
    const order = departureOrder(counts)
    counts.forEach((n, route) => {
      expect(order.filter((r) => r === route).length).toBe(n)
    })
  })

  it('is empty when nothing is flowing', () => {
    expect(departureOrder([])).toEqual([])
    expect(departureOrder([0, 0])).toEqual([])
  })
})

describe('the stream on the trunk', () => {
  it('thins evenly below a junction rather than opening a hole', () => {
    // Below the first junction the trunk carries everything except that
    // branch's coins. If those departed in a batch, what is left has one long
    // gap; spread, it just gets sparser. Measured on the seeded month.
    const plan = coinPlan(budgetToRiver(SEEDED_BUDGET))
    const order = plan.coins.map((c) => c.route)

    for (let junction = 0; junction < plan.routes.length - 1; junction += 1) {
      const below = order.map((r) => r > junction)
      const carried = below.filter(Boolean).length
      if (carried < 2) continue

      const at = below.flatMap((keeps, i) => (keeps ? [i] : []))
      const gaps = at.map((v, i) => (i === 0 ? v + order.length - at[at.length - 1] : v - at[i - 1]))
      expect(Math.max(...gaps)).toBeLessThanOrEqual((2 * order.length) / carried)
    }
  })
})
