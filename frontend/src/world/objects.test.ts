import { describe, expect, it } from 'vitest'

import { rasterize, type Art, type Palette } from '../pixel'
import {
  ARCADE,
  CAR,
  COIN,
  CRACK,
  HOUSE,
  MARKET,
  RESERVOIR,
  RESIDENT,
  SPRING,
  TREE,
  WARNING,
} from './objects'

/**
 * The art bible checked as code.
 *
 * This palette is transcribed from specs/001-money-river/art-bible.md §2 on
 * purpose, rather than imported from `world/palette.ts` (T002). The art bible
 * is the contract both files answer to; asserting the art against the spec
 * catches a palette that drifts from it, which importing `PAL` could not.
 * When T002 lands, an equality test between the two is the right addition —
 * not a replacement of this table.
 */
const ART_BIBLE_PAL: Palette = {
  '.': null,
  k: '#1b2a4a',
  n: '#101a33',
  w: '#f4d9a0',
  p: '#f4efe4',
  b: '#2b7fd4',
  l: '#5cb3ff',
  u: '#17538f',
  g: '#4caf50',
  e: '#2f6b30',
  h: '#7ac36f',
  s: '#c8a26a',
  y: '#ffd94a',
  o: '#fff0b0',
  d: '#7b4a2d',
  r: '#c0392b',
  f: '#e08c3a',
  t: '#6b7a99',
  m: '#8a4fa8',
  v: '#2fa88a',
  a: '#e0453f',
}

/** art-bible.md §4, verbatim. Sizes are the contract the layout is built to. */
const INVENTORY: ReadonlyArray<{
  name: string
  art: Art | readonly Art[]
  width: number
  height: number
  frames: number
}> = [
  { name: 'COIN', art: COIN, width: 5, height: 5, frames: 2 },
  { name: 'HOUSE', art: HOUSE, width: 9, height: 9, frames: 1 },
  { name: 'RESIDENT', art: RESIDENT, width: 5, height: 5, frames: 2 },
  { name: 'MARKET', art: MARKET, width: 12, height: 9, frames: 2 },
  { name: 'SPRING', art: SPRING, width: 16, height: 12, frames: 2 },
  { name: 'RESERVOIR', art: RESERVOIR, width: 24, height: 16, frames: 2 },
  { name: 'CRACK', art: CRACK, width: 8, height: 8, frames: 1 },
  { name: 'WARNING', art: WARNING, width: 9, height: 9, frames: 2 },
  { name: 'CAR', art: CAR, width: 8, height: 5, frames: 2 },
  { name: 'ARCADE', art: ARCADE, width: 10, height: 10, frames: 2 },
  { name: 'TREE', art: TREE, width: 7, height: 9, frames: 2 },
]

const framesOf = (art: Art | readonly Art[]): readonly Art[] =>
  Array.isArray(art[0]) ? (art as readonly Art[]) : [art as Art]

describe('the object inventory', () => {
  it('holds every object in art-bible.md §4 — the eight spine, then the three optional', () => {
    expect(INVENTORY.map((o) => o.name)).toEqual([
      'COIN',
      'HOUSE',
      'RESIDENT',
      'MARKET',
      'SPRING',
      'RESERVOIR',
      'CRACK',
      'WARNING',
      'CAR',
      'ARCADE',
      'TREE',
    ])
  })

  describe.each(INVENTORY)('$name', ({ art, width, height, frames }) => {
    it('has the frame count art-bible.md §4 declares', () => {
      expect(framesOf(art)).toHaveLength(frames)
    })

    /**
     * `rasterize` throws on a ragged row and on any character outside the
     * palette, so one call proves the declared size, uniform row lengths and
     * palette-only characters together. It is pure, so this runs in Node with
     * no DOM — the same reason the pixel subsystem keeps canvas out of it.
     */
    it('rasterizes every frame at the declared size, palette characters only', () => {
      for (const [i, frame] of framesOf(art).entries()) {
        const raster = rasterize(frame, ART_BIBLE_PAL)
        expect({ frame: i, width: raster.width, height: raster.height }).toEqual({
          frame: i,
          width,
          height,
        })
      }
    })

    it('draws something — a sprite of entirely transparent pixels is a typo', () => {
      for (const frame of framesOf(art)) {
        const { rgba } = rasterize(frame, ART_BIBLE_PAL)
        const opaque = rgba.filter((_, i) => i % 4 === 3).some((alpha) => alpha > 0)
        expect(opaque).toBe(true)
      }
    })
  })
})

describe('characters outside the art bible', () => {
  it('throw rather than rendering transparent', () => {
    expect(() => rasterize(['xx', 'xx'], ART_BIBLE_PAL)).toThrow(/not in the palette/)
  })
})

describe('CRACK', () => {
  /**
   * T024: it is laid over the trunk stroked in `sand`, so the gaps between the
   * fissures have to stay see-through. A fully opaque CRACK would hide the dry
   * bed it is meant to describe.
   */
  it('is mostly transparent so the dry bed shows through', () => {
    const { rgba } = rasterize(CRACK, ART_BIBLE_PAL)
    const alphas = [...rgba].filter((_, i) => i % 4 === 3)
    const opaque = alphas.filter((a) => a > 0).length
    expect(opaque / alphas.length).toBeLessThan(0.35)
  })
})

describe('WARNING', () => {
  /**
   * FR-012: overspend is never signalled by colour alone. Both frames must
   * carry the triangle outline and the exclamation, so the sprite still reads
   * as a warning with the pulse suppressed under `prefers-reduced-motion`.
   */
  it('keeps its shape across both frames, blinking only the mark', () => {
    const [a, b] = WARNING
    const shapeOf = (frame: Art) => frame.map((row) => row.replace(/[po]/g, '!'))
    expect(shapeOf(a)).toEqual(shapeOf(b))
    expect(a).not.toEqual(b)
  })
})
