import { describe, expect, it } from 'vitest'

import { hamlet, perRowFor, rowPlan, type HamletSpot } from './hamlet'
import { RANK_ART_W } from './geometry'

const HOUSE = { w: 9, h: 9 }
const MARKET = { w: 12, h: 9 }
const RESIDENT = { w: 5, h: 7 }

const village = (id: string, buildings: number, residents = 0, building = HOUSE) =>
  hamlet({ id, buildings, residents, building, resident: RESIDENT, maxWidth: RANK_ART_W })

const overlap = (a: HamletSpot, b: HamletSpot) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

describe('hamlet', () => {
  it('is a pure function of the id — the same category is the same village', () => {
    expect(village('housing', 6, 3)).toEqual(village('housing', 6, 3))
  })

  it('gives two categories two different arrangements', () => {
    const a = village('housing', 6, 3).spots.map((s) => `${s.x},${s.y}`)
    const b = village('food', 6, 3).spots.map((s) => `${s.x},${s.y}`)
    expect(a).not.toEqual(b)
  })

  /**
   * The rule a reader can check by eye, so it is the one worth asserting
   * exhaustively rather than on a sample.
   */
  it('never overlaps two buildings, at any count, for any of these ids', () => {
    for (const id of ['housing', 'food', 'transport', 'entertainment', 'savings', 'x', '']) {
      for (let n = 0; n <= 24; n++) {
        const { spots } = village(id, n, 3)
        for (let i = 0; i < spots.length; i++) {
          for (let j = i + 1; j < spots.length; j++) {
            expect(
              overlap(spots[i], spots[j]),
              `${id} n=${n}: ${spots[i].key} overlaps ${spots[j].key}`,
            ).toBe(false)
          }
        }
      }
    }
  })

  /**
   * `geometry.ts` decides how far out a village stands from the trunk using
   * RANK_ART_W, and `grove.ts` keeps foliage out of the same box. A cluster
   * wider than its corridor walks into the river.
   */
  it('stays inside the corridor it was given', () => {
    for (const building of [HOUSE, MARKET]) {
      for (let n = 0; n <= 24; n++) {
        const h = village('housing', n, 3, building)
        expect(h.w).toBeLessThanOrEqual(RANK_ART_W)
        for (const s of h.spots) {
          expect(s.x).toBeGreaterThanOrEqual(0)
          expect(s.x + s.w).toBeLessThanOrEqual(RANK_ART_W)
        }
      }
    }
  })

  it('reports a bounding box that actually bounds it', () => {
    const h = village('housing', 7, 3)
    for (const s of h.spots) {
      expect(s.x + s.w).toBeLessThanOrEqual(h.w)
      expect(s.y + s.h).toBeLessThanOrEqual(h.h)
    }
  })

  it('draws every building the engine counted — the count IS the amount (FR-007)', () => {
    for (let n = 0; n <= 24; n++) {
      expect(village('housing', n, 2).spots.filter((s) => s.kind === 'building')).toHaveLength(n)
    }
  })

  it('keys every element stably, so an animation has something to follow', () => {
    const keys = village('housing', 6, 3).spots.map((s) => s.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(village('housing', 6, 3).spots.map((s) => s.key)).toEqual(keys)
  })

  it('survives nonsense counts rather than drawing a broken village', () => {
    expect(village('housing', -3, -1).spots).toEqual([])
    expect(
      hamlet({
        id: 'x',
        buildings: 2.7,
        residents: 1.2,
        building: HOUSE,
        resident: RESIDENT,
        maxWidth: RANK_ART_W,
      }).spots.filter((s) => s.kind === 'building'),
    ).toHaveLength(2)
  })

  /** The failure the whole module exists to remove. */
  it('does not put every roof on one line', () => {
    const tops = new Set(
      village('housing', 6, 0).spots.map((s) => s.y),
    )
    expect(tops.size).toBeGreaterThan(1)
  })

  it('does not lay every row out identically', () => {
    const { spots } = village('housing', 6, 0)
    const byRow = new Map<number, number[]>()
    for (const s of spots) {
      const row = Math.round(s.y / 12)
      byRow.set(row, [...(byRow.get(row) ?? []), s.x])
    }
    const rows = [...byRow.values()]
    expect(rows.length).toBeGreaterThan(1)
    expect(new Set(rows.map((r) => r.join(','))).size).toBeGreaterThan(1)
  })

  it('is never taller than a tight packing of the same buildings', () => {
    for (let n = 1; n <= 24; n++) {
      const rows = Math.ceil(n / perRowFor(HOUSE, RANK_ART_W))
      // rows x (sprite + clearance), plus the lean at either end
      expect(village('housing', n, 0).h).toBeLessThanOrEqual(rows * 12 + 2)
    }
  })
})

describe('rowPlan', () => {
  it('accounts for every building', () => {
    for (let n = 0; n <= 30; n++) {
      expect(rowPlan('housing', n, 3).reduce((a, b) => a + b, 0)).toBe(n)
    }
  })

  it('never leaves a row of one hanging off the bottom, where it has the room', () => {
    for (const id of ['housing', 'food', 'transport', 'a', 'bb', 'ccc']) {
      for (let n = 2; n <= 30; n++) {
        const rows = rowPlan(id, n, 3)
        expect(rows[rows.length - 1], `${id} n=${n}: ${rows}`).toBeGreaterThan(1)
      }
    }
  })

  it('never plans a row wider than the corridor can hold', () => {
    for (const perRow of [1, 2, 3, 4]) {
      for (const id of ['housing', 'food', 'transport']) {
        for (let n = 0; n <= 30; n++) {
          for (const r of rowPlan(id, n, perRow)) {
            expect(r, `perRow=${perRow} ${id} n=${n}`).toBeLessThanOrEqual(perRow)
          }
        }
      }
    }
  })

  it('does not make every row the same length once there is room to vary', () => {
    const seen = new Set<string>()
    for (const id of ['housing', 'food', 'transport', 'entertainment', 'savings', 'a', 'bb']) {
      seen.add(rowPlan(id, 9, 4).join(','))
    }
    expect(seen.size).toBeGreaterThan(1)
  })

  it('never plans more rows than a tight packing needs', () => {
    for (const perRow of [1, 2, 3, 4]) {
      for (let n = 0; n <= 30; n++) {
        expect(rowPlan('housing', n, perRow).length).toBe(Math.ceil(n / perRow))
      }
    }
  })
})

describe('perRowFor', () => {
  it('leaves room to stagger rather than filling the corridor edge to edge', () => {
    expect(perRowFor(HOUSE, RANK_ART_W)).toBe(2)
    expect(perRowFor(MARKET, RANK_ART_W)).toBe(1)
  })

  it('never returns zero, however narrow the corridor', () => {
    expect(perRowFor(MARKET, 4)).toBe(1)
  })
})
