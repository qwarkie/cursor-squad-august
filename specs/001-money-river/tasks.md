# Tasks: Money River

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md), [contracts/engine.md](./contracts/engine.md), [art-bible.md](./art-bible.md)

## Format: `[ID] [P?] [Story] [label] Description`

- **[P]** — parallelizable: different files, no dependency on another unfinished task.
- **[Story]** — US1…US5 from spec.md.
- **[label]** — `spine` (the demo path depends on it) or `optional`. Exactly one, per the constitution.
- **`open-to-anyone`** — claimable by a stranger with no conversation. Every such task names its files and its acceptance check.

Every task touches **exactly one surface**. A task that would touch two is split.

## Surfaces

| Surface | Directory | Owns | State |
|---|---|---|---|
| pixel | `frontend/src/pixel/` | Text art → sprites. Feature-agnostic; knows nothing about money. | **Built and green** |
| engine | `frontend/src/engine/` | Pure geometry. No React, no DOM. | To build |
| world | `frontend/src/world/` | The SVG river, object placement, coins. | To build |
| chrome | `frontend/src/components/`, `frontend/src/store/` | DOM UI and state. | To build |

---

## Phase 1: Setup

- [ ] **T001** `spine` **Commit what already exists.** `frontend/src/pixel/`, `frontend/src/StackCheck.tsx`, and the modifications to `frontend/package.json`, `frontend/package-lock.json`, `frontend/src/index.css`, and `frontend/index.html` are all uncommitted — a working, tested subsystem exists on one machine only.
  *Acceptance:* `git status` clean for all six paths; `rm -rf frontend/node_modules && npm --prefix frontend ci` succeeds; `npm run test`, `npm run typecheck`, and `npm run build` all pass on the pushed commit. Report the SHA.

- [ ] **T002** [P] `spine` `open-to-anyone` **Palette module.** Create `frontend/src/world/palette.ts` exporting `PAL` as a `Palette` (the type from `../pixel`) — the 20 single-character keys and hex values from [art-bible.md](./art-bible.md) §2, with `'.'` mapped to `null`. Add the same values as CSS custom properties in `frontend/src/index.css`. The first eight already appear inline in `StackCheck.tsx`; move them here rather than duplicating.
  *Acceptance:* `npm run typecheck` passes; every one of the 20 keys resolves in both files with matching hex; `StackCheck.tsx` imports `PAL` instead of declaring its own.

- [ ] **T003** [P] `spine` `open-to-anyone` **Budget types.** Add `Budget`, `Category`, and `CategoryKind` to `frontend/src/types.ts` per [data-model.md](./data-model.md). Leave the existing `Item` types alone.
  *Acceptance:* `npm run typecheck` passes.

---

## Phase 2: Foundational — blocks every user story

- [ ] **T004** `spine` `open-to-anyone` **The engine.** Implement `budgetToRiver(budget: Budget): RiverModel` in `frontend/src/engine/river.ts`, exactly per [contracts/engine.md](./contracts/engine.md) and the formulas in [data-model.md](./data-model.md) §The maths. Export it from `frontend/src/engine/index.ts`. Pure — no React, no DOM, no `Date`, no `Math.random`.
  *Acceptance:* the worked example in contracts/engine.md returns exactly the model shown there.

- [ ] **T005** `spine` `open-to-anyone` **Engine tests.** Write `frontend/src/engine/river.test.ts` covering every case listed under "Tests that must exist" in [contracts/engine.md](./contracts/engine.md). Depends on T004.
  *Acceptance:* `npm run test` passes with all seven cases present.

- [ ] **T006** `spine` `open-to-anyone` **Path builders.** Create `frontend/src/world/path.ts` with `riverPath(model)` returning an SVG `d` string in **art units**, and `scalePath(d, scale)` returning the same curve in **CSS pixels** for `offset-path`. Apply the meander from [data-model.md](./data-model.md) §The maths. Add `path.test.ts`. These are the only two functions in the codebase permitted to build a path string ([art-bible.md](./art-bible.md) §1).
  *Acceptance:* `scalePath(riverPath(m), 4)` yields coordinates exactly 4× the art-unit ones; both are pure and tested in Node.

- [ ] **T007** `spine` **World shell.** `frontend/src/world/World.tsx` — the `viewBox="0 0 96 128"` SVG plus the positioned DOM overlay for sprites, sized by the integer scale table in [art-bible.md](./art-bible.md) §1 and resizing with the viewport.
  *Acceptance:* a solid `grass` field renders at 384 × 512 on a 390 px viewport, pixels crisp under 4× browser zoom, no horizontal scrollbar; at 320 px it renders at ×3.

- [ ] **T008** `spine` **Budget store.** `frontend/src/store/budget.ts` — zustand store over `Budget`, persisted to `localStorage` key `money-river:budget:v1`. Absent, unreadable, or malformed content loads as the empty state. **A failed write sets a visible error in the store** (Constitution, Additional Constraints; FR-014).
  *Acceptance:* reload preserves a budget; corrupting the key by hand yields the empty field, not a crash; with storage stubbed to throw, an error string is exposed rather than swallowed.

