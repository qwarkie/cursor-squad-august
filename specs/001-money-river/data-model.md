# Data Model: Money River

Two shapes matter. **`Budget`** is what the user edits and what gets stored. **`RiverModel`** is what the world draws. Everything between them is one pure function.

```text
   user input ──▶ Budget ──▶ budgetToRiver() ──▶ RiverModel ──▶ SVG river + sprites
                    │                                │
                    └──▶ localStorage                └──▶ header + bottom sheet numbers
```

`Budget` is the only mutable state. `RiverModel` is derived on every change and never edited.

## Budget

| Field | Type | Rules |
|---|---|---|
| `income` | `number` | Whole dollars, `>= 0`. `0` means no river. |
| `categories` | `Category[]` | Ordered. **Position is meaningful** — index fixes where the tributary meets the trunk, top to bottom. |
| `updatedAt` | `string` | ISO timestamp. Display and storage only; never an input to geometry. |

## Category

| Field | Type | Rules |
|---|---|---|
| `id` | `string` | Stable across edits. Used as the React key and the selection target. |
| `label` | `string` | 1–20 chars. Shown in the world and the bottom sheet. |
| `amount` | `number` | Whole dollars, `>= 0`. `0` closes the tributary but keeps the category in the list. |
| `kind` | `'expense' \| 'savings'` | `expense` ends in settlements; `savings` ends in a reservoir. |
| `color` | `PaletteKey` | One of the six category colours in [art-bible.md](./art-bible.md). Consistent across world, label, and controls. |

## RiverModel

Derived. Coordinates are **art-pixels** on the 96 × 128 world grid defined in the art bible — never CSS pixels, never percentages.

| Field | Type | Meaning |
|---|---|---|
| `segments` | `Segment[]` | Trunk pieces top to bottom, one more than there are open tributaries. |
| `tributaries` | `Tributary[]` | One per category, in budget order. |
| `remaining` | `number` | `income − sum(amounts)`. Exact dollars, may be negative. |
| `state` | `'empty' \| 'surplus' \| 'balanced' \| 'overspent'` | Terminal state of the whole river. |

### Segment

| Field | Type | Meaning |
|---|---|---|
| `fromY`, `toY` | `number` | Art-pixel span down the canvas. |
| `carried` | `number` | Dollars still in the trunk through this stretch. |
| `width` | `number` | Art-pixels. `0` renders as dry cracked bed. |

### Tributary

| Field | Type | Meaning |
|---|---|---|
| `categoryId` | `string` | Links back to the `Category`. |
| `atY` | `number` | Art-pixel height of the branch point on the trunk. |
| `amount` | `number` | Exact dollars. |
| `width` | `number` | Art-pixels. `0` when the amount is `0` — the branch is not drawn. |
| `side` | `'left' \| 'right'` | Alternates by index; `right` first. Deterministic, never random. |
| `settlements` | `number` | Houses at the mouth. `0` for `savings`. |
| `residents` | `number` | Animated residents among the houses. `0` for `savings`. |
| `reservoir` | `boolean` | `true` for `savings`. |

## The maths

All constants live in one place, `frontend/src/engine/river.ts`. Every result is **rounded to a whole art-pixel** — a fractional coordinate blurs pixel art and the aesthetic dies with it.

```text
TRUNK_MAX   = 16    art-px  — trunk width when it carries the full income
MIN_WIDTH   =  2    art-px  — floor, so a tiny category is still visible
SPRING_Y    = 16    art-px  — where the river starts
MOUTH_Y     = 104   art-px  — where the pool begins
MIN_GAP     = 14    art-px  — floor on the spacing between branch points
MEANDER_A   =  6    art-px  — how far the trunk wanders off centre
MEANDER_W   = 20    art-px  — wavelength of that wander
```

