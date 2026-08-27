import type { Item, ItemCreate } from '../types'

/**
 * Pure item-list operations, shared by the API path and the offline fallback.
 *
 * Nothing here touches the network, the clock, or React state, so the
 * deterministic fallback Principle II requires is exercised by the same code
 * that runs against the live API. Every function returns a new array.
 */

/** One past the highest id in use. Length is wrong here — deletes leave gaps. */
export function nextId(items: Item[]): number {
  return items.reduce((highest, item) => Math.max(highest, item.id), 0) + 1
}

export function applyToggle(items: Item[], id: number): Item[] {
  return items.map((item) => (item.id === id ? { ...item, is_done: !item.is_done } : item))
}

export function applyDelete(items: Item[], id: number): Item[] {
  return items.filter((item) => item.id !== id)
}

/**
 * Newest first, matching `list_items`' `order_by(created_at.desc())` so the
 * offline list and the API list read the same way.
 * `now` is passed in rather than read from the clock to keep this testable.
 */
export function applyCreate(items: Item[], payload: ItemCreate, now: string): Item[] {
  const created: Item = {
    id: nextId(items),
    title: payload.title,
    description: payload.description ?? null,
    is_done: payload.is_done ?? false,
    created_at: now,
    updated_at: now,
  }
  return [created, ...items]
}
