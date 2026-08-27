# Contract: engine ↔ world

The only interface that crosses a surface boundary. The engine owner and the world owner build against this file and never against each other's code (Constitution, Principle VI).

Location: `frontend/src/engine/river.ts`, re-exported from `frontend/src/engine/index.ts`.

## Signature

```ts
export function budgetToRiver(budget: Budget): RiverModel
```

That is the whole API. One function, one argument, one return value.

## Guarantees the engine makes

The world may rely on all of these without checking:

1. **Pure.** No I/O, no `Date`, no `Math.random`, no React, no DOM, no `localStorage`. Same input, same output, forever.
2. **Whole numbers.** Every coordinate and width in the result is an integer art-pixel. The world never has to round.
3. **Ordered.** `segments` runs top to bottom; `tributaries` matches `budget.categories` index for index, including categories whose amount is `0`.
4. **Total.** Never throws. Junk input — negative income, `NaN` amounts, an empty list — yields a valid `RiverModel`, degrading to `state: 'empty'` rather than failing.
5. **Bounded.** Widths fall in `0 … TRUNK_MAX`; `atY` falls in `SPRING_Y … MOUTH_Y`.
6. **Exact where money is concerned.** `remaining` is exact dollars. Only settlement counts are normalized.

## Obligations the world takes on

1. **Draw the model, do not recompute it.** No width or branch position is derived in a component. If the world needs a number the model does not carry, the model gains a field — the maths does not get a second home.
2. **Never mutate the model.** It is regenerated on every budget change; edits to it are lost and cause drift.
3. **Key by `categoryId`.** Not by array index — reordering must not recycle a sprite onto the wrong tributary.
4. **Inflate hit areas.** A `width: 2` tributary is 8 CSS px wide at scale 4 and cannot be tapped. Every interactive tributary carries a hit area of at least 44 × 44 CSS px, independent of its drawn width (FR-018).
5. **Own the animation.** The model is a snapshot, not a tween. Interpolating from the previous model to the current one belongs to the world.

## Obligations the DOM chrome takes on

1. **Read money from `Budget` and `RiverModel.remaining`**, never from anything measured on the canvas.
2. **Write only through the store.** The bottom sheet mutates `Budget`; the river follows because the model is recomputed. It never reaches into the world.

## Worked example

```ts
budgetToRiver({
  income: 4200,
  categories: [
    { id: 'h', label: 'Housing', amount: 1500, kind: 'expense', color: 'brick500' },
    { id: 'f', label: 'Food',    amount:  650, kind: 'expense', color: 'wheat500' },
  ],
  updatedAt: '2026-08-26T00:00:00.000Z',
})
```

yields, with `TRUNK_MAX = 24`, `SPRING_Y = 16`, `MOUTH_Y = 104`:

```ts
{
  segments: [
    { fromY:  16, toY:  45, carried: 4200, width: 24 },  // full income
    { fromY:  45, toY:  75, carried: 2700, width: 15 },  // after Housing
    { fromY:  75, toY: 104, carried: 2050, width: 12 },  // after Food
  ],
  tributaries: [
    { categoryId: 'h', atY: 45, amount: 1500, width: 9, side: 'right',
      settlements: 6, residents: 3, reservoir: false },
    { categoryId: 'f', atY: 75, amount:  650, width: 4, side: 'left',
      settlements: 3, residents: 1, reservoir: false },
  ],
  remaining: 2050,
  state: 'surplus',
}
```

Read the widths: `24 → 15 → 12`, and the tributaries that took the difference are `9` and `4`. Rounding means those do not sum exactly — **that is expected and accepted.** Widths are integers for crispness; the dollar figures alongside them are exact, and the dollars are what the user is promised.

## Tests that must exist

In `frontend/src/engine/river.test.ts`. This is the only place tests are required (Constitution, Principle IV — coverage beyond the demo path is out of scope).

- `remaining` equals `income − sum(amounts)` across a table of budgets, including negatives.
- Segment widths are monotonically non-increasing.
- All four terminal states are produced by the right inputs, and `balanced` is never reported as `overspent`.
- Two calls on the same budget return deeply equal results.
- A zero-amount category yields a tributary with `width: 0` and stays at its index.
- Junk input — `income: -1`, `amount: NaN`, `categories: []` — returns a valid model and does not throw.
- Every number in the output satisfies `Number.isInteger`.
