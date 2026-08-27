import { describe, expect, it } from 'vitest'

import { formatDelta, formatMoney, formatMonth, savingsRate } from './money'

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

describe('formatMonth', () => {
  it('reads the month and year straight from the ISO string, no clock', () => {
    expect(formatMonth('2026-08-26T09:00:00.000Z')).toBe('August 2026')
    expect(formatMonth('2026-01-01T00:00:00.000Z')).toBe('January 2026')
    expect(formatMonth('2026-12-31T23:59:59.999Z')).toBe('December 2026')
  })

  it('returns empty for an unparsable date rather than throwing', () => {
    expect(formatMonth('not-a-date')).toBe('')
  })
})

describe('savingsRate', () => {
  it('matches the seeded month exactly: 1400 / 4200 = 33%, not the brief mock\'s 30%', () => {
    const categories = [
      { kind: 'expense', amount: 1500 },
      { kind: 'expense', amount: 650 },
      { kind: 'expense', amount: 350 },
      { kind: 'expense', amount: 300 },
      { kind: 'savings', amount: 1400 },
    ]
    expect(savingsRate(4200, categories)).toBe(33)
  })

  it('is null for zero income rather than NaN or a division error', () => {
    expect(savingsRate(0, [])).toBeNull()
  })

  it('sums multiple savings categories and ignores non-finite or non-positive amounts', () => {
    expect(savingsRate(1000, [{ kind: 'savings', amount: 100 }, { kind: 'savings', amount: 150 }])).toBe(25)
    expect(savingsRate(1000, [{ kind: 'savings', amount: Number.NaN }])).toBe(0)
  })
})