**The shore has a budget, and `TRUNK_MAX` spends it.** A village is 27 art-px
wide (three icons, art-bible.md §4) and it has to stand on the far side of a
visible stream. From the world's edge back to the trunk's centre at the worst
of the meander there are `96/2 − MEANDER_A = 42` art-px, and the trunk takes
`TRUNK_MAX/2` of them off the top. At `TRUNK_MAX = 24` that left `42 − 12 − 27
= 3` art-px for the stream, so the branch rendered as a stub and the outgoing
flow — the one thing this world exists to show — was invisible. At 16 the
shore keeps 7. Raising `TRUNK_MAX` again spends that back.

**Width of any flow.** The same function for the trunk and for every tributary, so a tributary of $X is exactly as wide as the trunk narrows:

```text
width(dollars, income) =
    dollars <= 0  →  0
    income  <= 0  →  0
    otherwise     →  clamp(round(TRUNK_MAX × dollars / income), MIN_WIDTH, TRUNK_MAX)
```

**What the trunk still carries** below the first `i` categories:

```text
carried(i) = income − sum(amount of categories 0 … i−1)
```

`segments[i].width = width(max(carried(i), 0), income)`. A negative `carried` yields width `0` — the dry bed of the overspent state.

**Where a branch meets the trunk**, for `n` categories:

```text
atY(i) = SPRING_Y + round((i + 1) × (MOUTH_Y − SPRING_Y) / (n + 1))
```

Once that spacing would fall below `MIN_GAP`, branches are placed at `MIN_GAP` apart from `SPRING_Y` and the world scrolls rather than overlapping.

**Which side it leaves on:** `side(i) = i is even ? 'right' : 'left'`. Alternating keeps the trunk readable and is fully determined by index.

**How much was built with the money.** Normalized, not literal — spec Assumptions permit this, and exactness stays with the dollar figures:

```text
settlements(amount) = clamp(1 + floor(amount / 250), 1, 6)
residents(amount)   = clamp(floor(amount / 500), 0, 4)
```

Both are `0` when `kind === 'savings'` or `amount === 0`.

**Terminal state:**

```text
income == 0                      →  'empty'       green field, no river
remaining >  0                   →  'surplus'     pool at the mouth
remaining == 0                   →  'balanced'    empty basin, not a warning
remaining <  0                   →  'overspent'   dry cracked bed + warning
```

`balanced` and `overspent` are **visually distinct**. The seeded demo month loads at `balanced`, so mistaking it for a warning would read as a broken app.

**Curvature.** The trunk wanders off centre by a fixed amount that depends only on height:

```text
xOffset(y) = round(MEANDER_A × sin(y / MEANDER_W))     art-px
```

A closed form of `y` alone — no noise library, no seed, no state. That is what makes SC-007 — two loads, identical geometry — true by construction rather than by discipline. `frontend/src/world/path.ts` turns these offsets into the SVG path `d` string; nothing else builds one.

## Invariants

These are the assertions worth writing tests for:

1. `remaining === income − sum(all amounts)`, exactly, at all times.
2. `segments[0].width === width(income, income) === TRUNK_MAX` whenever `income > 0`.
3. Segment widths are monotonically non-increasing from spring to mouth.
4. `budgetToRiver` called twice on the same `Budget` returns deeply equal results.
5. Every coordinate and width in `RiverModel` is a whole number.
6. Removing a category and re-adding it with the same amount at the same index restores an identical `RiverModel`.
7. No field of `RiverModel` depends on `Date`, `Math.random`, or anything off-device.

## Seeded month

`frontend/src/fixtures/budget.ts`, checked in, loaded by **Load demo budget**:

```text
income 4200
  Housing        1500   expense   brick
  Food            650   expense   wheat
  Transport       350   expense   slate
  Entertainment   300   expense   plum
  Savings        1400   savings   teal
                 ─────
  remaining         0   → state 'balanced'
```

This sums to income exactly, which is the brief's own seed. See spec Assumptions for why `remaining` opens at `$0` and what the demo script does about it.

## Storage

One `localStorage` key, `money-river:budget:v1`, holding a serialized `Budget`. Unreadable, absent, or malformed content is treated as first load and renders the empty field. A failed **write** renders a visible error — a silent write failure survives to the demo, where a judge changes a number, reloads, and the change is gone.
