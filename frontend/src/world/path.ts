/**
 * The only two functions in the codebase permitted to build an SVG path string
 * (art-bible.md §1). Everything that needs the river's curve — the trunk itself
 * and anything riding it on `offset-path` — comes through here.
 *
 * The reason this is centralised: the SVG and the DOM **do not share a
 * coordinate system**. The river draws in art-pixels via `viewBox="0 0 96 128"`,
 * while a coin riding it is a DOM element whose `offset-path` must be in CSS
 * pixels. Two hand-written curves drift apart, the coins slide off the water,
 * and it reads as broken. One curve, scaled, cannot.
 *
 * Both functions are pure and DOM-free so they test in Node.
 */

import { MEANDER_A, MEANDER_W } from '../engine'

/**
 * The slice of `RiverModel` the path builder reads.
 *
 * `RiverModel` (engine/river.ts) satisfies this structurally, so the call
 * signature in contracts/engine.md — `riverPath(model)` — compiles unchanged
 * while `world/` keeps no import on `engine/`. The two surfaces meet at the
 * contract, not at each other's modules (Constitution, Principle VI).
 */
export interface RiverGeometry {
  segments: readonly { fromY: number; toY: number }[]
}

/** art-px, the world grid from art-bible.md §1. World.tsx re-exports it — one number, three consumers. */
export const WORLD_W = 96
const CENTRE_X = WORLD_W / 2

/**
 * Horizontal offset of the trunk at a given height.
 *
 * A closed form of `y` alone — no noise library, no seed, no state. That is
 * what makes SC-007 (two loads, identical geometry) true by construction rather
 * than by discipline. Rounded, because a fractional coordinate blurs pixel art.
 */
export function xOffset(y: number): number {
  return Math.round(MEANDER_A * Math.sin(y / MEANDER_W))
}

/** Centre-line x of the trunk at height `y`, in art-pixels. */
export function trunkX(y: number): number {
  return CENTRE_X + xOffset(y)
}

/**
 * The river's centre line as an SVG `d` string in **art units**, for the SVG
 * layer. Sampled one art-pixel at a time and emitted as integers, so scaling by
 * an integer factor stays exact rather than accumulating float error.
 *
 * An empty model yields `''` — nothing to draw, and no path element that would
 * render as a stray dot at the origin.
 */
export function riverPath(model: RiverGeometry): string {
  const segments = model?.segments
  if (!segments || segments.length === 0) return ''

  const topY = segments[0].fromY
  const bottomY = segments[segments.length - 1].toY
  if (!Number.isFinite(topY) || !Number.isFinite(bottomY) || bottomY <= topY) return ''

  const points: string[] = []
  for (let y = Math.round(topY); y <= Math.round(bottomY); y += 1) {
    points.push(`${points.length === 0 ? 'M' : 'L'}${trunkX(y)} ${y}`)
  }
  return points.join(' ')
}

/**
 * The same curve in **CSS pixels**, for `offset-path` on DOM sprites.
 *
 * Multiplies every number in the string by `scale`. Integer art coordinates and
 * an integer scale factor (art-bible.md §1 permits no other kind) mean the
 * result is exact — `scalePath(riverPath(m), 4)` is precisely 4× `riverPath(m)`.
 */
export function scalePath(d: string, scale: number): string {
  if (typeof d !== 'string' || d.length === 0) return ''
  const factor = Number.isFinite(scale) && scale > 0 ? scale : 1
  return d.replace(/-?\d+(?:\.\d+)?/g, (n) => String(Number(n) * factor))
}
