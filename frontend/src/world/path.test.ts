import { describe, expect, it } from 'vitest'

import { budgetToRiver, MEANDER_A, MEANDER_W, MOUTH_Y, SPRING_Y } from '../engine'
import { SEEDED_BUDGET } from '../fixtures/budget'
import { riverPath, scalePath, trunkX, xOffset, type RiverGeometry } from './path'

/** The worked example's trunk from contracts/engine.md — three segments, 16 → 104. */
const WORKED: RiverGeometry = {
  segments: [
    { fromY: 16, toY: 45 },
    { fromY: 45, toY: 75 },
    { fromY: 75, toY: 104 },
  ],
}

const numbersIn = (d: string): number[] => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)

describe('xOffset', () => {
  it('is a closed form of y alone, so two loads produce identical geometry (SC-007)', () => {
    for (let y = 0; y <= 128; y += 1) expect(xOffset(y)).toBe(xOffset(y))
  })

  it('stays within the declared amplitude', () => {
    for (let y = 0; y <= 128; y += 1) expect(Math.abs(xOffset(y))).toBeLessThanOrEqual(6)
  })

  it('uses the meander constants from the engine, not a local copy', () => {
    // sin(y/20) peaks at y = 10*pi ~= 31.4, where the offset should reach +MEANDER_A.
    expect(MEANDER_A).toBe(6)
    expect(MEANDER_W).toBe(20)
    expect(xOffset(31)).toBe(MEANDER_A)
    expect(xOffset(0)).toBe(0)
  })

  it('returns whole art-pixels — a fractional coordinate blurs pixel art', () => {
    for (let y = 0; y <= 128; y += 1) expect(Number.isInteger(xOffset(y))).toBe(true)
  })
})

describe('trunkX', () => {
  it('wanders around the centre of the 96-wide world', () => {
    for (let y = 0; y <= 128; y += 1) {
      expect(trunkX(y)).toBeGreaterThanOrEqual(42)
      expect(trunkX(y)).toBeLessThanOrEqual(54)
    }
  })
})

describe('riverPath', () => {
  it('runs from the first segment top to the last segment bottom', () => {
    const d = riverPath(WORKED)
    expect(d.startsWith('M')).toBe(true)
    expect(d).toContain(`M${trunkX(16)} 16`)
    expect(d.endsWith(`L${trunkX(104)} 104`)).toBe(true)
  })

  it('emits only whole art-pixels, so an integer scale stays exact', () => {
    for (const n of numbersIn(riverPath(WORKED))) expect(Number.isInteger(n)).toBe(true)
  })

  it('is pure — two calls on the same model are identical', () => {
    expect(riverPath(WORKED)).toBe(riverPath(WORKED))
  })

  it('samples one point per art-pixel of height', () => {
    // 16..104 inclusive is 89 points, each carrying an x and a y.
    expect(numbersIn(riverPath(WORKED))).toHaveLength(89 * 2)
  })

  it('yields nothing to draw for an empty or degenerate model', () => {
    expect(riverPath({ segments: [] })).toBe('')
    expect(riverPath({ segments: [{ fromY: 50, toY: 50 }] })).toBe('')
    expect(riverPath({ segments: [{ fromY: 80, toY: 20 }] })).toBe('')
  })
})

describe('scalePath', () => {
  it('scalePath(riverPath(m), 4) is exactly 4x the art-unit coordinates', () => {
    const art = numbersIn(riverPath(WORKED))
    const css = numbersIn(scalePath(riverPath(WORKED), 4))
    expect(css).toHaveLength(art.length)
    css.forEach((n, i) => expect(n).toBe(art[i] * 4))
  })

  it('holds at every scale in the art-bible table', () => {
    const art = numbersIn(riverPath(WORKED))
    for (const scale of [3, 4, 5, 6]) {
      const css = numbersIn(scalePath(riverPath(WORKED), scale))
      css.forEach((n, i) => expect(n).toBe(art[i] * scale))
      expect(css.every(Number.isInteger)).toBe(true)
    }
  })

  it('preserves the path commands, scaling only the numbers', () => {
    expect(scalePath('M48 16 L50 17', 4)).toBe('M192 64 L200 68')
  })

  it('is identity at scale 1', () => {
    const d = riverPath(WORKED)
    expect(scalePath(d, 1)).toBe(d)
  })

  it('degrades rather than throwing on junk', () => {
    expect(scalePath('', 4)).toBe('')
    expect(scalePath('M48 16', 0)).toBe('M48 16')
    expect(scalePath('M48 16', Number.NaN)).toBe('M48 16')
  })
})

/**
 * The engine/world seam. `riverPath` is typed against a structural
 * `RiverGeometry` so `world/` carries no import on `engine/`; these assert that
 * a real `RiverModel` from `budgetToRiver` still satisfies it, and that the
 * curve spans the trunk the engine actually produced. If this breaks, the two
 * surfaces have drifted apart and the coins will leave the water.
 */
describe('engine seam', () => {
  it('accepts a real RiverModel from budgetToRiver', () => {
    const d = riverPath(budgetToRiver(SEEDED_BUDGET))
    expect(d.startsWith(`M${trunkX(SPRING_Y)} ${SPRING_Y}`)).toBe(true)
    expect(d.endsWith(`L${trunkX(MOUTH_Y)} ${MOUTH_Y}`)).toBe(true)
  })

  it('keeps the seeded month exact at every scale in the art-bible table', () => {
    const art = numbersIn(riverPath(budgetToRiver(SEEDED_BUDGET)))
    expect(art.length).toBeGreaterThan(0)
    expect(art.every(Number.isInteger)).toBe(true)
    for (const scale of [3, 4, 5, 6]) {
      const css = numbersIn(scalePath(riverPath(budgetToRiver(SEEDED_BUDGET)), scale))
      css.forEach((n, i) => expect(n).toBe(art[i] * scale))
    }
  })

  /**
   * A trap for whoever strokes this path. At `state: 'empty'` the engine still
   * returns one full-length segment — carrying 0, at `width: 0`. `riverPath`
   * therefore returns a complete centre line: it describes the trunk's *course*,
   * not whether it is visible. Visibility comes from `segment.width` alone.
   *
   * So River.tsx must stroke with the model's own width and must never floor it
   * to MIN_WIDTH. Floor it and a ghost river is painted across the empty green
   * field, which is the opening frame of the demo (US1 scenario 1).
   */
  it('still yields a centre line when the state is empty, at zero width', () => {
    const model = budgetToRiver({ income: 0, categories: [], updatedAt: '' })
    expect(model.state).toBe('empty')
    expect(model.segments.every((seg) => seg.width === 0)).toBe(true)
    expect(riverPath(model)).not.toBe('')
  })
})
