import { trunkX } from './path'

/**
 * How far a tributary travels off the trunk before its settlements, in
 * art-pixels. Provisional straight line — T015 (the curved branch) is
 * Fizz's and belongs in `path.ts` alongside `riverPath`/`scalePath`. Swap
 * the body of `tributaryEnd` for their curve's endpoint without touching
 * any caller once it lands.
 */
const TRIBUTARY_REACH = 22
const TRIBUTARY_DROP = 10

/** Where a tributary ends, in art-pixels — River.tsx draws to it, Settlements.tsx plants sprites there. */
export function tributaryEnd(atY: number, side: 'left' | 'right'): { x: number; y: number } {
  const dir = side === 'right' ? 1 : -1
  return { x: trunkX(atY) + dir * TRIBUTARY_REACH, y: atY + TRIBUTARY_DROP }
}