**Checkpoint:** T004, T006, and T007 done means engine, world, and chrome proceed in parallel with no further coordination.

---

## Phase 3: US1 — the river is born (P1) 🎯 MVP

- [ ] **T009** [P] `spine` `open-to-anyone` **Empty field.** `frontend/src/components/EmptyField.tsx` — green field with **Add Income** as the primary action within thumb reach at the bottom, plus a secondary **Load demo budget**. Both ≥ 44 × 44 px.
  *Acceptance:* renders at 390 × 844 with no horizontal scroll; both buttons measure ≥ 44 px in devtools.

- [ ] **T010** `spine` **Income input.** `frontend/src/components/IncomeSheet.tsx` — numeric entry, writes `income` through the store. Rejects `0`, empty, negative, and non-numeric with a visible message (spec US1 scenario 4).
  *Acceptance:* entering `4200` produces a river; entering `abc` or `-5` shows a message and changes nothing.

- [ ] **T011** `spine` **Trunk rendering.** `frontend/src/world/River.tsx` — draw `RiverModel.segments` as SVG paths, each with `stroke-width` set to the segment's `width` and `shape-rendering="crispEdges"`. Draws the model; computes nothing (contracts/engine.md, obligation 1).
  *Acceptance:* income `4200` with no categories renders a full-width trunk from `SPRING_Y` to `MOUTH_Y` with hard, stair-stepped edges.

- [ ] **T012** [P] `spine` `open-to-anyone` **Spring and coin art.** Add `SPRING` (16 × 12, 2 frames) and `COIN` (5 × 5, 2 frames) to `frontend/src/world/objects.ts`, using only palette characters. `COIN` already exists in `StackCheck.tsx` — move it here. Depends on T002.
  *Acceptance:* both render through `PixelSprite` at the declared sizes; every character used is in `PAL`.

- [ ] **T013** `spine` **Coins ride the river.** `frontend/src/world/Coins.tsx` — coins on `offset-path` built by `scalePath`, staggered by index, density scaled to trunk `stroke-width`. **`offsetRotate: '0deg'` on every one.**
  *Acceptance:* coins track the water at every scale factor; a thin river visibly carries fewer than a wide one; no coin is rotated; ≥30 fps holds.

**Checkpoint:** US1 demoable on its own.

---

## Phase 4: US2 — a tributary takes its cut (P1)

- [ ] **T014** `spine` **Add-category form.** `frontend/src/components/CategorySheet.tsx` — label, amount, kind, colour; appends to `budget.categories`.
  *Acceptance:* adding `Housing 1500` drops remaining to `$2,700` in the header.

- [ ] **T015** `spine` **Tributary rendering.** Extend `frontend/src/world/River.tsx` to draw `RiverModel.tributaries` — branch at `atY`, on `side`, stroked at `width` in the category colour. Depends on T011.
  *Acceptance:* the contracts/engine.md worked example renders two branches, right then left, with the trunk stepping `24 → 15 → 12`.

- [ ] **T016** `spine` **Settlements.** `frontend/src/world/Settlements.tsx` — place `settlements` and `residents` counts at each tributary end; `reservoir: true` renders the reservoir instead.
  *Acceptance:* `Housing 1500` shows 6 houses and 3 residents; a savings category shows a reservoir and no houses.

- [ ] **T017** [P] `spine` `open-to-anyone` **Building art.** Add `HOUSE` (9 × 9), `RESIDENT` (5 × 5, 2 frames), and `MARKET` (12 × 9, 2 frames) to `frontend/src/world/objects.ts`. `HOUSE` and `RESIDENT` already exist in `StackCheck.tsx` — move them here. Depends on T002.
  *Acceptance:* all three render at the declared sizes; palette characters only.

- [ ] **T018** [P] `spine` `open-to-anyone` **Reservoir art.** Add `RESERVOIR` (24 × 16, 2 frames) to `frontend/src/world/objects.ts`. Depends on T002.
  *Acceptance:* renders at the declared size; palette characters only.

**Checkpoint:** US1 + US2 is the core demo. If the clock runs out here, the submission still tells its story.

---

## Phase 5: US3 — reshape and see the trade-off (P2)

- [ ] **T019** `spine` **Tap to select.** Hit areas on tributaries in `world/River.tsx` — a transparent wide-stroke path per tributary, ≥ 44 CSS px at every scale, regardless of drawn width (contracts/engine.md, obligation 4). Selection goes to the store.
  *Acceptance:* a `width: 2` tributary is reliably tappable with a thumb at 390 px.

- [ ] **T020** `spine` **Bottom sheet.** `frontend/src/components/BottomSheet.tsx` — category name, exact amount, `−`/`+` in $50 steps, slider. Collapses to keep the world prominent.
  *Acceptance:* spec US3 scenario 2 passes exactly, including the `$0` case closing the tributary.

- [ ] **T021** `spine` **Width transitions.** Transition `stroke-width` over 300 ms ease-out on every affected path in `world/River.tsx`. One CSS property; the engine returns snapshots and the world animates between them (contracts/engine.md, obligation 5).
  *Acceptance:* widths animate rather than snap and are settled within 1 s (SC-003).

