import { describe, expect, it } from 'vitest'

import { trunkX } from './path'
import { bandSpans, poolRows } from './water'

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
