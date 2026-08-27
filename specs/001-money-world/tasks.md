# Tasks: Money World

**Input**: Design documents from `specs/001-money-world/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Tests**: Required (MW-TEST-*). Write the named tests so they fail before the matching implementation where practical.

**Organization**: Tasks are grouped by user story. Each task names a file. Classification `spine` unless marked `optional`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependency)
- **[Story]**: US1–US6 from spec.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test runner and shared seed constants. No user-facing Money World yet.

- [ ] T001 Add `pytest` and `httpx` to `[dependency-groups] dev` in `backend/pyproject.toml` and run `uv sync` in `backend/`
- [ ] T002 [P] Create seed constants in `backend/app/seed/budget.py` matching `data-model.md`
- [ ] T003 [P] Create matching constants in `frontend/src/fixtures/budget.ts`
- [ ] T004 [P] Add `Budget` / `CategoryKey` / `BudgetResponse` types in `frontend/src/types.ts`

**Checkpoint**: Seed numbers exist in two files and are identical. Items app still runs.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Persistence, formulas, and contracts that every story uses.

**⚠️ CRITICAL**: Do not start UI stories until T005–T011 pass.

- [ ] T005 Create `Budget` and `BudgetCategory` in `backend/app/models/budget.py`
- [ ] T006 Import the budget model in `backend/alembic/env.py` next to the items import
- [ ] T007 Create Alembic revision after `69fd0530e630` for `budgets` and `budget_categories` under `backend/alembic/versions/`
- [ ] T008 Add Pydantic schemas in `backend/app/schemas/budget.py` matching `contracts/openapi.yaml`
- [ ] T009 Implement `derive_totals`, `ensure_seed`, `update_category`, `reset_budget` in `backend/app/services/budget.py`
- [ ] T010 Write failing-then-passing unit tests in `backend/tests/test_budget_service.py` for seed totals (`remaining == 0`), isolated update, reset, and `overspent`
- [ ] T011 Implement `adjust`, `reset`, `units`, `impactLine`, and derive helpers in `frontend/src/engine/budget.ts` plus tests in `frontend/src/engine/budget.test.ts` (seed remaining 0, Food −100 → remaining 100, units 13→11, no silent savings change)

**Checkpoint**: `cd backend && uv run pytest` and `npm run test` cover formulas. No budget HTTP routes yet.

---

## Phase 3: User Story 1 - Load the seeded month (Priority: P1) 🎯 MVP

**Goal**: `GET /api/budget` seeds and returns the month; the UI header and five labels show exact seed totals.

**Independent Test**: `curl /api/budget` matches the OpenAPI seed example. Browser at 390×844 shows `$0`, `33%`, `May 2026`.

### Tests for User Story 1

- [ ] T012 [P] [US1] Add `GET /api/budget` seed-on-read cases in `backend/tests/test_budget_api.py`

### Implementation for User Story 1

- [ ] T013 [US1] Add `GET /api/budget` in `backend/app/routers/budget.py` and include the router in `backend/app/main.py`
- [ ] T014 [US1] Add `getBudget()` in `frontend/src/api/client.ts`
- [ ] T015 [P] [US1] Create `frontend/src/ui/Header.tsx` (title, month, remaining, savings %)
- [ ] T016 [US1] Rewrite `frontend/src/App.tsx` to load `GET /api/budget`, show loading, render Header + five text district buttons; do not render `ItemForm` / `ItemList`

**Checkpoint**: Live GET path shows correct seed. Items UI is gone from `/`.

---

## Phase 4: User Story 2 - Select and change by $50 (Priority: P1) 🎯 MVP

**Goal**: Tap Food, `−`/`+` persist via PATCH, other categories unchanged, write errors visible.

**Independent Test**: PATCH Food to 550; GET returns remaining 100 and housing 1500. UI `−` twice does the same and survives reload.

### Tests for User Story 2

- [ ] T017 [P] [US2] Add PATCH success, 422 negative, and 404 unknown-key cases in `backend/tests/test_budget_api.py`

### Implementation for User Story 2

- [ ] T018 [US2] Add `PATCH /api/budget/categories/{category_key}` in `backend/app/routers/budget.py`
- [ ] T019 [US2] Add `updateCategory(key, amount)` in `frontend/src/api/client.ts`
- [ ] T020 [P] [US2] Create `frontend/src/ui/Controls.tsx` (selected label, amount, ± ≥44px, impact line, disabled `−` at 0)
- [ ] T021 [US2] Wire selection and live PATCH in `frontend/src/App.tsx`; on failure set `role="alert"` and keep prior budget

**Checkpoint**: Vertical slice works without pixel art.

---

## Phase 5: User Story 3 - World reacts (Priority: P2)

**Goal**: Each district is a labeled, tappable pixel block whose `data-units` equals `floor(amount/50)`.

**Independent Test**: Food 650 → `data-units="13"`; after −$50 → `"12"`.

- [ ] T022 [P] [US3] Create `frontend/src/ui/District.tsx` (`<button>`, labels, `data-units`, min 44×44)
- [ ] T023 [US3] Create `frontend/src/ui/World.tsx` composing five districts and export from `frontend/src/ui/index.ts`
- [ ] T024 [US3] Render `World` from `frontend/src/App.tsx` in place of the US1 text buttons

**Checkpoint**: A $50 change updates a DOM attribute on the chosen district.

---

## Phase 6: User Story 4 - Overspend (Priority: P2)

**Goal**: `remaining < 0` is visible without relying on color alone.

**Independent Test**: PATCH Food to 700 → `overspent: true` and UI shows `Overspent` plus `data-overspent="true"`.

- [ ] T025 [US4] Assert overspend in `backend/tests/test_budget_api.py` when Food is 700
- [ ] T026 [US4] Pass `overspent` into `frontend/src/ui/World.tsx` and `frontend/src/ui/Header.tsx`; show the `Overspent` text only when true

**Checkpoint**: One `+` from seed produces the warning; reducing back to seed clears it.

---

## Phase 7: User Story 5 - Reset (Priority: P2)

**Goal**: Reset restores the seed through the API.

**Independent Test**: Mutate, `POST /api/budget/reset`, GET equals seed. UI Reset + reload matches.

- [ ] T027 [P] [US5] Add reset cases in `backend/tests/test_budget_api.py`
- [ ] T028 [US5] Add `POST /api/budget/reset` in `backend/app/routers/budget.py`
- [ ] T029 [US5] Add `resetBudget()` in `frontend/src/api/client.ts` and a Reset control in `frontend/src/ui/Controls.tsx` wired from `frontend/src/App.tsx` with write-error alerting

**Checkpoint**: Demo is repeatable.

---

## Phase 8: User Story 6 - Offline fallback (Priority: P3)

**Goal**: GET failure or 3000 ms timeout renders the fixture and an Offline banner; local ±/Reset use `engine/budget.ts`. Reload with API up uses the server.

**Independent Test**: `npm run dev:web` only. Seed still appears. Banner visible. Live reload after API start shows server data.

- [ ] T030 [US6] Add timeout/fallback/empty-retry branches in `frontend/src/App.tsx` using `frontend/src/fixtures/budget.ts` and `frontend/src/engine/budget.ts`
- [ ] T031 [US6] Keep write alerts only for live-mode failures; offline writes must not require network

**Checkpoint**: Principle II holds. Backend routes still exist and are used in live mode.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Viewport chrome. Do not rewrite README to claim the feature is shipped until a human delivery pass.

- [ ] T032 Add navy chrome, pixel edges, overspend pulse, and 390px centered frame in `frontend/src/index.css` and `frontend/src/App.tsx`
- [ ] T033 Set `<title>Money World</title>` in `frontend/index.html`
- [ ] T034 Confirm 390×844: no horizontal scroll; `−`/`+`/Reset/districts ≥ 44×44
- [ ] T035 Run `quickstart.md` curl sequence and the 60-second demo path; record pass/fail in the implementation notes (not by editing README)
- [ ] T036 [optional] Stretch only: `POST /api/scenario` — do not start unless US1–US6 pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Immediate
- **Foundational (Phase 2)**: Depends on T001–T004; blocks stories
- **US1 (Phase 3)**: Depends on Phase 2
- **US2 (Phase 4)**: Depends on US1 GET + service update
- **US3 (Phase 5)**: Depends on US2 state (amounts exist to map)
- **US4 (Phase 6)**: Depends on PATCH + World/Header
- **US5 (Phase 7)**: Depends on service reset + Controls
- **US6 (Phase 8)**: Depends on engine + App orchestration
- **Polish**: After US5 at minimum; US6 can land in parallel with polish if staffed

### User Story Dependencies

- **US1**: After Phase 2
- **US2**: After US1
- **US3**: After US2 (needs changing amounts)
- **US4**: After US2 (can start once PATCH returns `overspent`)
- **US5**: After Phase 2 service reset; UI after Controls exist
- **US6**: After engine (T011) and App shell (T016)

### Parallel Opportunities

- T002 / T003 / T004 in parallel
- T015 Header in parallel with T013–T014
- T022 District in parallel with T017–T019
- Backend owner: T005–T013, T017–T018, T025, T027–T028
- Frontend owner: T011, T014–T016, T019–T024, T026, T029–T034

---

## Parallel Example: After Phase 2

```text
Agent A (API): T012 → T013 → T017 → T018 → T027 → T028
Agent B (UI):  T014 → T015 → T016 → T020 → T021 → T022 → T023
```

Integrate on `App.tsx` last to avoid merge fights (Principle VI).

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1–2
2. Phase 3 GET + header
3. Phase 4 PATCH + stepper
4. **STOP**: curl + UI `−` twice + reload
5. Then US3–US5 before visual polish
6. US6 before the demo if wifi is unreliable
7. T036 never blocks acceptance

### Recommended first implementation task

**T001** (pytest/httpx) if the backend owner starts cold, otherwise **T002 + T003** together (seed constants) so every later file has numbers to import.

---

## Notes

- Do not implement `POST /api/scenario` for MVP
- Do not edit `README.md` to say Money World is implemented
- Do not edit `.specify/memory/constitution.md` except via the v1.2.0 PR
- Do not delete items models or `/api/items`
- Preserve `docs/money-world-hackathon-brief.md`
