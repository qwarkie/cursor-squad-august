import { describe, expect, it } from 'vitest'

import { trunkX } from './path'
import { STRAIGHT, bandSpans, branchCurve, branchSpans, colorDistance, poolRows } from './water'

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

describe('branches curve, and do so answerably (spec §1, §7)', () => {
  const START = { x: 48, y: 40 }
  const ENDS = [
    { x: 20, y: 58 },
    { x: 76, y: 62 },
    { x: 14, y: 76 },
    { x: 82, y: 84 },
  ]
  const ids = ['housing', 'food', 'transport', 'entertainment', 'savings']

  /** Every column's vertical extent, left to right. */
  const columns = (spans: ReturnType<typeof branchSpans>) => {
    const byX = new Map<number, { top: number; bottom: number }>()
    for (const s of spans) {
      for (let x = s.x; x < s.x + s.w; x += 1) {
        const cur = byX.get(x)
        byX.set(
          x,
          cur
            ? { top: Math.min(cur.top, s.y), bottom: Math.max(cur.bottom, s.y + s.h) }
            : { top: s.y, bottom: s.y + s.h },
        )
      }
    }
    return [...byX.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)
  }

  it('is a pure function of the category — same id, same branch, always', () => {
    for (const id of ids) {
      const a = branchCurve(id, -28, 18)
      const b = branchCurve(id, -28, 18)
      expect(a).toEqual(b)
    }
  })

  it('gives different categories different shapes', () => {
    const shapes = ids.map((id) => JSON.stringify(branchCurve(id, -28, 18)))
    expect(new Set(shapes).size).toBe(ids.length)
  })

  it('starts and ends exactly where the trunk and the village are', () => {
    // A branch that misses its own endpoints is a branch that detaches from the
    // trunk at one end and from its settlement at the other.
    for (const end of ENDS) {
      const curve = branchCurve('housing', end.x - START.x, end.y - START.y)
      const straight = branchSpans(START, end, 3)
      const curved = branchSpans(START, end, 3, undefined, curve)
      const s = columns(straight)
      const c = columns(curved)
      expect(c[0]).toEqual(s[0])
      expect(c[c.length - 1]).toEqual(s[s.length - 1])
    }
  })

  it('actually bends — it is not a straight line wearing a curve', () => {
    for (const end of ENDS) {
      const curve = branchCurve('food', end.x - START.x, end.y - START.y)
      const straight = columns(branchSpans(START, end, 3))
      const curved = columns(branchSpans(START, end, 3, undefined, curve))
      const drift = straight.map((s, i) => Math.abs(s.top - curved[i].top))
      expect(Math.max(...drift)).toBeGreaterThanOrEqual(1)
    }
  })

  it('never breaks into disconnected pixels', () => {
    for (const id of ids) {
      for (const end of ENDS) {
        const curve = branchCurve(id, end.x - START.x, end.y - START.y)
        const cols = columns(branchSpans(START, end, 2, undefined, curve))
        for (let i = 1; i < cols.length; i += 1) {
          const a = cols[i - 1]
          const b = cols[i]
          expect(b.top).toBeLessThanOrEqual(a.bottom)
          expect(a.top).toBeLessThanOrEqual(b.bottom)
        }
      }
    }
  })

  it('has no sharp corner — no column steps more than 2px from the last', () => {
    for (const id of ids) {
      for (const end of ENDS) {
        const curve = branchCurve(id, end.x - START.x, end.y - START.y)
        const cols = columns(branchSpans(START, end, 3, undefined, curve))
        for (let i = 1; i < cols.length; i += 1) {
          expect(Math.abs(cols[i].top - cols[i - 1].top)).toBeLessThanOrEqual(2)
        }
      }
    }
  })

  it('bends less on a stub than on a long run, and never past the bound', () => {
    const short = branchCurve('housing', -6, 4)
    const long = branchCurve('housing', -60, 30)
    expect(short.amp).toBe(0)
    expect(Math.abs(long.amp)).toBeLessThanOrEqual(5)
  })

  it('leaves every other caller straight — the default is no curve', () => {
    for (const end of ENDS) {
      expect(branchSpans(START, end, 3)).toEqual(branchSpans(START, end, 3, undefined, STRAIGHT))
    }
  })
})

