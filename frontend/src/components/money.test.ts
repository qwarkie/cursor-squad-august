import { describe, expect, it } from 'vitest'

import { formatDelta, formatMoney } from './money'

describe('formatMoney', () => {
  it('groups whole dollars with no cents', () => {
    expect(formatMoney(4200)).toBe('$4,200')
    expect(formatMoney(0)).toBe('$0')
    expect(formatMoney(650)).toBe('$650')
  })

  it('puts a true minus sign outside the currency mark', () => {
    expect(formatMoney(-400)).toBe('−$400')
    expect(formatMoney(-400)).not.toContain('-')
  })

  it('rounds rather than showing cents, and survives non-finite input', () => {
    expect(formatMoney(4200.4)).toBe('$4,200')
    expect(formatMoney(Number.NaN)).toBe('$0')
  })
})

describe('formatDelta', () => {
  it('signs the change in both directions', () => {
    expect(formatDelta(-100)).toBe('−$100')
    expect(formatDelta(100)).toBe('+$100')
    expect(formatDelta(0)).toBe('$0')
  })
})
