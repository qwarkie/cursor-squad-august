import { describe, expect, it } from 'vitest'

import { validateIncome } from './validate'

describe('validateIncome', () => {
  it('accepts a plain number, and tolerates the way people type money', () => {
    expect(validateIncome('4200')).toEqual({ income: 4200 })
    expect(validateIncome(' 4200 ')).toEqual({ income: 4200 })
    expect(validateIncome('$4,200')).toEqual({ income: 4200 })
    expect(validateIncome('4200.6')).toEqual({ income: 4201 })
  })

  it('rejects empty, zero, negative and non-numeric with a message', () => {
    expect(validateIncome('')).toHaveProperty('error')
    expect(validateIncome('   ')).toHaveProperty('error')
    expect(validateIncome('0')).toHaveProperty('error')
    expect(validateIncome('-5')).toHaveProperty('error')
    expect(validateIncome('abc')).toHaveProperty('error')
    expect(validateIncome('12abc')).toHaveProperty('error')
  })

  it('names the reason rather than saying "invalid"', () => {
    const zero = validateIncome('0')
    expect('error' in zero && zero.error).toMatch(/more than \$0/)
    const negative = validateIncome('-5')
    expect('error' in negative && negative.error).toMatch(/negative/)
  })
})
