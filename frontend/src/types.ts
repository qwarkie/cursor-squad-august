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
