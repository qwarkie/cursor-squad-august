# Implementation Plan: Money World

**Branch**: `001-money-world` (docs currently written on `main` @ `6727981`) | **Date**: 2026-08-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-money-world/spec.md`

**Note**: Documentation only. Application source is unchanged.

## Summary

Replace the items CRUD **user-facing demo** with a single-screen Money World app that loads and mutates one monthly budget through FastAPI + SQLAlchemy + SQLite. The visual town is CSS/SVG pixel districts whose `data-units` equal `floor(amount / 50)`. A checked-in fixture and pure `engine/budget.ts` provide offline resilience. They must not replace the backend.

## Technical Context

**Language/Version**: TypeScript 5.7 (frontend), Python 3.12 (backend)

**Primary Dependencies**: React 19, Vite 7, Tailwind 4, FastAPI, SQLAlchemy 2, Alembic, Pydantic v2. Add `pytest` + `httpx` as backend **dev** dependencies only.

**Storage**: SQLite at `backend/app.db` (hackathon default). Existing `DATABASE_URL` Postgres rewrite stays for hosted deploys.

**Testing**: Vitest (existing `npm run test`). Pytest for new backend tests (`cd backend && uv run pytest`).

**Target Platform**: Mobile-first web, primary viewport 390×844. Desktop uses a 390px centered frame.

**Project Type**: Existing full-stack web app in `frontend/` + `backend/`.

**Performance Goals**: Local GET/PATCH/Reset < 2000 ms. World and header update on the same response as the write.

**Constraints**: No framework change. No auth. No game engine. No new production runtime UI library. Constitution Principle II fallback required. Constitution “backend off demo path” is a **documented conflict** (see Constitution Check).

**Scale/Scope**: One singleton budget, five categories, one screen, one 90-minute implementation window after docs approval.

## Constitution Check

*GATE: Re-checked after Phase 1 design.*

| Principle / constraint | Result | Notes |
|---|---|---|
| I. Demo Path Integrity | Pass once implemented | Demo path is defined in `quickstart.md`. Until then `main` still demos items — this spec does not claim otherwise. |
| II. Deterministic Fallback | Pass by design | Fixture + engine offline mode. Fallback must not ship without the API. |
| III. Stranger-claimable tasks | Pass | `tasks.md` names files and checks. |
| IV. Functional completeness | Pass | Slice is tap → PATCH → totals/world, then polish. |
| V. Cut early | Pass | AI scenario is optional. Sprite sheets are optional. |
| VI. Single owned surface | Pass for tasking | Tasks are tagged engine / UI / API / docs. Multi-surface integration is a later task, not a first commit. |
| Stack is fixed | Pass | React + Vite + Tailwind + FastAPI. |
| **Backend is not on the production demo path** | **FAIL (justified)** | Product decision and this spec require FastAPI on the primary path. See Complexity Tracking and `constitution-amendment-v1.2.0.md`. **Not silently ignored. Not applied** — amendment needs a PR. |
| Live deployment is on the demo path | Conditional | URL exists but serves items and is stale (#5). Spec forbids claiming it is Money World. |
| README quickstart is a claim | Pass | README is **not** updated in this phase. |
| Fixtures checked in | Pass | Seed + `frontend/src/fixtures/budget.ts`. |
| Write failures visible | Pass | MW-FE-014. |

## Project Structure

### Documentation (this feature)

```text
specs/001-money-world/
├── README.md
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/openapi.yaml
├── tasks.md
├── traceability.md
├── constitution-amendment-v1.2.0.md
└── checklists/requirements.md
```

### Source Code (repository — target after implementation)

```text
backend/
  app/
    main.py                 # include budget router (items router stays)
    models/budget.py        # Budget, BudgetCategory
    schemas/budget.py       # request/response
    routers/budget.py       # GET / PATCH / POST reset
    services/budget.py      # seed, totals, update, reset
    seed/budget.py          # SEED constants
  alembic/versions/         # new revision after 69fd0530e630
  tests/
    test_budget_api.py
    test_budget_service.py
frontend/
  src/
    main.tsx                # unchanged entry
    App.tsx                 # Money World composition (replaces items UI)
    api/client.ts           # add budget methods; keep items methods
    types.ts                # add Budget types
    fixtures/budget.ts      # seed fixture
    engine/budget.ts        # pure totals / step / reset / units
    engine/budget.test.ts
    ui/Header.tsx
    ui/World.tsx
    ui/District.tsx
    ui/Controls.tsx
    index.css               # navy chrome, pixel edges, overspend pulse
```

**Structure Decision**: Keep the existing monorepo layout. Follow the items entity recipe in the README (model → alembic import → schema → router → `main.py` → frontend types/client). Do not introduce `src/` at repo root.

## System architecture

```text
[Browser 390×844]
    │  GET/PATCH/POST /api/budget*
    ▼
