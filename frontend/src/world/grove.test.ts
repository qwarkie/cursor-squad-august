import { describe, expect, it } from 'vitest'

import { budgetToRiver } from '../engine'
import { SEEDED_BUDGET } from '../fixtures/budget'
import { trunkX, WORLD_W } from './path'
import { trunkWidthAt, tributaryEnd, RANK_ART_W } from './geometry'
import { grove, type GroveInput } from './grove'

const WORLD_H = 128
const SIZE = { tree: { w: 7, h: 9 }, bush: { w: 5, h: 4 } } as const

const seeded = (): GroveInput => {
  const m = budgetToRiver(SEEDED_BUDGET)
  return { segments: m.segments, tributaries: m.tributaries }
}

describe('grove', () => {
  it('places foliage on a bare field', () => {
    const spots = grove({ segments: [], tributaries: [] }, WORLD_H)
    expect(spots.length).toBeGreaterThan(10)
  })

  it('is identical across calls — FR-015, and what walk_demo fingerprints', () => {
    const m = seeded()
    expect(grove(m, WORLD_H)).toEqual(grove(m, WORLD_H))
  })

  it('takes no viewport, so 320 and 390 place the same art cells', () => {
    // The signature has no width parameter at all; this asserts the property
    // that guarantees rather than the absence of an argument.
    const m = seeded()
    const a = grove(m, WORLD_H)
    const b = grove(m, WORLD_H)
    expect(a.map((s) => `${s.x},${s.y},${s.kind}`)).toEqual(b.map((s) => `${s.x},${s.y},${s.kind}`))
  })

  it('never overlaps the trunk at ANY row it occupies, not just its anchor', () => {
    const m = seeded()
    for (const spot of grove(m, WORLD_H)) {
      const { w, h } = SIZE[spot.kind]
      for (let row = spot.y; row < spot.y + h; row++) {
        const bank = trunkWidthAt(m, row) / 2
        const centre = trunkX(row)
        const overlaps = spot.x + w > centre - bank && spot.x < centre + bank
        expect({ spot, row, overlaps }).toEqual({ spot, row, overlaps: false })
      }
    }
  })

  it('never overlaps a village rank', () => {
    const m = seeded()
    for (const spot of grove(m, WORLD_H)) {
      const { w, h } = SIZE[spot.kind]
      for (const trib of m.tributaries) {
        const end = tributaryEnd(trib.atY, trib.side, trunkWidthAt(m, trib.atY))
        const half = RANK_ART_W / 2
        const clear =
          spot.x + w <= end.x - half ||
          spot.x >= end.x + half ||
          spot.y + h <= end.y - half ||
          spot.y >= end.y + half
        expect({ spot, trib: trib.atY, clear }).toEqual({ spot, trib: trib.atY, clear: true })
      }
    }
  })

  it('keeps every sprite inside the world box', () => {
    const m = seeded()
    for (const spot of grove(m, WORLD_H)) {
      const { w, h } = SIZE[spot.kind]
      expect(spot.x).toBeGreaterThanOrEqual(1)
      expect(spot.y).toBeGreaterThanOrEqual(1)
      expect(spot.x + w).toBeLessThanOrEqual(WORLD_W - 1)
      expect(spot.y + h).toBeLessThanOrEqual(WORLD_H - 1)
    }
  })

  it('thins out where the world is busy — a seeded month has fewer spots than a bare field', () => {
    const bare = grove({ segments: [], tributaries: [] }, WORLD_H).length
    const full = grove(seeded(), WORLD_H).length
    expect(full).toBeLessThan(bare)
    expect(full).toBeGreaterThan(0)
  })
})
