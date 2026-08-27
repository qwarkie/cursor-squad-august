import type { BudgetResponse, CategoryKey, Item, ItemCreate, ItemUpdate } from '../types'

// Relative path on purpose: Vite proxies /api to the backend in dev,
// and in production the two are served from the same origin.
const BASE = '/api'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!response.ok) {
    // FastAPI puts the reason in `detail`; fall back to the status text.
    const detail = await response
      .json()
      .then((body: { detail?: unknown }) => body.detail)
      .catch(() => null)
    const message = typeof detail === 'string' ? detail : response.statusText
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export const api = {
  listItems: () => request<Item[]>('/items'),

  createItem: (payload: ItemCreate) =>
    request<Item>('/items', { method: 'POST', body: JSON.stringify(payload) }),

  updateItem: (id: number, payload: ItemUpdate) =>
    request<Item>(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  deleteItem: (id: number) => request<void>(`/items/${id}`, { method: 'DELETE' }),

  getBudget: () => request<BudgetResponse>('/budget'),

  updateCategory: (key: CategoryKey, amount: number) =>
    request<BudgetResponse>(`/budget/categories/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ amount }),
    }),

  resetBudget: () => request<BudgetResponse>('/budget/reset', { method: 'POST' }),
}
