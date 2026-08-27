import { describe, expect, it } from 'vitest'

import { rasterize } from '../pixel'
import type { Art } from '../pixel'
import { CATEGORY_ICONS, DEFAULT_ICON, iconArt, iconPlural, isCategoryIcon } from './icons'
import { HOUSE } from './objects'
import { PAL } from './palette'

const framesOf = (art: Art | readonly Art[]): readonly Art[] =>
  Array.isArray(art[0]) ? (art as readonly Art[]) : [art as Art]

describe('the category icon set', () => {
  it('offers five, in picker order, house first', () => {
    expect(CATEGORY_ICONS.map((i) => i.key)).toEqual([
      'house',
      'market',
      'arcade',
      'car',
      'clinic',
    ])
    expect(CATEGORY_ICONS[0].key).toBe(DEFAULT_ICON)
  })

  /**
   * The whole point of the feature is that a month of six categories stops
   * looking like one village drawn six times. Two icons sharing art would put
   * that back for whichever pair a reader happened to pick.
   */
  it('draws five distinct sprites', () => {
    const drawn = CATEGORY_ICONS.map((i) => JSON.stringify(framesOf(i.art)))
    expect(new Set(drawn).size).toBe(CATEGORY_ICONS.length)
  })

  /**
   * Settlements.tsx wraps a rank at 27 art-px — three houses wide. An icon
   * wider than that could not fit even one to a rank and would overflow into
   * the trunk, so the layout's assumption is asserted here rather than left
   * to be discovered on a phone.
   */
  it('keeps every icon inside a 27 art-px rank', () => {
    for (const icon of CATEGORY_ICONS) {
      for (const frame of framesOf(icon.art)) {
        expect(rasterize(frame, PAL).width).toBeLessThanOrEqual(27)
      }
    }
  })

  it('names each one for the picker and for alt text', () => {
    for (const icon of CATEGORY_ICONS) {
      expect(icon.name.length).toBeGreaterThan(0)
      expect(icon.plural.length).toBeGreaterThan(0)
    }
  })
})

describe('resolving a stored icon', () => {
  it('accepts the five names and nothing else', () => {
    for (const icon of CATEGORY_ICONS) expect(isCategoryIcon(icon.key)).toBe(true)
    for (const junk of ['House', 'castle', '', null, undefined, 3, {}]) {
      expect(isCategoryIcon(junk)).toBe(false)
    }
  })

  /**
   * A budget saved before icons existed has no `icon` field, and one saved by
   * a later build may name an icon this one has never heard of. Neither is a
   * reason to draw nothing.
   */
  it('falls back to the house for missing and unknown names', () => {
    expect(iconArt(undefined)).toBe(HOUSE)
    expect(iconArt('castle' as never)).toBe(HOUSE)
    expect(iconPlural(undefined)).toBe('Houses')
    expect(iconPlural('castle' as never)).toBe('Houses')
  })

  it('returns the art each name asks for', () => {
    for (const icon of CATEGORY_ICONS) {
      expect(iconArt(icon.key)).toBe(icon.art)
      expect(iconPlural(icon.key)).toBe(icon.plural)
    }
  })
})
