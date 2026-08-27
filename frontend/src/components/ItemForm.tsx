import { useState, type FormEvent } from 'react'

import type { ItemCreate } from '../types'

interface Props {
  onSubmit: (payload: ItemCreate) => Promise<void>
}

export function ItemForm({ onSubmit }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return

    setBusy(true)
    setError(null)
    try {
      await onSubmit({ title: title.trim(), description: description.trim() || null })
      // Only clear on success — a failed write that wipes the user's typing
      // loses their work on top of losing the item.
      setTitle('')
      setDescription('')
    } catch (err) {
      // Without this catch the rejection escapes into a submit handler nobody
      // awaits, and the user sees nothing at all.
      setError(err instanceof Error ? err.message : 'Could not add that item')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  )
}
