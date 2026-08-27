import type { RiverModel } from '../engine'

import { tributaryEnd, trunkWidthAt } from './geometry'
import { trunkX } from './path'

/**
 * Where every coin goes, and when it leaves the spring.
 *
 * **One coin is one tenth of the month's income.** A $300 category out of
 * $3,000 gets one coin, $600 gets two, $1,500 gets five — the count *is* the
 * percentage, which is the whole point: a reader can compare two branches by
 * counting, without reading a number anywhere.
 *
 * **Every coin is routed, not just drawn.** A coin leaves the spring, runs
 * down the trunk and turns off onto the branch it belongs to, so the split at
 * a junction is something the money does rather than something the water is
 * shaped like. Coins that nothing claims run on to the mouth pool — that is
 * the surplus, moving.
 *
 * Pure and DOM-free so it tests in Node. Nothing here reads the clock or a
 * random source: stagger comes from the departure index, which is what keeps
 * two loads identical (FR-015, SC-007).
 */

/** One coin per tenth of income. Ten leave the spring every cycle, whatever the income is. */
export const COINS_PER_INCOME = 10

/**
 * Art-pixels a coin travels per second — the same on the trunk and on every
 * branch, because one current cannot visibly run at two speeds. The whole
 * trunk is 88 art-px, so a coin takes about nine seconds to cross the world.
 */
export const COIN_SPEED = 10

/** Fraction of a route spent fading out, so a coin dissolves into its settlement rather than blinking off. */
const FADE = 0.12

/**
 * Art-pixels of trunk a coin uses to drift across to the bank before it turns
 * off. Without it the coin leaves the centre line on a shallower slope than
 * the branch River.tsx draws — the two only meet at the settlement — and it
 * spends the first half of the branch riding the grass beside it. With it the
 * coin peels away inside the water and then runs down the branch's own centre
 * line, which is the same line the water was rasterised from.
 */
const TURN = 5

export interface Point {
  x: number
  y: number
}

export interface CoinRoute {
  /** Category id, or `mouth`. Stable across renders — React keys hang off it. */
  id: string
  /** Art-pixel polyline: the trunk from the spring, then the turn and the branch. */
  points: readonly Point[]
  /** How many leading points belong to the trunk — the rest is the turn-off. */
  trunkRows: number
  /** How many coins this route carries — its share of income, in tenths. */
  coins: number
  /** Art-pixels along `points`. */
  length: number
  /** Seconds to travel it at COIN_SPEED. */
  duration: number
}

export interface ScheduledCoin {
  key: string
  /** Index into `CoinPlan.routes`. */
  route: number
  /** Seconds. Negative, so the river is already carrying coins on the first frame. */
  delay: number
  /** Where this coin sits at t = 0, as a percentage of its route — the still frame under reduced motion. */
  offset: number
}

export interface CoinPlan {
  routes: CoinRoute[]
  coins: ScheduledCoin[]
  /**
   * Seconds between one coin leaving the spring and the same coin leaving
   * again. Every route shares it — a route shorter than the longest one
   * arrives early and its coin waits out the rest of the cycle, hidden. That
   * shared period is what keeps the spacing on the trunk even: coins are
   * evenly spaced *in departure time*, and since they all move at one speed,
   * evenly spaced in distance too, regardless of where they later turn off.
   */
  cycle: number
}

const round3 = (n: number) => Math.round(n * 1000) / 1000

const EMPTY: CoinPlan = { routes: [], coins: [], cycle: 0 }

/**
 * How many coins each branch takes, and how many run on to the mouth.
 *
 * Counted off a running total rather than rounded independently, so what
 * arrives at a junction always equals what leaves it: `round(a/unit) +
 * round(b/unit)` is not `round((a+b)/unit)`, and independent rounding makes
 * coins appear or vanish at a fork for no reason a reader can see.
 *
 * A category small enough to round to nothing still gets one coin, taken from
 * what continues downstream. A branch with money on it and no coins reads as
 * a dead channel, which is worse than a tenth of a coin's worth of drift.
 */
export function coinCounts(model: Pick<RiverModel, 'segments' | 'tributaries'> | undefined): {
  branches: number[]
  mouth: number
} {
  const segments = model?.segments ?? []
  const tributaries = model?.tributaries ?? []
  const income = segments[0]?.carried ?? 0
  if (!(income > 0)) return { branches: tributaries.map(() => 0), mouth: 0 }

  const unit = income / COINS_PER_INCOME
  const inTenths = (dollars: number) => Math.max(0, Math.round(Math.max(0, dollars) / unit))

  let carrying = inTenths(income)
  const branches = tributaries.map((trib, k) => {
    const below = inTenths(segments[k + 1]?.carried ?? 0)
    let take = carrying - below
    if (take < 1 && trib.amount > 0) take = 1
    take = Math.max(0, Math.min(carrying, take))
    carrying -= take
    return take
  })

  return { branches, mouth: carrying }
}

/** The trunk's centre line, one point per art-pixel row — the same curve `riverPath` draws. */
function trunkPoints(fromY: number, toY: number): Point[] {
  const points: Point[] = []
  for (let y = Math.round(fromY); y <= Math.round(toY); y += 1) points.push({ x: trunkX(y), y })
  return points
}

function polylineLength(points: readonly Point[]): number {
  let length = 0
  for (let i = 1; i < points.length; i += 1) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  }
  return length
}

