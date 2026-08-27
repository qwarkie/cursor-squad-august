import type { Budget, Category } from '../types'

/** Art-pixel constants for the 96 × 128 world grid (art-bible.md §1). */
export const TRUNK_MAX = 24
export const MIN_WIDTH = 2
export const SPRING_Y = 16
export const MOUTH_Y = 104
export const MIN_GAP = 14

export type RiverState = 'empty' | 'surplus' | 'balanced' | 'overspent'

export interface Segment {
  fromY: number
  toY: number
  carried: number
  width: number
}

export interface Tributary {
  categoryId: string
  atY: number
  amount: number
  width: number
  side: 'left' | 'right'
  settlements: number
  residents: number
  reservoir: boolean
}

export interface RiverModel {
  segments: Segment[]
  tributaries: Tributary[]
  remaining: number
  state: RiverState
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Same formula for the trunk and every tributary, so a $X category is exactly as wide as the trunk narrows. */
function widthFor(dollars: number, income: number): number {
  if (!(dollars > 0) || !(income > 0)) return 0
  return clamp(Math.round((TRUNK_MAX * dollars) / income), MIN_WIDTH, TRUNK_MAX)
}

function settlementsFor(category: Category): number {
  if (category.kind === 'savings' || !(category.amount > 0)) return 0
  return clamp(1 + Math.floor(category.amount / 250), 1, 6)
}

function residentsFor(category: Category): number {
  if (category.kind === 'savings' || !(category.amount > 0)) return 0
  return clamp(Math.floor(category.amount / 500), 0, 4)
}

/** Branch points, floored at MIN_GAP apart when the naive even spacing would crowd them (data-model.md §The maths). */
function branchYs(n: number): number[] {
  if (n === 0) return []
  const span = MOUTH_Y - SPRING_Y
  const evenSpacing = span / (n + 1)
  if (evenSpacing >= MIN_GAP) {
    return Array.from({ length: n }, (_, i) => SPRING_Y + Math.round((i + 1) * (span / (n + 1))))
  }
  return Array.from({ length: n }, (_, i) => SPRING_Y + (i + 1) * MIN_GAP)
}

/**
 * Pure geometry: Budget in, RiverModel out. No I/O, no Date, no Math.random.
 * Contract: specs/001-money-river/contracts/engine.md.
 */
export function budgetToRiver(budget: Budget): RiverModel {
  const income = Number.isFinite(budget?.income) ? budget.income : 0
  const categories = Array.isArray(budget?.categories) ? budget.categories : []

  const amounts = categories.map((c) => (Number.isFinite(c.amount) && c.amount > 0 ? c.amount : 0))
  const remaining = income - amounts.reduce((sum, a) => sum + a, 0)

  const state: RiverState =
    income <= 0 ? 'empty' : remaining > 0 ? 'surplus' : remaining === 0 ? 'balanced' : 'overspent'

  const ys = branchYs(categories.length)
  const lastY = categories.length > 0 ? ys[ys.length - 1] : MOUTH_Y
  const mouthY = Math.max(MOUTH_Y, lastY)

  const segments: Segment[] = []
  let boundary = SPRING_Y
  let carried = income
  for (let i = 0; i < categories.length; i++) {
    segments.push({
      fromY: boundary,
      toY: ys[i],
      carried: Math.max(carried, 0),
      width: widthFor(Math.max(carried, 0), income),
    })
    boundary = ys[i]
    carried -= amounts[i]
  }
  segments.push({
    fromY: boundary,
    toY: mouthY,
    carried: Math.max(carried, 0),
    width: widthFor(Math.max(carried, 0), income),
  })

  const tributaries: Tributary[] = categories.map((category, i) => ({
    categoryId: category.id,
    atY: ys[i],
    amount: amounts[i],
    width: widthFor(amounts[i], income),
    side: i % 2 === 0 ? 'right' : 'left',
    settlements: settlementsFor(category),
    residents: residentsFor(category),
    reservoir: category.kind === 'savings',
  }))

  return { segments, tributaries, remaining, state }
}
