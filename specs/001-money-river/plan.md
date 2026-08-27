# Implementation Plan: Money River

**Branch**: `001-money-river` | **Date**: 2026-08-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-money-river/spec.md`

## Summary

A month's budget is rendered as one river: income sets the trunk width, each category branches off as a tributary, and the trunk visibly narrows below every branch. There is **no canvas renderer**. The river is an inline SVG whose `stroke-width` *is* the flow width the engine computes; objects are 8-bit sprites authored as text and rendered through the existing [`frontend/src/pixel/`](../../frontend/src/pixel/README.md) system; the header, bottom sheet, and buttons are ordinary React + Tailwind DOM. Full reasoning in [ADR-0001](../../docs/adr/0001-svg-river-css-sprites.md).

The geometry is computed by a **pure, dependency-free engine function** — `Budget → RiverModel` — that touches neither React, nor the DOM, nor the clock, nor the network. That single seam is what lets the engine and the visuals be built in parallel by different owners (Constitution, Principle VI) and is what makes the deterministic fallback (Principle II) testable rather than asserted.

## Technical Context

**Language/Version**: TypeScript 5.7, React 19.2, targeting ES2022

**Primary Dependencies**: four at runtime — `motion` 13.1.1 (DOM chrome transitions), `zustand` 5.0.15 (budget store), `@fontsource/press-start-2p` 5.3.0 (self-hosted 8-bit typeface), and React itself. Sprites, rasterisation, and frame animation are in-repo (`frontend/src/pixel/`), not a dependency. Build stack unchanged: Vite 7, Tailwind 4, Vitest 4.

**Storage**: `localStorage`, single key. No backend on the demo path.

**Testing**: Vitest. The engine and the rasteriser are pure and DOM-free, so both are unit-tested in Node — that is where the value is. No rendering tests; the world is verified by eye against the art bible and by `StackCheck.tsx`.

**Target Platform**: Mobile web, iOS Safari 16+ and Chrome Android. Desktop shows the same experience in a centred phone-width column.

**Performance Goals**: ≥30 fps at 390 × 844 with the full seeded budget; input to visible change under 300 ms; animation settled within 1 s. Sprite frames and coin flow run on the compositor, so the main thread is free by construction rather than by optimisation.

**Constraints**: No network on the demo path. No unseeded randomness anywhere in the world. Integer scale factors only — a fractional scale blurs pixel art and the aesthetic dies with it. `offset-rotate: 0deg` on anything riding a path. No new runtime dependency without an entry in Complexity Tracking below.

**Scale/Scope**: One screen, one month, five to eight categories, eleven object kinds.

## Constitution Check

*GATE: checked before Phase 0, re-checked after Phase 1 design.*

| Principle | Status | How this plan satisfies it |
|---|---|---|
| I — Demo Path Integrity | **Pass** | The demo path is named in spec.md as US1 → US2 → US3 → US4 → US5 and runs entirely client-side. Each user story is independently renderable, so a broken later story never dark-screens an earlier one. |
| II — Deterministic Fallback | **Pass** | No network, no key, no model call on any path. Curvature is a pure function of branch positions — no noise library, no `Math.random`, no clock — so geometry is reproducible (FR-015, SC-007). The seeded month is a checked-in fixture. |
| III — Stranger-Claimable Tasks | **Pass** | The `Budget → RiverModel` contract in [contracts/engine.md](./contracts/engine.md) and the text-art format in [art-bible.md](./art-bible.md) §3 let a stranger add an object or an engine rule with no conversation. Nine tasks are labelled `open-to-anyone`. |
| IV — Functional Completeness Over Technical Depth | **Pass** | Tests cover the engine and the rasteriser only. No abstraction over the DOM, no asset pipeline, no component library. A renderer was considered and rejected partly *because* working code already existed. |
| V — Cut Early, Cut Loudly | **Pass** | Cut order is published in tasks.md, weakest dependency first. |
| VI — Single Owned Surface | **Pass** | Four surfaces, no overlap: `engine/` (pure geometry), `pixel/` (rasteriser, already built), `world/` (SVG river and object placement), `components/` (DOM chrome). The engine contract is the only thing crossing a boundary. |
| Additional — stack is fixed, **no new runtime dependency the demo path does not require** | **Pass, narrowly** | Three additions, each justified below. The four heaviest candidates — `pixi.js`, `@pixi/react`, `pixi-filters`, `simplex-noise` — were added, then removed in favour of in-repo code. |
| Additional — backend off the production demo path | **Pass** | Nothing on the demo path calls `/api`. |
| Additional — live deployment is part of the demo path | **Pass** | Deploy is a spine task and the live URL is walked, not assumed. (Superseded detail: this row originally stated the deploy was not git-linked. It was linked during the event, and later the account's daily deploy quota was exhausted. The verdict stands on the walk, not on the pipeline's state.) |
| Additional — README quickstart is a claim under test | **Pass** | [quickstart.md](./quickstart.md) is written to be run literally from a fresh clone. |
| Additional — deterministic fixtures checked in | **Pass** | `frontend/src/fixtures/budget.ts` holds the seeded month. |
| Additional — every write path surfaces its failure | **Pass** | FR-014. The only write path is `localStorage`; a failed write renders a visible error rather than being swallowed. |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| `@fontsource/press-start-2p` | Self-hosted 8-bit typeface. A font CDN is a network request and violates Principle II outright. | A system font destroys the aesthetic, and the submission is judged on how it looks. |
| `motion` | Bottom-sheet, header-number, and warning-state transitions. Already in the repo before this feature and small. | Could be replaced by CSS transitions if the bundle needs cutting — second on the cut list. |
| `zustand` | One store for the budget, read by both the chrome and the world without prop-drilling. | **Weakest justification here.** `useState` plus context would do. First on the cut list. |

Recorded for the audit trail: `pixi.js`, `@pixi/react`, `pixi-filters`, and `simplex-noise` were installed and then removed the same afternoon. They cost roughly 400 KB gzip and bought nothing the compositor was not already providing. See [ADR-0001](../../docs/adr/0001-svg-river-css-sprites.md).

## Project Structure

### Documentation (this feature)

```text
specs/001-money-river/
├── spec.md              # WHAT and WHY — the canonical metaphor and requirements
├── plan.md              # This file — HOW, and the Constitution Check
├── data-model.md        # Budget, Category, RiverModel; the width maths
├── art-bible.md         # Palette, coordinates, text-art format, motion timings
├── quickstart.md        # Run it, and walk the demo path
├── contracts/
│   └── engine.md        # The engine ↔ world seam; the only cross-surface contract
└── tasks.md             # Claimable tasks, labelled spine/optional
```

### Source Code (repository root)

Files marked **✓** already exist and are green.

```text
frontend/
└── src/
    ├── pixel/                  ✓ text art → data: URL sprites. Reusable, feature-agnostic.
    │   ├── raster.ts           ✓ pure, DOM-free
    │   ├── raster.test.ts      ✓
    │   ├── sprite.ts           ✓ strip packing, memoised
    │   ├── PixelSprite.tsx     ✓ the component
    │   └── README.md           ✓ authoring guide
    ├── engine/
    │   ├── river.ts            # budgetToRiver(): the pure Budget → RiverModel function
    │   ├── river.test.ts       # width maths, ordering, the three terminal states
    │   └── index.ts            ✓ re-exports
    ├── world/
    │   ├── palette.ts          # the 20 colours, as a Palette
    │   ├── path.ts             # riverPath() and scalePath() — the only path builders
    │   ├── River.tsx           # the SVG: trunk, tributaries, pool
    │   ├── Settlements.tsx     # houses and residents at tributary ends
    │   ├── Coins.tsx           # coins on offset-path
    │   └── objects.ts          # every object, as text art
    ├── components/             # DOM chrome — header, bottom sheet, buttons
    ├── fixtures/budget.ts      # the seeded month, checked in
    ├── store/budget.ts         # zustand store + localStorage persistence
    ├── StackCheck.tsx          ✓ one of everything, for spotting toolchain regressions
    └── types.ts                ✓ extended with Budget and Category

backend/                        # untouched by this feature
```

**Structure Decision**: The existing `frontend/` + `backend/` split is kept, and only `frontend/src/` is touched. Inside it, four sibling directories map one-to-one onto the owned surfaces of Principle VI. `pixel/` is deliberately feature-agnostic — it knows nothing about money — so it stays reusable and independently testable. A task never touches two surfaces.

> **Repo hygiene, flagged not fixed.** `src/ui/index.ts` and `src/engine/index.ts` at the repository root are re-export shims pointing at `../../frontend/src/*/index.js`. Those `.js` paths do not exist, nothing imports the shims, and the directory is untracked. It looks like a stray scaffold. It is outside this feature's surfaces, so this plan does not delete it — it should be confirmed and removed by whoever created it.
