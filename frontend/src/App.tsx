import { useCallback, useEffect, useState } from 'react'

import { api } from './api/client'
import { adjust, deriveTotals, impactLine } from './engine/budget'
import { CATEGORY_META, seedBudget } from './fixtures/budget'
import type { Budget, BudgetResponse, CategoryKey } from './types'
import { Controls, Header, World } from './ui'

type Mode = 'live' | 'offline'

const LOAD_TIMEOUT_MS = 3000

function toResponse(budget: Budget, id: number, updatedAt: string): BudgetResponse {
  return {
    id,
    month: budget.month,
    income: budget.income,
    categories: budget.categories,
    ...deriveTotals(budget.income, budget.categories),
    updated_at: updatedAt,
  }
}

function fixtureResponse(): BudgetResponse {
  return toResponse(seedBudget(), 0, '2026-05-01T00:00:00')
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (err: unknown) => {
        window.clearTimeout(timer)
        reject(err)
      },
    )
  })
}

export default function App() {
  const [budget, setBudget] = useState<BudgetResponse | null>(null)
  const [selected, setSelected] = useState<CategoryKey>('food')
  const [mode, setMode] = useState<Mode>('live')
  const [error, setError] = useState<string | null>(null)
  const [impact, setImpact] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const next = await withTimeout(api.getBudget(), LOAD_TIMEOUT_MS)
      setBudget(next)
      setMode('live')
      setError(null)
    } catch {
      setBudget(fixtureResponse())
      setMode('offline')
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  function applyLocal(next: Budget, delta: number, key: CategoryKey) {
    if (!budget) return
    const remainingDelta = -delta
    setBudget(toResponse(next, budget.id, budget.updated_at))
    setImpact(impactLine(CATEGORY_META[key].label, delta, remainingDelta))
  }

  async function handleStep(delta: 50 | -50) {
    if (!budget) return
    const current = budget.categories[selected]
    const nextAmount = current + delta
    if (nextAmount < 0) return

    setError(null)
    if (mode === 'offline') {
      applyLocal(adjust(budget, selected, delta), delta, selected)
      return
    }

    setBusy(true)
    try {
      const next = await api.updateCategory(selected, nextAmount)
      setBudget(next)
      setImpact(impactLine(CATEGORY_META[selected].label, delta, -delta))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update that category')
    } finally {
      setBusy(false)
    }
  }

  async function handleSetAmount(nextAmount: number) {
    if (!budget || nextAmount === budget.categories[selected] || nextAmount < 0) return
    const delta = nextAmount - budget.categories[selected]
    setError(null)
    if (mode === 'offline') {
      applyLocal(
        {
          month: budget.month,
          income: budget.income,
          categories: { ...budget.categories, [selected]: nextAmount },
        },
        delta,
        selected,
      )
      return
    }
    setBusy(true)
    try {
      const next = await api.updateCategory(selected, nextAmount)
      setBudget(next)
      setImpact(impactLine(CATEGORY_META[selected].label, delta, -delta))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update that category')
    } finally {
      setBusy(false)
    }
  }

  async function handleReset() {
    if (!budget) return
    setError(null)
    if (mode === 'offline') {
      setBudget(fixtureResponse())
      setImpact(null)
      return
    }

    setBusy(true)
    try {
      setBudget(await api.resetBudget())
      setImpact(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the budget')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-3 py-6">
      <main className="flex w-full max-w-[390px] flex-col gap-4 rounded-3xl border border-slate-700 bg-[#07111f] px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-slate-100 shadow-2xl">
        {loading ? (
          <p className="py-20 text-center text-sm text-slate-400">Loading…</p>
        ) : !budget ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-300">No budget available</p>
            <button type="button" className="hit-reset mt-3" onClick={() => void refresh()}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <Header budget={budget} />
            {mode === 'offline' && (
              <p className="rounded-lg border border-amber-700 bg-amber-950/60 px-3 py-2 text-sm text-amber-100">
                Offline — showing sample data. Changes stay in this browser.
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-400 bg-red-950/70 px-3 py-2 text-sm text-red-100"
              >
                {error}
              </p>
            )}
            <World budget={budget} selected={selected} onSelect={setSelected} />
            <Controls
              selected={selected}
              amount={budget.categories[selected]}
              impact={impact}
              busy={busy}
              onStep={(delta) => void handleStep(delta)}
              onSetAmount={(amount) => void handleSetAmount(amount)}
              onReset={() => void handleReset()}
            />
          </>
        )}
      </main>
    </div>
  )
}
