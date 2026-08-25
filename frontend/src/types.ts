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
