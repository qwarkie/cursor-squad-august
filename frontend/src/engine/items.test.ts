import { describe, it, expect } from 'vitest'

import { applyCreate, applyDelete, applyToggle, nextId } from './items'
import type { Item } from '../types'

const base: Item[] = [
  {
    id: 1,
    title: 'First',
    description: null,
    is_done: false,
    created_at: '2026-08-26T00:00:00',
    updated_at: '2026-08-26T00:00:00',
  },
  {
    id: 2,
    title: 'Second',
    description: 'note',
    is_done: true,
    created_at: '2026-08-26T00:01:00',
    updated_at: '2026-08-26T00:01:00',
  },
]

describe('nextId', () => {
  it('starts at 1 for an empty list', () => {
    expect(nextId([])).toBe(1)
  })

  it('is one past the highest existing id, not the length', () => {
    expect(nextId(base)).toBe(3)
    expect(nextId([{ ...base[0], id: 42 }])).toBe(43)
  })
})

describe('applyToggle', () => {
  it('flips is_done for the named item only', () => {
    const next = applyToggle(base, 1)
    expect(next[0].is_done).toBe(true)
    expect(next[1].is_done).toBe(true)
  })

  it('does not mutate the input array', () => {
    applyToggle(base, 1)
    expect(base[0].is_done).toBe(false)
  })

  it('leaves the list untouched when the id is unknown', () => {
    expect(applyToggle(base, 999)).toEqual(base)
  })
})

describe('applyDelete', () => {
  it('removes the named item', () => {
    const next = applyDelete(base, 1)
    expect(next).toHaveLength(1)
    expect(next[0].id).toBe(2)
  })

  it('does not mutate the input array', () => {
    applyDelete(base, 1)
    expect(base).toHaveLength(2)
  })

  it('leaves the list untouched when the id is unknown', () => {
    expect(applyDelete(base, 999)).toEqual(base)
  })
})

describe('applyCreate', () => {
  it('puts the newest item first, matching the API ordering', () => {
    const next = applyCreate(base, { title: 'Third' }, '2026-08-26T00:02:00')
    expect(next[0].title).toBe('Third')
    expect(next).toHaveLength(3)
  })

  it('assigns a fresh id and the supplied timestamp', () => {
    const next = applyCreate(base, { title: 'Third' }, '2026-08-26T00:02:00')
    expect(next[0].id).toBe(3)
    expect(next[0].created_at).toBe('2026-08-26T00:02:00')
    expect(next[0].updated_at).toBe('2026-08-26T00:02:00')
  })

  it('defaults description to null and is_done to false', () => {
    const next = applyCreate(base, { title: 'Third' }, '2026-08-26T00:02:00')
    expect(next[0].description).toBeNull()
    expect(next[0].is_done).toBe(false)
  })

  it('does not mutate the input array', () => {
    applyCreate(base, { title: 'Third' }, '2026-08-26T00:02:00')
    expect(base).toHaveLength(2)
  })
})
