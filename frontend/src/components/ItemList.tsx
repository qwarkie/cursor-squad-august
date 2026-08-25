import type { Item } from '../types'

interface Props {
  items: Item[]
  onToggle: (item: Item) => void
  onDelete: (item: Item) => void
}

export function ItemList({ items, onToggle, onDelete }: Props) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
        Nothing here yet. Add your first item.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
        >
          <input
            type="checkbox"
            checked={item.is_done}
            onChange={() => onToggle(item)}
            className="size-4 shrink-0 accent-slate-900"
          />
          <div className="min-w-0 flex-1">
            <p
              className={`truncate text-sm font-medium ${
                item.is_done ? 'text-slate-400 line-through' : 'text-slate-900'
              }`}
            >
              {item.title}
            </p>
            {item.description && (
              <p className="truncate text-xs text-slate-500">{item.description}</p>
            )}
          </div>
          <button
            onClick={() => onDelete(item)}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  )
}
