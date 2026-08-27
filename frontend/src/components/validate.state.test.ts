import { describe, expect, it } from 'vitest'

import { terminalState } from './validate'

describe('terminalState', () => {
  it('reads no income as the empty field, not as balanced', () => {
    expect(terminalState(0, 0)).toBe('empty')
  })

  it('separates balanced from overspent — the spec calls this the easiest thing to get wrong', () => {
    expect(terminalState(4200, 0)).toBe('balanced')
    expect(terminalState(4200, -400)).toBe('overspent')
    expect(terminalState(4200, 1250)).toBe('surplus')
  })
})
