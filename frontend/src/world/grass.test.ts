import { describe, expect, it } from 'vitest'

import { GRASS_FRAMES, grassField } from './grass'
import { PAL } from './palette'

const W = 96
const H = 128

describe('grassField', () => {
  it('emits frames of identical, exact world size', () => {
    const frames = grassField(0, 0, W, H)
    expect(frames).toHaveLength(GRASS_FRAMES)
    for (const rows of frames) {
      expect(rows).toHaveLength(H)
      // pixel/raster.ts throws on a ragged frame, and a field that throws is
      // a blank world — so the shape is asserted here, not discovered there.
      expect(rows.every((r) => r.length === W)).toBe(true)
    }
  })

  it('draws only in the three grass colours the palette allows', () => {
    const used = new Set(grassField(0, 0, W, H).flat().join('').split(''))
    expect([...used].sort()).toEqual(['e', 'g', 'h'])
    for (const ch of used) expect(PAL[ch as keyof typeof PAL]).toBeTruthy()
  })

  it('is deterministic — the same field on every reload and device', () => {
    // Unmemoised dimensions on both sides would compare two real builds; the
    // memo makes the second read free, so this asserts the contract callers
    // actually depend on — same size in, same field out.
    expect(grassField(0, 0, 37, 53)).toEqual(grassField(0, 0, 37, 53))
    expect(grassField(0, 0, 37, 53)).not.toEqual(grassField(0, 0, 53, 37))
  })

  it('moves blade tips and nothing else — the ground never sways', () => {
    const [first, ...rest] = grassField(0, 0, W, H)
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

describe('the meadow has no edge', () => {
  /**
   * @Pollen's contract, agreed before either half was written: a window is a
   * view onto one unbounded field, not a field sized to the window. If this
   * fails, blades appear to jump when the visible rectangle grows and it reads
   * as a bug in the panning rather than in here.
   */
  it('a window agrees with the same region of a larger window', () => {
    const small = grassField(0, 0, 96, 128)
    const big = grassField(-96, -64, 288, 256)

    let differing = 0
    for (let frame = 0; frame < small.length; frame += 1) {
      for (let row = 0; row < 128; row += 1) {
        // (0,0) of the small window sits at (96,64) inside the big one.
        const inBig = big[frame][row + 64].slice(96, 96 + 96)
        if (inBig !== small[frame][row]) differing += 1
      }
    }
    expect(differing).toBe(0)
  })

  it('agrees at an origin that is not a multiple of the cell size', () => {
    const a = grassField(7, 5, 48, 48)
    const b = grassField(-41, -43, 192, 192)
    for (let row = 0; row < 48; row += 1) {
      expect(b[0][row + 48].slice(48, 48 + 48)).toBe(a[0][row])
    }
  })

  it('reaches into negative coordinates rather than stopping at an origin', () => {
    const nw = grassField(-96, -128, 96, 128)
    const planted = nw[0].join('').split('').filter((c) => c !== 'g').length
    expect(planted).toBeGreaterThan(100)
  })
})
