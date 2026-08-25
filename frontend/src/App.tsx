import { useCallback, useEffect, useState } from 'react'

import { api } from './api/client'
import { ItemForm } from './components/ItemForm'
import { ItemList } from './components/ItemList'
import type { Item, ItemCreate } from './types'

export default function App() {
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setItems(await api.listItems())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleCreate(payload: ItemCreate) {
    await api.createItem(payload)
    await refresh()
  }

  async function handleToggle(item: Item) {
    await api.updateItem(item.id, { is_done: !item.is_done })
    await refresh()
  }

  async function handleDelete(item: Item) {
    await api.deleteItem(item.id)
    await refresh()
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-12">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">cursor-squad-august</h1>
        <p className="mt-1 text-sm text-slate-500">
          React + TypeScript + FastAPI. Example CRUD — copy it as a template.
        </p>
      </header>

      <ItemForm onSubmit={handleCreate} />

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <ItemList items={items} onToggle={handleToggle} onDelete={handleDelete} />
      )}
    </main>
  )
}
