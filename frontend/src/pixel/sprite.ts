import { rasterize, type Palette } from './raster'

/**
 * String-art -> `data:` URL, memoised.
 *
 * A data URL beats one DOM node per pixel: a 16x16 sprite is 256 elements as
 * divs and one <img> this way, which matters when the world holds dozens of
 * them on a phone. Crisp edges come from `image-rendering: pixelated` at the
 * render site, so art is authored at 1x and scaled by CSS.
 *
 * Several frames are packed side by side into one horizontal strip. That is
 * what lets animation run as a `steps()` keyframe over `background-position`
 * on the compositor — no timers, no React state, no re-render per frame.
 */
const cache = new Map<string, StripUrl>()

export type StripUrl = {
  url: string
  /** Width of a single frame, in art pixels. */
  frameWidth: number
  height: number
  frames: number
}

export function spriteStrip(
  frames: readonly (readonly string[])[],
  palette: Palette,
): StripUrl {
  if (frames.length === 0) throw new Error('pixel: no frames')
  const key = frames.map((f) => f.join('\n')).join('||') + '|' + JSON.stringify(palette)
  const hit = cache.get(key)
  if (hit) return hit

  const rasters = frames.map((f) => rasterize(f, palette))
  const { width: frameWidth, height } = rasters[0]
  const mismatch = rasters.findIndex(
    (r) => r.width !== frameWidth || r.height !== height,
  )
  if (mismatch !== -1) {
    throw new Error(
      `pixel: frame ${mismatch} is ${rasters[mismatch].width}x${rasters[mismatch].height}, ` +
        `expected ${frameWidth}x${height} — every frame must share one size`,
    )
  }

  const canvas = document.createElement('canvas')
  canvas.width = frameWidth * rasters.length
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('pixel: 2d context unavailable')
  rasters.forEach((r, i) => {
    ctx.putImageData(new ImageData(r.rgba, r.width, r.height), i * frameWidth, 0)
  })

  const strip: StripUrl = {
    url: canvas.toDataURL(),
    frameWidth,
    height,
    frames: rasters.length,
  }
  cache.set(key, strip)
  return strip
}

/** Convenience for the single-frame case. */
export function spriteUrl(rows: readonly string[], palette: Palette): string {
  return spriteStrip([rows], palette).url
}
