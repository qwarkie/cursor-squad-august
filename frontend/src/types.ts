/**
 * Mirrors app/schemas/item.py on the backend.
 * Keep the two in sync when the schema changes.
 */
export interface Item {
  id: number
  title: string
  description: string | null
  is_done: boolean
  created_at: string
  updated_at: string
}

export interface ItemCreate {
  title: string
  description?: string | null
  is_done?: boolean
}

export type ItemUpdate = Partial<ItemCreate>

/**
 * Money River — see specs/001-money-river/data-model.md.
 *
 * `Budget` is the only mutable state in the feature. Everything the world
 * draws is derived from it by `budgetToRiver()` and never edited directly.
 */

/**
 * One character of the art-bible palette (art-bible.md §2) — twenty colours
 * plus `.` for transparent. Declared here rather than in `world/palette.ts` so
 * that `types.ts` keeps importing nothing; `palette.ts` declares `PAL` against
 * this union, which is what keeps the two from drifting apart.
 */
export type PaletteKey =
  | '.' // transparent
  | 'k' // ink
  | 'n' // night
  | 'w' // cream
  | 'p' // paper
  | 'b' // water
  | 'l' // waterLit
  | 'u' // waterDeep
  | 'g' // grass
  | 'e' // grassDark
  | 'h' // grassLit
  | 's' // sand
  | 'y' // gold
  | 'o' // goldLit
  | 'd' // wood
  | 'r' // brick
  | 'f' // wheat
  | 't' // slate
  | 'm' // plum
  | 'v' // teal
  | 'a' // alert

/** `expense` ends in settlements; `savings` ends in a reservoir. */
export type CategoryKind = 'expense' | 'savings'

/**
 * Which sprite an expense category plants at the end of its tributary.
 *
 * Five, because every settlement being a house made the world one village
 * repeated six times — the map said how much was spent but never on what.
 * The art for each lives in `world/icons.ts`; this union is the stored value,
 * so it is names rather than art, and `types.ts` still imports nothing.
 *
 * `savings` categories ignore it: a reservoir is the only savings terminus.
 */
export type CategoryIcon = 'house' | 'market' | 'arcade' | 'car' | 'clinic'

export interface Category {
  /** Stable across edits — the React key and the selection target. */
  id: string
  /** 1–20 chars. Shown in the world and the bottom sheet. */
  label: string
  /** Whole dollars, >= 0. `0` closes the tributary but keeps the category. */
  amount: number
  kind: CategoryKind
  /** One value in three places: tributary stroke, label, bottom-sheet control. */
  color: PaletteKey
  /**
   * Optional, and absent means `house`.
   *
   * Optional rather than required because every budget saved before icons
   * existed is missing it, and those are still valid months — `storage.ts`
   * reads them as-is instead of throwing the whole thing away, and
   * `iconArt()` resolves the absence at the one place that draws.
   */
  icon?: CategoryIcon
}

export interface Budget {
  /** Whole dollars, >= 0. `0` means no river. */
  income: number
  /**
   * Ordered, and the order is meaningful: index fixes where each tributary
   * meets the trunk, top to bottom.
   */
  categories: Category[]
  /** ISO timestamp. Display and storage only — never an input to geometry. */
  updatedAt: string
}
