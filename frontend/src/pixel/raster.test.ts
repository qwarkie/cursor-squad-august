import { describe, expect, it } from 'vitest'

import { parseHex, rasterize } from './raster'

const P = { '#': '#ff0000', '.': null, o: '#00ff0080' }

describe('parseHex', () => {
  it('expands shorthand and defaults alpha to opaque', () => {
    expect(parseHex('#f00')).toEqual([255, 0, 0, 255])
    expect(parseHex('#ff0000')).toEqual([255, 0, 0, 255])
  })

  it('reads an explicit alpha channel', () => {
    expect(parseHex('#00ff0080')).toEqual([0, 255, 0, 128])
  })

  it('reads #rgba shorthand', () => {
    expect(parseHex('#ff00')).toEqual([255, 255, 0, 0])
  })

  it('rejects a malformed colour instead of rendering it wrong', () => {
    expect(() => parseHex('#ff')).toThrow(/bad colour/)
    // Length alone is not enough: '#zzz' expands to six characters and would
    // otherwise parse to NaN and paint garbage.
    expect(() => parseHex('#zzz')).toThrow(/bad colour/)
  })
})

describe('rasterize', () => {
  it('maps characters to RGBA and leaves null transparent', () => {
    const { width, height, rgba } = rasterize(['#.', 'o#'], P)
    expect([width, height]).toEqual([2, 2])
    expect(Array.from(rgba.slice(0, 4))).toEqual([255, 0, 0, 255]) // '#'
    expect(Array.from(rgba.slice(4, 8))).toEqual([0, 0, 0, 0]) // '.' transparent
    expect(Array.from(rgba.slice(8, 12))).toEqual([0, 255, 0, 128]) // 'o'
  })

  it('rejects ragged art, which is always an authoring typo', () => {
    expect(() => rasterize(['##', '#'], P)).toThrow(/row 1 is 1 chars/)
  })

  it('rejects a character the palette does not define', () => {
    expect(() => rasterize(['#x'], P)).toThrow(/"x" is not in the palette/)
  })

  it('rejects empty art', () => {
    expect(() => rasterize([], P)).toThrow(/empty art/)
  })
})