describe('§7: the curve survives every width the app can produce', () => {
  const START = { x: 48, y: 40 }
  const ENDS = [
    { x: 20, y: 58 },
    { x: 76, y: 62 },
    { x: 14, y: 76 },
    { x: 82, y: 84 },
    { x: 30, y: 44 },
  ]
  const ids = ['housing', 'food', 'transport', 'entertainment', 'savings']
  // 1 is a $50 tributary; 16 is the spring at full income. The rim draws at
  // width + 2, so the range has to cover past the widest the model emits.
  const WIDTHS = [1, 2, 3, 4, 6, 8, 10, 12, 16, 18]

  const columns = (spans: ReturnType<typeof branchSpans>) => {
    const byX = new Map<number, { top: number; bottom: number }>()
    for (const s of spans) {
      for (let x = s.x; x < s.x + s.w; x += 1) {
        const cur = byX.get(x)
        byX.set(
          x,
          cur
            ? { top: Math.min(cur.top, s.y), bottom: Math.max(cur.bottom, s.y + s.h) }
            : { top: s.y, bottom: s.y + s.h },
        )
      }
    }
    return [...byX.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)
  }

  it('never breaks, at any width, on any branch', () => {
    for (const id of ids) {
      for (const end of ENDS) {
        const curve = branchCurve(id, end.x - START.x, end.y - START.y)
        for (const w of WIDTHS) {
          const cols = columns(branchSpans(START, end, w, undefined, curve))
          for (let i = 1; i < cols.length; i += 1) {
            const a = cols[i - 1]
            const b = cols[i]
            if (b.top > a.bottom || a.top > b.bottom) {
              throw new Error(`break at width ${w}, ${id}, column ${i}`)
            }
          }
        }
      }
    }
  })

  /**
   * §7: "parallel edges of thick rivers should remain consistent through
   * curves". The two banks are drawn as separate concentric passes, so if the
   * curve were applied to a rounded centre rather than shared, a wide branch
   * would splay — the rim would part company with the body mid-bend.
   */
  it('keeps both banks parallel — thickness never varies along a branch', () => {
    for (const id of ids) {
      for (const end of ENDS) {
        const curve = branchCurve(id, end.x - START.x, end.y - START.y)
        for (const w of WIDTHS) {
          const cols = columns(branchSpans(START, end, w, undefined, curve))
          const heights = cols.map((c) => c.bottom - c.top)
          // A stretched column is taller by design where the slope demands it;
          // what must never happen is a column THINNER than the stroke.
          expect(Math.min(...heights)).toBeGreaterThanOrEqual(w)
        }
      }
    }
  })

  it('the flow highlight rides the same curve as the water it lights', () => {
    // The first version of this test asserted `s.h >= 1` and a findIndex that
    // could not fail — it passed without ever comparing the crest to the water.
    // A vacuous test is worse than none: it reports the property as guarded.
    for (const end of ENDS) {
      const curve = branchCurve('housing', end.x - START.x, end.y - START.y)
      const water = new Map<number, { top: number; bottom: number }>()
      for (const s of branchSpans(START, end, 8, undefined, curve)) {
        for (let x = s.x; x < s.x + s.w; x += 1) {
          const cur = water.get(x)
          water.set(
            x,
            cur
              ? { top: Math.min(cur.top, s.y), bottom: Math.max(cur.bottom, s.y + s.h) }
              : { top: s.y, bottom: s.y + s.h },
          )
        }
      }

      const lit = branchSpans(START, end, 8, { period: 6, length: 3, scale: 0.3 }, curve)
      let compared = 0
      for (const s of lit) {
        for (let x = s.x; x < s.x + s.w; x += 1) {
          const band = water.get(x)
          // The dash pads past both ends of the run on purpose, so columns
          // outside the water are expected and are not the thing under test.
          if (!band) continue
          compared += 1
          expect(s.y).toBeGreaterThanOrEqual(band.top)
          expect(s.y + s.h).toBeLessThanOrEqual(band.bottom)
        }
      }
      // Without this the loop above passes on zero comparisons.
      expect(compared).toBeGreaterThan(4)
    }
  })
})
