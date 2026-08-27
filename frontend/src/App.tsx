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
    <div className="flex min-h-screen items-center justify-center px-0 py-0 sm:px-3 sm:py-4">
      <main className="phone">
        <div className="phone-inner">
          {loading ? (
            <div className="boot">
              <div className="boot-houses" aria-hidden>
                <span className="spr house">
                  <span className="house-smoke" />
                  <span className="house-chimney" />
                  <span className="house-roof" />
                  <span className="house-body" />
                </span>
                <span className="spr stall">
                  <span className="stall-awning" />
                  <span className="stall-body" />
                </span>
                <span className="spr vault" />
              </div>
              <p className="boot-copy">Loading the town…</p>
            </div>
          ) : !budget ? (
            <div className="boot">
              <p className="boot-copy">No budget available</p>
              <button type="button" className="hit-reset mt-3" onClick={() => void refresh()}>
                Retry
              </button>
            </div>
          ) : (
            <>
              <Header budget={budget} />
              {mode === 'offline' && (
                <p className="banner banner-offline">
                  Offline — sample town. Changes stay in this browser.
                </p>
              )}
              {error && (
                <p role="alert" className="banner banner-alert">
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
        </div>
      </main>
    </div>
  )
}
