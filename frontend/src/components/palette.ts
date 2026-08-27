import type { PaletteKey } from '../types'
import { PAL } from '../world/palette'

/**
 * The art-bible §2 colours the chrome layer uses, by name.
 *
 * Derived from `world/palette.ts` rather than transcribed, so sprites and
 * chrome cannot drift apart — the same values are also mirrored as CSS custom
 * properties in `index.css` for anything that can use a `var()`. These names
 * exist because `HEX.alert` reads at a glance where `PAL.a` does not.
 */
function hex(key: PaletteKey): string {
  return PAL[key] ?? 'transparent'
}

export const HEX = {
  ink: hex('k'),
  night: hex('n'),
  cream: hex('w'),
  paper: hex('p'),
  water: hex('b'),
  waterLit: hex('l'),
  grass: hex('g'),
  grassDark: hex('e'),
  grassLit: hex('h'),
  sand: hex('s'),
  gold: hex('y'),
  brick: hex('r'),
  wheat: hex('f'),
  slate: hex('t'),
  plum: hex('m'),
  teal: hex('v'),
  alert: hex('a'),
} as const

/**
 * The colours a category may be drawn in — six, matching data-model.md.
 *
 * `art-bible.md` §2 names five against the seeded categories and leaves gold
 * otherwise unclaimed, so gold is the sixth: someone adding a seventh category
 * still gets a distinct colour instead of a repeat.
 */
export const CATEGORY_COLORS: { key: PaletteKey; name: string; hex: string }[] = [
  { key: 'r', name: 'Brick', hex: hex('r') },
  { key: 'f', name: 'Wheat', hex: hex('f') },
  { key: 't', name: 'Slate', hex: hex('t') },
  { key: 'm', name: 'Plum', hex: hex('m') },
  { key: 'v', name: 'Teal', hex: hex('v') },
  { key: 'y', name: 'Gold', hex: hex('y') },
]

export function hexForCategory(key: PaletteKey): string {
  return CATEGORY_COLORS.find((c) => c.key === key)?.hex ?? HEX.water
}