/**
 * Every route on the river, in the order the trunk meets them.
 *
 * A branch route is the trunk down to the junction and then the branch itself,
 * as one polyline — one path per coin, so a coin turning off is a curve
 * bending, not a handover between two animations that can fall out of step.
 */
export function coinRoutes(model: RiverModel | undefined): CoinRoute[] {
  const segments = model?.segments ?? []
  const spring = segments[0]?.fromY
  if (segments.length === 0 || !Number.isFinite(spring)) return []

  const { branches, mouth } = coinCounts(model)
  const routes: CoinRoute[] = []

  ;(model?.tributaries ?? []).forEach((trib, k) => {
    if (branches[k] <= 0 || trib.width <= 0) return

    const trunkWidth = trunkWidthAt(model, trib.atY)
    const end = tributaryEnd(trib.atY, trib.side, trunkWidth)
    const dir = trib.side === 'right' ? 1 : -1

    // The same point River.tsx starts the branch from: two art-pixels inside
    // the bank, so the branch welds to the trunk instead of seaming off it.
    const bank = {
      x: trunkX(trib.atY) + dir * Math.max(0, Math.round(trunkWidth / 2) - 2),
      y: trib.atY,
    }

    const trunk = trunkPoints(spring, Math.max(spring, trib.atY - TURN))
    routes.push(finish(trib.categoryId, [...trunk, bank, end], trunk.length, branches[k]))
  })

  // The surplus: whatever no category claimed, running on to the pool. It
  // stops where the water does, not at MOUTH_Y — an overspent river's last
  // stretch is dry bed, and coins must not ride down it.
  const wet = [...segments].reverse().find((seg) => seg.width > 0)
  if (mouth > 0 && wet) {
    const trunk = trunkPoints(spring, wet.toY)
    routes.push(finish('mouth', trunk, trunk.length, mouth))
  }

  return routes
}

function finish(id: string, points: Point[], trunkRows: number, coins: number): CoinRoute {
  const length = polylineLength(points)
  return {
    id,
    points,
    trunkRows,
    coins,
    length,
    duration: round3(Math.max(0.1, length / COIN_SPEED)),
  }
}

/**
 * The routes plus a departure timetable.
 *
 * Departures are spread evenly across the cycle and *interleaved* between
 * routes: five coins for rent and two for food leave as one mixed stream, not
 * as five then two. Batched departures make the upper trunk pulse — a clump,
 * then a gap — and the whole point of the shared cycle is that it does not.
 */
export function coinPlan(model: RiverModel | undefined): CoinPlan {
  const routes = coinRoutes(model)
  if (routes.length === 0) return EMPTY

  const cycle = round3(Math.max(...routes.map((route) => route.duration)))
  if (!(cycle > 0)) return EMPTY

  const order = departureOrder(routes.map((route) => route.coins))

  const coins = order.map((route, i) => {
    const phase = i / order.length
    const travelled = (phase * cycle) / routes[route].duration
    return {
      key: `${routes[route].id}:${i}`,
      route,
      delay: round3(-phase * cycle),
      offset: round3(Math.min(1, travelled) * 100),
    }
  })

  return { routes, coins, cycle }
}

/**
 * The keyframes for one route, as CSS.
 *
 * A route shorter than the cycle finishes early: the coin reaches its
 * settlement, fades out over the last {@link FADE} of the trip, and stays
 * hidden until the cycle comes round again. That is what spending looks like,
 * and it is also what lets every route share one period.
 */
export function routeKeyframes(name: string, route: CoinRoute, cycle: number): string {
  const arrive = Math.min(100, round3((route.duration / cycle) * 100))
  const solid = round3(arrive * (1 - FADE))

  return [
    `@keyframes ${name} {`,
    `  0% { offset-distance: 0%; opacity: 1; }`,
    `  ${solid}% { opacity: 1; }`,
    `  ${arrive}% { offset-distance: 100%; opacity: 0; }`,
    `  100% { offset-distance: 100%; opacity: 0; }`,
    `}`,
  ].join('\n')
}

/**
 * Which route each departure belongs to — the order coins leave the spring in.
 *
 * Departures are already evenly spaced in time; what this decides is how they
 * are *shared out*, and that is what a reader actually sees. Coins are only
 * spaced evenly on a stretch if the routes that leave before it are spread
 * through the sequence: group a branch's coins together and the stretch below
 * its junction gets one long hole where they used to be, then a queue. Both
 * were visible on the trunk.
 *
 * Note that random assignment is the wrong tool here, and would make it worse
 * — a Poisson stream is *defined* by its clumps and gaps. What is wanted is
 * the opposite of random: the most even interleaving there is. So each route
 * accrues a claim of `coins / total` per departure and the largest outstanding
 * claim takes it — the standard smooth-scheduling round, which for two equal
 * routes gives a strict alternation and never lets any route fall more than
 * one departure behind its share.
 *
 * Deterministic, and it has to be: SC-007 requires two loads of one budget to
 * be identical, so there is no clock and no random source anywhere in here.
 */
export function departureOrder(counts: readonly number[]): number[] {
  const total = counts.reduce((sum, n) => sum + Math.max(0, n), 0)
  if (total <= 0) return []

  const claim = counts.map(() => 0)
  const order: number[] = []

  for (let i = 0; i < total; i += 1) {
    let best = -1
    for (let r = 0; r < counts.length; r += 1) {
      if (counts[r] <= 0) continue
      claim[r] += counts[r] / total
      if (best === -1 || claim[r] > claim[best]) best = r
    }
    claim[best] -= 1
    order.push(best)
  }

  return order
}
