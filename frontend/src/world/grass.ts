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

/** Hash as a fraction in [0, 1). Exported so `water.ts` can shape branch
 * curvature from the same one hash — a second copy would drift, and the two
 * would disagree about what "deterministic" means. */
export function unit(x: number, y: number, salt: number): number {
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
function build(x0: number, y0: number, width: number, height: number): string[][] {
  // Generated a margin wider than asked for, then cropped back.
  //
  // Without it the field is NOT seamless, and I measured exactly how it fails:
  // a blade at the last column has no neighbour, so `free` is undefined, so its
  // tip is suppressed — and the same blade in a wider window sways normally.
  // Seven cells of a 96x128 field, all in columns 94-95. Invisible standing
  // still; on a pan it is grass popping along the seam, which is the "trees
  // jump when the rect grows" failure @Pollen warned about, in the meadow.
  //
  // CELL covers it with room to spare: a motif originates within its own cell
  // and reaches at most one pixel past its anchor, and a tip sways at most one
  // more.
  const M = CELL
  const bx = x0 - M
  const by = y0 - M
  const bw = width + M * 2
  const bh = height + M * 2

  const base = Array.from({ length: bh }, () => Array.from({ length: bw }, () => 'g'))
  const blades: Blade[] = []

  // Cell indices are ABSOLUTE. A cell's motif is `hash(cx, cy)` and nothing
  // else, so cell (40, 90) grows the same blade whether it falls inside the
  // requested window or outside it. That is what makes the meadow endless
  // rather than merely large: a different window does not redraw the field, it
  // reveals a different part of the same one.
  const cx0 = Math.floor(bx / CELL)
  const cy0 = Math.floor(by / CELL)
  const cx1 = Math.ceil((bx + bw) / CELL)
  const cy1 = Math.ceil((by + bh) / CELL)

  for (let cy = cy0; cy < cy1; cy++) {
    for (let cx = cx0; cx < cx1; cx++) {
      // Coarse noise over 3x3 blocks of cells, so the field grows in patches
      // with bare ground between them. Filling every cell at one rate is what
      // makes procedural texture read as static rather than as a meadow.
      const density = 0.55 + unit(Math.floor(cx / 3), Math.floor(cy / 3), 7) * 0.4
      if (unit(cx, cy, 1) > density) continue

      const motif = unit(cx, cy, 5)
      // Placed from the absolute cell, then shifted into the generated buffer.
      const x = cx * CELL + Math.floor(unit(cx, cy, 2) * CELL) - bx
      const y = cy * CELL + Math.floor(unit(cx, cy, 3) * CELL) - by

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

  // Crop the margin away. Everything inside the window was generated with all
  // of its neighbours present, so two overlapping windows agree exactly.
  return frames.map((f) =>
    f.slice(M, M + height).map((row) => row.slice(M, M + width).join('')),
  )
}

const cache = new Map<string, string[][]>()

/**
 * A window onto the meadow, as `GRASS_FRAMES` frames of `pixel/` art.
 *
 * `x0` / `y0` are absolute art-pixel coordinates and may be negative — the
 * field has no origin and no edge. The contract that makes it a field rather
 * than a crop, agreed with @Pollen before either half was written:
 *
 *     grassField(0, 0, 96, 128) === the matching sub-rectangle of
 *     grassField(-96, -64, 288, 256)
 *
 * asserted in grass.test.ts. If it ever fails, foliage and blades will appear
 * to jump when the visible rectangle grows, and it will look like a bug in the
 * panning rather than in here.
 *
 * Memoised on the whole window: a resize tick landing on the same rectangle
 * costs nothing.
 */
export function grassField(x0: number, y0: number, width: number, height: number): string[][] {
  const key = `${x0},${y0},${width}x${height}`
  const hit = cache.get(key)
  if (hit) return hit
  const built = build(x0, y0, width, height)
  cache.set(key, built)
  return built
}
