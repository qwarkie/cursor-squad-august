/**
 * The meadow the whole world stands on.
 *
 * A flat fill reads as a background; a field reads as a place. This scatters
 * blades and shadow specks across the world grid in the three grass colours
 * the palette already allows (`g`, `e`, `h` — art-bible.md §2), and emits the
 * result as `pixel/` string art so the field costs exactly one `<img>`-shaped
 * data URL rather than several hundred SVG rects on a phone.
 *
 * Nothing here is random at runtime: placement comes from a hash of the cell
 * coordinates, so the same field is drawn on every reload and every device
 * (FR-015 — geometry is reproducible). Only the *tips* of blades move, and
 * they move on the compositor via `PixelSprite`'s `steps()` strip.
 */

/** One motif at most per CELL x CELL block — a jittered grid, not a lattice. */
const CELL = 6

/**
 * Wind, as art-pixels of lean per frame: left, upright, right, upright. Each
 * blade enters this cycle at its own phase, so the field ripples instead of
 * blinking in unison — the difference between a breeze and a flicker.
 */
const SWAY = [-1, 0, 1, 0] as const

export const GRASS_FRAMES = SWAY.length

/**
 * Integer hash of a cell. `Math.imul` keeps every multiply in int32, which is
 * what makes the result identical in a browser and in Node — the test asserts
 * determinism, and a float multiply here would drift past 2^53 and break it.
 */
function hash(x: number, y: number, salt: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(salt, 2246822519)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

/** Hash as a fraction in [0, 1). */
function unit(x: number, y: number, salt: number): number {
  return hash(x, y, salt) / 4294967296
}

/** Writes are clipped, not wrapped: a blade at the edge is cropped by it. */
function stamp(rows: string[][], x: number, y: number, ch: string): void {
  const row = rows[y]
  if (!row || x < 0 || x >= row.length) return
  row[x] = ch
}

type Blade = { x: number; y: number; phase: number }

/**
 * Two passes, and the order is the whole trick. Everything static is laid
 * down first, then a tip is only allowed to sway into cells that are bare
 * grass in *every* position it would occupy. A tip that swayed over a shadow
 * pixel would repaint it light for two frames out of four, and the eye reads
 * that as the ground itself crawling — far more distracting than the motion
 * is worth. A blade with no room simply stands still, which is what a blade
 * tucked against something does anyway.
 */
function build(width: number, height: number): string[][] {
  const base = Array.from({ length: height }, () => Array.from({ length: width }, () => 'g'))
  const blades: Blade[] = []

  const cols = Math.ceil(width / CELL)
  const rows = Math.ceil(height / CELL)

  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      // Coarse noise over 3x3 blocks of cells, so the field grows in patches
      // with bare ground between them. Filling every cell at one rate is what
      // makes procedural texture read as static rather than as a meadow.
      const density = 0.55 + unit(Math.floor(cx / 3), Math.floor(cy / 3), 7) * 0.4
      if (unit(cx, cy, 1) > density) continue

      const motif = unit(cx, cy, 5)
      const x = cx * CELL + Math.floor(unit(cx, cy, 2) * CELL)
      const y = cy * CELL + Math.floor(unit(cx, cy, 3) * CELL)

      if (motif < 0.16) {
        // Shadow speck — the ground showing through, and the reason the field
        // has depth rather than just sparkle. Static: soil does not sway.
        // Kept rare and mostly single-pixel: grassDark is the strongest
        // contrast on the field, and at any real density it reads as pepper.
        stamp(base, x, y, 'e')
        if (motif < 0.06) stamp(base, x + 1, y + 1, 'e')
      } else if (motif < 0.68) {
        // A blade: dark root and lit stem here, the tip in the second pass.
        stamp(base, x, y + 2, 'e')
        stamp(base, x, y + 1, 'h')
        blades.push({ x, y, phase: Math.floor(unit(cx, cy, 4) * GRASS_FRAMES) })
      } else {
        // A patch catching the light. Flat, so the eye reads it as ground
        // rather than as another blade.
        stamp(base, x, y, 'h')
        stamp(base, x + 1, y, 'h')
      }
    }
  }

  const frames = SWAY.map(() => base.map((row) => [...row]))

  for (const { x, y, phase } of blades) {
    const free = SWAY.every((lean) => base[y]?.[x + lean] === 'g')
    frames.forEach((f, i) => {
      stamp(f, free ? x + SWAY[(i + phase) % GRASS_FRAMES] : x, y, 'h')
    })
  }

  return frames.map((f) => f.map((row) => row.join('')))
}

const cache = new Map<string, string[][]>()

/**
 * The field, as `GRASS_FRAMES` frames of `pixel/` art. Memoised because the
 * world size never changes at runtime, and rebuilding 4 x 96 x 128 characters
 * on every resize tick would be pure waste.
 */
export function grassField(width: number, height: number): string[][] {
  const key = `${width}x${height}`
  const hit = cache.get(key)
  if (hit) return hit
  const built = build(width, height)
  cache.set(key, built)
  return built
}
