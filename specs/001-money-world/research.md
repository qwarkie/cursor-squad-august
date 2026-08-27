# Research: Money World

**Date**: 2026-08-26  
**Status**: Decisions locked for MVP unless an approval item changes them.

## Decision: Full-stack primary path, fixture fallback

- **Decision**: `GET`/`PATCH`/`POST reset` are the primary demo path. Checked-in fixtures are offline resilience only.
- **Rationale**: Explicit product decision. Evaluator must verify the API independently. Constitution Principle II still requires a no-network result.
- **Alternatives considered**:
  - Client-only + localStorage — contradicts required backend.
  - API-only with no fallback — violates Principle II if venue wifi fails.
  - Dual-write always (localStorage + API) — extra surface, not needed for 90 minutes.

## Decision: Singleton budget, two SQLAlchemy tables

- **Decision**: `budgets` (one row, month `2026-05`) + `budget_categories` (five rows). Derived totals are not stored.
- **Rationale**: Matches “persistent budget and category data model.” Totals computed in the service stay consistent with the spec formulas.
- **Alternatives considered**:
  - JSON column of categories — weaker model, harder to constrain keys.
  - Five amount columns on `budgets` — faster, but less aligned with “category data model” and the items-style entity recipe.

## Decision: Absolute PATCH amount, not delta

- **Decision**: `PATCH /api/budget/categories/{key}` body is `{ "amount": <int> }`.
- **Rationale**: Idempotent, easy to test, matches “exact category values.” UI applies ±50 then sends the new absolute amount.
- **Alternatives considered**: `{ "delta": -50 }` — closer to the button, worse for retries and contract tests.

## Decision: Seed-on-read + explicit reset

- **Decision**: `GET` inserts the seed if no `2026-05` row exists. `POST /api/budget/reset` overwrites amounts (and income) to seed values.
- **Rationale**: Fresh clones work after migrate without a separate seed CLI. Reset is a first-class demo control.
- **Alternatives considered**: Data-only Alembic insert — easy to drift from the TypeScript fixture. Startup event-only seed — harder to test in isolation.

## Decision: Integer USD, display rounding documented

- **Decision**: Store and transport integers. Display percent with `Math.round(rate * 100)` → seed `33%`. Money formatted with grouping, no cents.
- **Rationale**: Brief seed has no cents. Wireframe “30% saved” is not the seed.
- **Alternatives considered**: Cents as integers — unnecessary precision. One-decimal percent — noisier on a 390px header.

## Decision: World intensity = `floor(amount / 50)`

- **Decision**: Each district exposes `data-units` equal to `Math.floor(amount / 50)`. Visual scale/repeat uses that integer.
- **Rationale**: Every UI $50 step changes a measurable DOM property. Avoids “meaningful” as a subjective word.
- **Alternatives considered**: Continuous CSS scale only — harder to evaluate. Literal building counts equal to dollars — unreadable.

## Decision: Keep items API; replace only the `/` UI

- **Decision**: Do not delete `items` models, routes, or components. Stop rendering them from `App.tsx`.
- **Rationale**: README “copy this entity” recipe stays valid. Smaller, safer diff. Items is not the demo path.

## Decision: SQLite is the hackathon database

- **Decision**: Default `DATABASE_URL` remains SQLite. Hosted Postgres is optional for a public URL.
- **Rationale**: User requirement. Existing config already defaults to SQLite. Vercel ephemeral FS is documented, not papered over.
- **Alternatives considered**: Force Postgres everywhere — extra setup, conflicts with “SQLite for the hackathon implementation.”

## Decision: pytest is a necessary new dev dependency

- **Decision**: Add `pytest` and `httpx` to backend `dependency-groups.dev`.
- **Rationale**: No backend tests exist. The spec requires them. This is not a production runtime dependency.
- **Alternatives considered**: Only Vitest — cannot exercise FastAPI. Manual curl as the only backend test — not agent-repeatable.

## Decision: No AI scenario in MVP

- **Decision**: `POST /api/scenario` is specified as stretch in OpenAPI (`x-optional: true`) but must not be implemented to pass MVP.
- **Rationale**: Brief and user: stretch must not block.

## Decision: Do not amend constitution.md in this phase

- **Decision**: Record the required v1.2.0 text in `constitution-amendment-v1.2.0.md`. Apply only via PR per Governance.
- **Rationale**: Amendment procedure is explicit. Spec authority may propose; the file is not silently rewritten.
