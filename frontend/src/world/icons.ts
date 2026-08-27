import type { Art } from '../pixel'
import type { CategoryIcon } from '../types'
import { ARCADE, CAR, CLINIC, HOUSE, MARKET } from './objects'

/**
 * The five sprites an expense category can plant at the end of its tributary.
 *
 * Before this, every settlement was a `HOUSE`, so a month with six categories
 * drew the same village six times — the world showed how much went out but
 * never what it went out on. Five is the whole set on purpose: the picker is a
 * single row of 44px targets on a 390px phone, and each icon has to be
 * distinguishable from the other four at scale 3, which stops being true well
 * before ten.
 *
 * The order here is the order of the picker, and `house` is first because it
 * is the default any category without a stored icon resolves to.
 */
export const CATEGORY_ICONS: ReadonlyArray<{
  key: CategoryIcon
  /** The picker's `aria-label`, and the word the alt text uses in the world. */
  name: string
  /** Plural, for the world's alt text: "Markets, 3". */
  plural: string
  art: Art | readonly Art[]
}> = [
  { key: 'house', name: 'House', plural: 'Houses', art: HOUSE },
  { key: 'market', name: 'Market', plural: 'Markets', art: MARKET },
  { key: 'arcade', name: 'Arcade', plural: 'Arcades', art: ARCADE },
  { key: 'car', name: 'Car', plural: 'Cars', art: CAR },
  { key: 'clinic', name: 'Clinic', plural: 'Clinics', art: CLINIC },
]

export const DEFAULT_ICON: CategoryIcon = 'house'

/** `true` for a stored string that names one of the five. */
export function isCategoryIcon(value: unknown): value is CategoryIcon {
  return CATEGORY_ICONS.some((i) => i.key === value)
}

/**
 * The art for an icon name, falling back to the house.
 *
 * Total on purpose: a budget saved before icons existed has no `icon` at all,
 * and one saved by a later version may name an icon this build has never heard
 * of. Neither is a reason to draw nothing — both are a reason to draw a house.
 */
export function iconArt(icon: CategoryIcon | undefined): Art | readonly Art[] {
  return (CATEGORY_ICONS.find((i) => i.key === icon) ?? CATEGORY_ICONS[0]).art
}

/** The plural noun for the world's alt text, falling back to the house's. */
export function iconPlural(icon: CategoryIcon | undefined): string {
  return (CATEGORY_ICONS.find((i) => i.key === icon) ?? CATEGORY_ICONS[0]).plural
}