- [ ] **T022** [P] `optional` `open-to-anyone` **Trade-off sentence.** Render `Food −$100 → Remaining +$100` after each change, in `frontend/src/components/TradeOff.tsx`. Not in Press Start 2P (art-bible §6).
  *Acceptance:* FR-011 — names the category, the delta, and the change to remaining.

---

## Phase 6: US4 — the river runs dry (P2)

- [ ] **T023** `spine` **The three terminal states.** In `world/River.tsx`, render `surplus`, `balanced`, and `overspent` as visually distinct. Overspent strokes the trunk in `sand` with `CRACK` sprites over it, plus icon and text — never colour alone (FR-012).
  *Acceptance:* the seeded month at remaining `$0` reads as balanced, not as a warning. This is the single most likely thing to be got wrong.

- [ ] **T024** [P] `spine` `open-to-anyone` **Dry and warning art.** Add `CRACK` (8 × 8) and `WARNING` (9 × 9, 2 frames) to `frontend/src/world/objects.ts`. Depends on T002.
  *Acceptance:* both render at the declared sizes; palette characters only.

---

## Phase 7: US5 — demo budget and reset (P2)

- [ ] **T025** [P] `spine` `open-to-anyone` **Seeded month.** `frontend/src/fixtures/budget.ts`, exactly the figures in [data-model.md](./data-model.md) §Seeded month. Checked in, per the constitution.
  *Acceptance:* `budgetToRiver(SEEDED_BUDGET).remaining === 0` and `.state === 'balanced'`.

- [ ] **T026** `spine` **Load and reset.** Wire **Load demo budget** and a confirmed reset in `frontend/src/App.tsx`.
  *Acceptance:* load renders the full month in one tap; reset returns to the empty field with nothing left over.

---

## Phase 8: Polish and deploy

- [ ] **T027** [P] `optional` **Reduced-motion refinement.** `index.css` currently collapses every animation to `0.01ms`, which satisfies FR-016. Optionally re-enable width and number transitions at 150 ms, since those carry meaning rather than decoration.
  *Acceptance:* with `prefers-reduced-motion: reduce` forced, no continuous motion runs and every state in the demo path stays distinguishable.

- [ ] **T028** [P] `optional` `open-to-anyone` **Bank decoration.** Add `CAR` (8 × 5), `ARCADE` (10 × 10), and `TREE` (7 × 9) to `objects.ts` and place them along the matching tributaries.
  *Acceptance:* each renders at its declared size; the world still holds ≥30 fps.

- [ ] **T032** `spine` `open-to-anyone` **Restore the app entry point before deploy.** `frontend/src/main.tsx` currently renders `StackCheck` instead of `App`. That is right for looking at the toolchain and fatal for a demo — deploying it ships the stack-check page as the product. Point it back at `App` once the world mounts, and keep `StackCheck` reachable some other way.
  *Acceptance:* `npm run dev` shows the app, not the stack check. **T029 must not be started until this passes.**

- [ ] **T029** `spine` **Deploy and walk it.** Deploy to Vercel and walk the full demo path on the live URL, on a phone-sized viewport, with the local server stopped.
  *Acceptance:* every quickstart.md step passes on the live URL. **The project is not git-linked — pushing `main` does not deploy.** Report the deployment URL and the commit SHA.

- [ ] **T030** [P] `optional` `open-to-anyone` **README.** Replace the starter-template description with Money River, keeping the deploy warning. The quickstart is a claim under test — run it from a fresh clone before claiming it.
  *Acceptance:* a fresh clone following the README literally reaches a running app.

- [ ] **T031** [P] `optional` `open-to-anyone` **Remove the stray root `src/`.** `src/ui/index.ts` and `src/engine/index.ts` re-export from `../../frontend/src/*/index.js` — paths that do not exist. Nothing imports them and the directory is untracked. Confirm with whoever created it, then delete.
  *Acceptance:* `src/` is gone; `npm run typecheck` and `npm run build` still pass.

---

## Cut order

Per Principle V, cuts are decided early and announced. Weakest justification first — only the spec authority enacts a cut.

1. **`zustand`** → `useState` + context. Its Complexity Tracking entry is the weakest in the plan.
2. **`motion`** → CSS transitions. The chrome animations are simple enough.
3. **T013 coin flow.** The strongest thing on this list, and still third — the river reads without coins riding it.
4. **T028 bank decoration.** Already `optional`.
5. **The slider** in T020. Keep `−`/`+`; the $50 steps carry the interaction.
6. **T022 trade-off sentence.** The numbers already move visibly.

Never cut: T004 engine, T006 path builders, T011/T015 river and tributaries, T023 terminal states, T029 deploy. Those five are the submission.

## Parallel-work map

Three people, no merge conflicts, after T004, T006, and T007 land:

| Owner | Tasks |
|---|---|
| engine | T004, T005, T006 |
| world | T007, T011, T013, T015, T016, T019, T021, T023, T028 |
| chrome | T008, T009, T010, T014, T020, T022, T026 |
| anyone | T002, T003, T012, T017, T018, T024, T025, T030, T031 — nine `open-to-anyone` tasks, mostly text art |
