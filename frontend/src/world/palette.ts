import type { Palette } from '../pixel'
import type { PaletteKey } from '../types'

/**
 * The 20-colour Money River palette (art-bible.md §2), keyed by the same
 * `PaletteKey` union `types.ts` declares — the two must never drift, since
 * `objects.test.ts` transcribes this table independently to catch exactly
 * that. Mirrored as CSS custom properties in `index.css` for chrome.
 */
export const PAL: Record<PaletteKey, string | null> = {
  '.': null,
  k: '#1b2a4a', // ink — outline on every sprite
  n: '#101a33', // night — page background, UI chrome
  w: '#f4d9a0', // cream — walls, lit faces
  p: '#f4efe4', // paper — text on dark, labels
  b: '#2b7fd4', // water — river core
  l: '#5cb3ff', // waterLit — crest highlight, the mouth pool
  u: '#17538f', // waterDeep — shadow side of the water
  g: '#4caf50', // grass — the green field
  e: '#2f6b30', // grassDark — bank shadow, foliage shade
  h: '#7ac36f', // grassLit — field highlight, tufts
  s: '#c8a26a', // sand — dry riverbed, paths
  y: '#ffd94a', // gold — coins, the spring, income
  o: '#fff0b0', // goldLit — coin sparkle
  d: '#7b4a2d', // wood — doors, trunks, posts
  r: '#c0392b', // brick — Housing
  f: '#e08c3a', // wheat — Food
  t: '#6b7a99', // slate — Transport
  m: '#8a4fa8', // plum — Entertainment
  v: '#2fa88a', // teal — Savings
  a: '#e0453f', // alert — overspend warning
}

// Satisfies pixel's `Palette` shape structurally — PixelSprite takes this.
export const _typecheck: Palette = PAL