[Vite :5173]  --proxy /api-->  [Uvicorn :8000 FastAPI]
                                    │
                                    ▼
                              [SQLAlchemy]
                                    │
                                    ▼
                              [SQLite app.db]
```

Primary mode: `live`. Offline mode is entered only when GET fails or exceeds 3000 ms.

### Frontend component responsibilities

| Component | Owns | Must not own |
|---|---|---|
| `App.tsx` | mode, load, write orchestration, error/offline/empty | pixel drawing, SQL |
| `ui/Header.tsx` | title, month, remaining, savings %, overspent text | fetching |
| `ui/World.tsx` | district grid, `data-overspent`, town-level pulse | amount math |
| `ui/District.tsx` | one tappable district, `data-units`, labels | API |
| `ui/Controls.tsx` | selection, amount, ±, impact, Reset | persistence |
| `engine/budget.ts` | formulas, ±50, reset, units, impact string | I/O |
| `fixtures/budget.ts` | seed constants for offline | |
| `api/client.ts` | HTTP + `ApiError` | UI |

### Backend responsibilities

| Module | Owns |
|---|---|
| `models/budget.py` | tables and relationships |
| `schemas/budget.py` | validation, `BudgetResponse` |
| `services/budget.py` | seed-on-read, isolate updates, derive totals, reset |
| `routers/budget.py` | HTTP mapping and status codes |
| `seed/budget.py` | single source of seed numbers on the server |
| Alembic revision | create tables |
| `tests/` | MW-TEST-001/002 |

### State and data flow

1. Mount → `loading=true` → `GET /api/budget`.
2. `200` → `mode=live`, store `BudgetResponse`, `loading=false`.
3. Failure/timeout → `mode=offline`, store fixture-derived budget, show banner.
4. Tap district → `selectedKey` only (no fetch).
5. Tap `−`/`+` (live) → compute `next = amount ± 50` (skip if `next < 0`) → `PATCH` → replace state with response **or** alert and keep prior state.
6. Tap `−`/`+` (offline) → `engine.adjust(budget, key, ±50)` → set state.
7. Reset live → `POST /api/budget/reset` → replace state or alert.
8. Reset offline → `engine.reset()` → seed fixture.
9. Reload in live mode always prefers server state (offline edits discarded).

## Error and fallback behavior

| Event | HTTP | UI |
|---|---|---|
| GET success | 200 | live |
| GET network / 5xx / >3000 ms | n/a | offline + fixture + banner |
| GET 404 (should not happen after seed-on-read) | 404 | treat as GET failure → offline |
| PATCH 422/404/5xx | those | `role="alert"`, keep prior budget |
| Reset failure | 4xx/5xx | `role="alert"`, keep prior budget |
| Fixture import failure after GET failure | n/a | empty + Retry |

Fallback is demo resilience. An implementation that only has the fixture and no FastAPI budget routes **fails** this plan.

## Deployment design

- **Local (canonical evaluation)**: SQLite, `npm run setup`, `npm run dev`, Vite proxy `/api`.
- **Production file**: existing two-service `vercel.json` (frontend Vite, backend `app.main:app`, `/api` rewrite).
- **Known gap**: live URL https://cursor-squad-august-app.vercel.app is **not** Money World and does not auto-deploy (#5).
- **SQLite on Vercel**: filesystem is ephemeral. Seed-on-read makes GET succeed on a cold instance; PATCH may not survive the next instance. Local SQLite is the persistence evaluator must use unless approval item 2 chooses Postgres for the public URL.
- **Env**: `DATABASE_URL` optional (default SQLite). `cors_origins` already includes `http://localhost:5173`.
- **Health**: `GET /api/health`.
- **README**: do not claim Money World is shipped until delivery.

## Testing strategy

1. **Backend unit**: derive totals; seed-on-read; isolated PATCH; reset.
2. **Backend API**: httpx `TestClient` against the OpenAPI cases in `contracts/openapi.yaml`.
3. **Frontend unit**: `engine/budget.ts` (same formulas as the server).
4. **Manual integration**: `quickstart.md` curl + 390×844 walk.
5. **No CI spine**: do not add GitHub Actions as a required task.

## Implementation plan (phase order)

1. Backend seed, model, migration, service, routes, pytest (US1 read path).
2. Frontend types, client methods, engine, Header wired to GET (US1).
3. Controls ± and PATCH (US2).
4. World `data-units` + labels (US3).
5. Overspend flag + Reset (US4–US5).
6. Offline fallback (US6).
7. Chrome/CSS. README updates wait for delivery.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Constitution: “backend is not on the production demo path” | Product owner required FastAPI + SQLAlchemy + seed + reset as the primary flow | Client-only fixtures would hide the required backend and fail evaluator API checks |
| Adding pytest/httpx | MW-TEST-001/002; no backend test runner exists | Manual curl-only verification is not repeatable for agents |
