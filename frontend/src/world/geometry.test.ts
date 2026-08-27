import { describe, expect, it } from 'vitest'

import { RANK_ART_W, tributaryEnd, trunkWidthAt } from './geometry'
import { trunkX, WORLD_W } from './path'
import { budgetToRiver, TRUNK_MAX } from '../engine'
import type { Budget } from '../types'

/** A branch point is a segment boundary, so both neighbours cover it. */
const MODEL = {
  segments: [
    { fromY: 16, toY: 40, width: TRUNK_MAX },
    { fromY: 40, toY: 104, width: 6 },
  ],
}

const HALF = RANK_ART_W / 2

describe('trunkWidthAt', () => {
  it('takes the wider of the two segments meeting at a branch point', () => {
    expect(trunkWidthAt(MODEL, 40)).toBe(TRUNK_MAX)
  })

  it('reads the segment a height falls inside', () => {
    expect(trunkWidthAt(MODEL, 20)).toBe(TRUNK_MAX)
    expect(trunkWidthAt(MODEL, 80)).toBe(6)
  })

  it('is 0 off the river, and for a model with no segments at all', () => {
    expect(trunkWidthAt(MODEL, 120)).toBe(0)
    expect(trunkWidthAt({ segments: [] }, 40)).toBe(0)
    expect(trunkWidthAt(undefined, 40)).toBe(0)
  })
})

describe('tributaryEnd', () => {
  it('clears the bank, not the centre line — a wider trunk pushes the village further out', () => {
    const narrow = tributaryEnd(60, 'right', 2)
    const wide = tributaryEnd(60, 'right', TRUNK_MAX)
    expect(wide.x - narrow.x).toBe((TRUNK_MAX - 2) / 2)
  })

  it('mirrors on the left', () => {
    const right = tributaryEnd(60, 'right', TRUNK_MAX)
    const left = tributaryEnd(60, 'left', TRUNK_MAX)
    expect(right.x - trunkX(60)).toBe(trunkX(60) - left.x)
  })

  /**
   * The regression this file exists for. The village is centred on the end
   * point and its sprites are drawn over the water, so the water that reaches
   * the screen is bank → near edge. That gap went to ~2 art-px once and the
   * branch stopped reading as an outgoing flow at all.
   */
  it('leaves open water between the bank and the first house, at every branch on both banks', () => {
    for (let y = 0; y <= 128; y += 1) {
      for (const side of ['left', 'right'] as const) {
        const { x } = tributaryEnd(y, side, TRUNK_MAX)
        const bank = Math.abs(x - trunkX(y)) - TRUNK_MAX / 2
        expect(bank - HALF).toBeGreaterThanOrEqual(5)
      }
    }
  })

  it('keeps a whole village inside the world, which clips its overflow', () => {
    for (let y = 0; y <= 128; y += 1) {
      for (const side of ['left', 'right'] as const) {
        const { x } = tributaryEnd(y, side, TRUNK_MAX)
        expect(x - HALF).toBeGreaterThanOrEqual(0)
        expect(x + HALF).toBeLessThanOrEqual(WORLD_W)
      }
    }
  })

  it('holds for a real budget, at every branch the engine produces', () => {
    const budget: Budget = {
      income: 4200,
      updatedAt: '2026-08-26T09:00:00.000Z',
      categories: Array.from({ length: 6 }, (_, i) => ({
        id: `c${i}`,
        label: `C${i}`,
        amount: 300,
        kind: 'expense' as const,
        color: 'r' as const,
        icon: 'house' as const,
      })),
    }
    const model = budgetToRiver(budget)

    for (const trib of model.tributaries) {
      const { x } = tributaryEnd(trib.atY, trib.side, trunkWidthAt(model, trib.atY))
      expect(x - HALF).toBeGreaterThanOrEqual(0)
      expect(x + HALF).toBeLessThanOrEqual(WORLD_W)
    }
  })

  it('lands on whole art-pixels, and drops below the branch', () => {
    const { x, y } = tributaryEnd(45, 'right', 7)
    expect(Number.isInteger(x)).toBe(true)
    expect(y).toBe(55)
  })
})
