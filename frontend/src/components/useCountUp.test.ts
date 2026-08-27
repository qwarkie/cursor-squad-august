import { describe, expect, it } from 'vitest'

import { countUpValue } from './useCountUp'

describe('countUpValue', () => {
  it('starts on the old figure and ends on the new one exactly', () => {
    expect(countUpValue(4200, 2700, 0)).toBe(4200)
    expect(countUpValue(4200, 2700, 1)).toBe(2700)
  })

  it('never overshoots the target or drifts past the start', () => {
    for (const t of [0.1, 0.25, 0.5, 0.75, 0.9, 0.99]) {
      const v = countUpValue(4200, 2700, t)
      expect(v).toBeLessThanOrEqual(4200)
      expect(v).toBeGreaterThanOrEqual(2700)
    }
  })

  it('counts upward as readily as downward', () => {
    expect(countUpValue(0, 4200, 1)).toBe(4200)
    expect(countUpValue(0, 4200, 0.5)).toBeGreaterThan(0)
    expect(countUpValue(0, 4200, 0.5)).toBeLessThan(4200)
  })

  it('crosses zero into a negative remaining without clamping', () => {
    expect(countUpValue(100, -400, 1)).toBe(-400)
    const mid = countUpValue(100, -400, 0.5)
    expect(mid).toBeLessThan(100)
    expect(mid).toBeGreaterThan(-400)
  })

  it('is whole dollars at every step — no cents flicker through the header', () => {
    for (const t of [0.13, 0.37, 0.61, 0.88]) {
      expect(Number.isInteger(countUpValue(4200, 2733, t))).toBe(true)
    }
  })

  it('eases out, so most of the distance is covered early', () => {
    const half = countUpValue(0, 1000, 0.5)
    expect(half).toBeGreaterThan(500)
  })

  it('clamps outside the 0..1 range rather than extrapolating', () => {
    expect(countUpValue(4200, 2700, -1)).toBe(4200)
    expect(countUpValue(4200, 2700, 2)).toBe(2700)
  })
})
