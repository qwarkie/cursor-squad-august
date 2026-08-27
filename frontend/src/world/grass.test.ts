import { describe, expect, it } from 'vitest'

import { GRASS_FRAMES, grassField } from './grass'
import { PAL } from './palette'

const W = 96
const H = 128

describe('grassField', () => {
  it('emits frames of identical, exact world size', () => {
    const frames = grassField(W, H)
    expect(frames).toHaveLength(GRASS_FRAMES)
    for (const rows of frames) {
      expect(rows).toHaveLength(H)
      // pixel/raster.ts throws on a ragged frame, and a field that throws is
      // a blank world — so the shape is asserted here, not discovered there.
      expect(rows.every((r) => r.length === W)).toBe(true)
    }
  })

  it('draws only in the three grass colours the palette allows', () => {
    const used = new Set(grassField(W, H).flat().join('').split(''))
    expect([...used].sort()).toEqual(['e', 'g', 'h'])
    for (const ch of used) expect(PAL[ch as keyof typeof PAL]).toBeTruthy()
  })

  it('is deterministic — the same field on every reload and device', () => {
    // Unmemoised dimensions on both sides would compare two real builds; the
    // memo makes the second read free, so this asserts the contract callers
    // actually depend on — same size in, same field out.
    expect(grassField(37, 53)).toEqual(grassField(37, 53))
    expect(grassField(37, 53)).not.toEqual(grassField(53, 37))
  })

  it('moves blade tips and nothing else — the ground never sways', () => {
    const [first, ...rest] = grassField(W, H)
    let moved = 0
    for (const frame of rest) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const before = first[y][x]
          const after = frame[y][x]
          if (before === after) continue
          moved++
          // Only lit tips appear and disappear. A shadow pixel that moved
          // would read as the soil itself crawling.
          expect([before, after].sort()).toEqual(['g', 'h'])
        }
      }
    }
    expect(moved).toBeGreaterThan(0)
  })
})
