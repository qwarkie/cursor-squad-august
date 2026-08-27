import { describe, expect, it } from 'vitest'

import { budgetToRiver, TRUNK_MAX } from '../engine'
import { SEEDED_BUDGET } from '../fixtures/budget'

import { coinPlan, coinsFor, TRAVERSE_SECONDS } from './coins'

const seeded = budgetToRiver(SEEDED_BUDGET)

const perSegment = (model: Parameters<typeof coinPlan>[0]) => {
  const counts = new Map<number, number>()
  for (const coin of coinPlan(model)) counts.set(coin.segment, (counts.get(coin.segment) ?? 0) + 1)
  return counts
}

describe('coinsFor', () => {
  it('carries nothing on a dry bed', () => {
    expect(coinsFor(0)).toBe(0)
    expect(coinsFor(-5)).toBe(0)
    expect(coinsFor(Number.NaN)).toBe(0)
  })

  it('carries at least one coin on any live stretch', () => {
    expect(coinsFor(1)).toBeGreaterThanOrEqual(1)
    expect(coinsFor(2)).toBeGreaterThanOrEqual(1)
  })

  it('never crowds, however wide the river', () => {
    expect(coinsFor(TRUNK_MAX)).toBeLessThanOrEqual(6)
    expect(coinsFor(1000)).toBeLessThanOrEqual(6)
  })

  it('is monotonic in width — more money is never fewer coins', () => {
    for (let w = 1; w < 60; w += 1) expect(coinsFor(w + 1)).toBeGreaterThanOrEqual(coinsFor(w))
  })

  it('a wide river visibly carries more than a thin one (art-bible §5)', () => {
    expect(coinsFor(TRUNK_MAX)).toBeGreaterThan(coinsFor(4))
  })
})

describe('coinPlan — density is the data', () => {
  it('thins downstream, because the trunk does', () => {
    const counts = perSegment(seeded)
    const inOrder = [...counts.keys()].sort((a, b) => a - b).map((k) => counts.get(k)!)
    expect(inOrder.length).toBeGreaterThan(1)
    for (let i = 1; i < inOrder.length; i += 1) {
      expect(inOrder[i]).toBeLessThanOrEqual(inOrder[i - 1])
    }
  })

  it('puts the most coins on the stretch carrying the whole income', () => {
    const counts = perSegment(seeded)
    const first = counts.get(0)!
    for (const [segment, count] of counts) if (segment > 0) expect(count).toBeLessThanOrEqual(first)
  })

  it('shows no money flowing over a dry bed (US4)', () => {
    const overspent = budgetToRiver({
      income: 1000,
      categories: [
        { id: 'a', label: 'Rent', amount: 900, kind: 'expense', color: 'r' },
        { id: 'b', label: 'Food', amount: 400, kind: 'expense', color: 'f' },
      ],
      updatedAt: '',
    })
    expect(overspent.state).toBe('overspent')
    const dry = overspent.segments
      .map((seg, index) => ({ seg, index }))
      .filter(({ seg }) => seg.width === 0)
    expect(dry.length).toBeGreaterThan(0)
    const counts = perSegment(overspent)
    for (const { index } of dry) expect(counts.get(index) ?? 0).toBe(0)
  })

  it('carries nothing before there is a river', () => {
    expect(coinPlan(budgetToRiver({ income: 0, categories: [], updatedAt: '' }))).toEqual([])
    expect(coinPlan({ segments: [] })).toEqual([])
    expect(coinPlan(undefined)).toEqual([])
  })
})

describe('coinPlan — timing', () => {
  it('moves at one speed down the whole river', () => {
    // Equal speed means duration is proportional to the stretch's own length.
    const plan = coinPlan(seeded)
    const bySegment = new Map(plan.map((c) => [c.segment, c.duration]))
    const speeds = [...bySegment.entries()].map(([index, duration]) => {
      const seg = seeded.segments[index]
      return (seg.toY - seg.fromY) / duration
    })
    for (const speed of speeds) expect(speed).toBeCloseTo(speeds[0], 1)
  })

  it('times each stretch as its share of the whole traverse', () => {
    const totalLength = seeded.segments.reduce((sum, seg) => sum + (seg.toY - seg.fromY), 0)
    for (const coin of coinPlan(seeded)) {
      const seg = seeded.segments[coin.segment]
      const share = (seg.toY - seg.fromY) / totalLength
      expect(coin.duration).toBeCloseTo(TRAVERSE_SECONDS * share, 2)
    }
  })

  /**
   * The seeded month is balanced — remaining is exactly $0 — so the stretch
   * below the last branch carries nothing and shows no coins. That is the
   * behaviour, not a gap: money that is fully allocated is not still flowing.
   */
  it('shows no coins below the last branch when every dollar is allocated', () => {
    expect(seeded.state).toBe('balanced')
    const last = seeded.segments.length - 1
    expect(seeded.segments[last].width).toBe(0)
    expect(coinPlan(seeded).some((c) => c.segment === last)).toBe(false)
  })

  it('starts with the river already carrying coins, not filling up', () => {
    for (const coin of coinPlan(seeded)) expect(coin.delay).toBeLessThanOrEqual(0)
  })

  it('staggers by index and never randomises (FR-015)', () => {
    expect(coinPlan(seeded)).toEqual(coinPlan(seeded))
  })

  it('keys are unique and stable', () => {
    const keys = coinPlan(seeded).map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('emits only finite numbers', () => {
    for (const coin of coinPlan(seeded)) {
      expect(Number.isFinite(coin.delay)).toBe(true)
      expect(Number.isFinite(coin.duration)).toBe(true)
      expect(coin.duration).toBeGreaterThan(0)
    }
  })
})
