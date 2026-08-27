import { useCallback, useEffect, useState } from 'react'

import { api } from './api/client'
import { ItemForm } from './components/ItemForm'
import { ItemList } from './components/ItemList'
import { applyCreate, applyDelete, applyToggle } from './engine'
import { FIXTURE_ITEMS } from './fixtures/items'
import type { Item, ItemCreate } from './types'

/**
 * Two modes, one UI.
 *
 * `live`    — the API answered; reads and writes go to the server.
 * `offline` — the API did not answer; the list renders from checked-in
 *             fixtures and writes are applied locally, so the demo path still
 *             runs end to end with no network (Constitution, Principle II).
 *
 * Every write reports its own failure. A mutation that fails silently survives
 * to the demo, where a judge clicks the button and nothing happens.
 */
type Mode = 'live' | 'offline'

export default function App() {
  const [items, setItems] = useState<Item[]>([])
  const [mode, setMode] = useState<Mode>('live')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setItems(await api.listItems())
      setMode('live')
      setError(null)
    } catch {
      // No error banner here: falling back is the designed behaviour, not a
      // failure. The mode notice tells the user what they are looking at.
      setItems(FIXTURE_ITEMS)
      setMode('offline')
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /** Rejects on failure so ItemForm can keep the user's text and show why. */
  async function handleCreate(payload: ItemCreate) {
    if (mode === 'offline') {
      setItems((current) => applyCreate(current, payload, new Date().toISOString()))
      return
    }
    await api.createItem(payload)
    await refresh()
  }

  async function handleToggle(item: Item) {
    if (mode === 'offline') {
      setItems((current) => applyToggle(current, item.id))
      return
    }
    try {
      await api.updateItem(item.id, { is_done: !item.is_done })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update that item')
    }
  }

  async function handleDelete(item: Item) {
    if (mode === 'offline') {
      setItems((current) => applyDelete(current, item.id))
      return
    }
    try {
      await api.deleteItem(item.id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that item')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-12">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">cursor-squad-august</h1>
        <p className="mt-1 text-sm text-slate-500">Cursor Squad Hackathon Workspace</p>
      </header>

      <ItemForm onSubmit={handleCreate} />

      {/* handleToggle and handleDelete never reject — they report their own
          failures — so passing them to void-returning props drops nothing. */}
      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          {mode === 'offline' && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Offline — showing sample data. Changes stay in this browser.
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <ItemList
            items={items}
            onToggle={(item) => void handleToggle(item)}
            onDelete={(item) => void handleDelete(item)}
          />
        </>
      )}
    </main>
  )
}
