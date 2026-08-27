import { describe, expect, it } from 'vitest'

import { trunkX } from './path'
import { bandSpans, colorDistance, poolRows } from './water'

describe('bandSpans', () => {
  it('draws nothing for an absent, empty or zero-width band list', () => {
    expect(bandSpans(undefined)).toEqual([])
    expect(bandSpans([])).toEqual([])
    expect(bandSpans([{ fromY: 16, toY: 104, width: 0 }])).toEqual([])
  })

  it('covers every row from the first fromY to the last toY, exactly once', () => {
    const spans = bandSpans([
      { fromY: 16, toY: 40, width: 24 },
      { fromY: 40, toY: 104, width: 8 },
    ])

    const rows = spans.flatMap((s) => Array.from({ length: s.h }, (_, i) => s.y + i))
    expect(rows).toEqual([...new Set(rows)]) // no row drawn twice — a seam at any opacity below 1
    expect(Math.min(...rows)).toBe(16)
    expect(Math.max(...rows)).toBe(104)
    expect(rows.length).toBe(104 - 16 + 1)
  })

  it('centres every row on the trunk, so the two banks mirror each other', () => {
    for (const w of [2, 8, 9, 24]) {
      for (const span of bandSpans([{ fromY: 16, toY: 104, width: w }])) {
        for (let i = 0; i < span.h; i++) {
          const y = span.y + i
          expect(span.x).toBe(trunkX(y) - Math.floor(w / 2))
          expect(span.w).toBe(w)
        }
      }
    }
  })

  it('merges consecutive rows that share an edge rather than emitting one rect per row', () => {
    const spans = bandSpans([{ fromY: 16, toY: 104, width: 24 }])
    expect(spans.length).toBeGreaterThan(0)
    expect(spans.length).toBeLessThan(104 - 16 + 1)
  })
})

describe('poolRows', () => {
  it('draws nothing for a degenerate radius', () => {
    expect(poolRows(0, 6)).toEqual([])
    expect(poolRows(12, 0)).toEqual([])
    expect(poolRows(-4, -4)).toEqual([])
  })

  it('is symmetric about its own centre in both axes', () => {
    const rows = poolRows(20, 10).flatMap((s) =>
      Array.from({ length: s.h }, (_, i) => ({ y: s.y + i, x: s.x, w: s.w })),
    )

    for (const row of rows) {
      expect(row.x).toBe(-row.w / 2) // horizontally centred
      const mirrored = rows.find((r) => r.y === -row.y)
      expect(mirrored?.w).toBe(row.w)
    }
  })

  it('is widest at the waist and never wider than its own diameter', () => {
    const rows = poolRows(20, 10).flatMap((s) =>
      Array.from({ length: s.h }, (_, i) => ({ y: s.y + i, w: s.w })),
    )
    const waist = rows.find((r) => r.y === 0)

    expect(waist?.w).toBe(40)
    expect(Math.max(...rows.map((r) => r.w))).toBe(40)
  })
})

describe('colorDistance', () => {
  it('is zero for identical colours and symmetric for different ones', () => {
    expect(colorDistance('#2b7fd4', '#2b7fd4')).toBe(0)
    expect(colorDistance('#000000', '#ffffff')).toBeCloseTo(Math.sqrt(3 * 255 ** 2))
    expect(colorDistance('#c0392b', '#2b7fd4')).toBeCloseTo(colorDistance('#2b7fd4', '#c0392b'))
  })

  it('ranks the palette the way SC-002 measured it by eye — slate and teal nearest water, clear of the rest', () => {
    // art-bible.md §2's five category hues (palette.ts) against the water
    // core (#2b7fd4). Pollen's luminance-contrast table picked the wrong
    // pair (brick's 1.32:1 is *lower* than teal's 1.39:1, yet brick reads
    // stronger) — this is the check that this metric picks the right ones.
    const water = '#2b7fd4'
    const brick = colorDistance('#c0392b', water)
    const wheat = colorDistance('#e08c3a', water)
    const slate = colorDistance('#6b7a99', water)
    const plum = colorDistance('#8a4fa8', water)
    const teal = colorDistance('#2fa88a', water)

    const weak = [slate, teal]
    const strong = [brick, wheat, plum]

    for (const w of weak) {
      for (const s of strong) {
        expect(w).toBeLessThan(s)
      }
    }
  })
})
