/**
 * String-art -> RGBA bytes.
 *
 * An 8-bit object is authored as plain text, not as a binary asset:
 *
 *   const HOUSE = ['..###..',
 *                  '.#####.',
 *                  '#.#o#.#']
 *
 * Kept free of `canvas` on purpose. Rasterising is pure and runs in Node, so
 * it is unit-testable; only `toDataUrl` in ./sprite.ts touches the DOM.
 */

/** Maps one art character to a CSS hex colour. `null`/absent = transparent. */
export type Palette = Record<string, string | null | undefined>

export type Raster = { width: number; height: number; rgba: Uint8ClampedArray }

/** `#rgb`, `#rrggbb` and `#rrggbbaa` -> [r,g,b,a]. */
export function parseHex(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '')
  const full =
    h.length === 3 || h.length === 4
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  if ((full.length !== 6 && full.length !== 8) || !/^[0-9a-f]+$/i.test(full)) {
    throw new Error(`pixel: bad colour "${hex}" (want #rgb, #rrggbb or #rrggbbaa)`)
  }
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
    full.length === 8 ? parseInt(full.slice(6, 8), 16) : 255,
  ]
}

/**
 * Rows must be equal length — a ragged sprite is an authoring typo, and
 * silently padding it produces a subtly wrong sprite that is hard to spot on a
 * phone screen. Fail at the source instead.
 */
export function rasterize(rows: readonly string[], palette: Palette): Raster {
  if (rows.length === 0) throw new Error('pixel: empty art')
  const width = rows[0].length
  if (width === 0) throw new Error('pixel: empty art')

  const ragged = rows.findIndex((r) => r.length !== width)
  if (ragged !== -1) {
    throw new Error(
      `pixel: row ${ragged} is ${rows[ragged].length} chars, expected ${width}`,
    )
  }

  const rgba = new Uint8ClampedArray(width * rows.length * 4)
  const cache = new Map<string, [number, number, number, number] | null>()

  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      const ch = row[x]
      if (!cache.has(ch)) {
        if (!(ch in palette)) throw new Error(`pixel: "${ch}" is not in the palette`)
        const colour = palette[ch]
        cache.set(ch, colour == null ? null : parseHex(colour))
      }
      const px = cache.get(ch)
      if (px === null || px === undefined) continue // transparent
      const i = (y * width + x) * 4
      rgba[i] = px[0]
      rgba[i + 1] = px[1]
      rgba[i + 2] = px[2]
      rgba[i + 3] = px[3]
    }
  })

  return { width, height: rows.length, rgba }
}
