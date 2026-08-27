# Feature Specification: Money World

**Feature Branch**: `001-money-world`

**Created**: 2026-08-26

**Status**: Specified — not implemented

**Input**: Product vision in `docs/money-world-hackathon-brief.md`, validated against the existing React/Vite/FastAPI repository, constitution v1.1.1, and the explicit product decision that the backend is required.

**Implementation state**: The application on `main` @ `6727981` is the items CRUD starter. Nothing in this specification is claimed to be shipped.

## User Scenarios & Testing *(mandatory)*

Primary actor: a first-time visitor on a phone-sized viewport. No account, no onboarding.

### User Story 1 - Load the seeded month and read exact totals (Priority: P1)

A visitor opens the app. Within one load they see May 2026, the five budget districts, remaining money `$0`, and savings rate `33%`, sourced from the backend seed. They do not complete a sign-in or setup flow.

**Why this priority**: Every later story depends on a correct, server-backed opening state. If the seed totals are wrong, the demo is false.

**Independent Test**: Start API + frontend from a migrated SQLite database. Open `/`. Assert header values and five labeled districts without touching controls.

**Acceptance Scenarios**:

1. **Given** a migrated database with no budget row, **When** the visitor loads the app (which calls `GET /api/budget`), **Then** the server inserts the deterministic seed and the UI shows month `May 2026`, remaining `$0`, savings `33%`, and category amounts Housing `$1,500`, Food `$650`, Transport `$350`, Entertainment `$300`, Savings `$1,400`.
2. **Given** the seed already exists, **When** the visitor reloads, **Then** the same numbers appear and a second budget row is not created.
3. **Given** the API has not yet responded, **When** the visitor first lands, **Then** a visible loading state is shown and no category amount is displayed as a guessed number.

---

### User Story 2 - Select a district and change its amount by $50 (Priority: P1)

The visitor taps Food. The bottom controls identify Food and `$650`. They tap `−` twice. Food becomes `$550`. Remaining becomes `$100`. Housing, Transport, Entertainment, and Savings stay exactly as they were. The change is persisted by the API and survives reload.

**Why this priority**: This is the functional vertical slice and the spoken demo: change one expense, watch remaining money respond.

**Independent Test**: `GET /api/budget`, `PATCH` Food to `550`, `GET` again. Then repeat from the UI at 390×844. Reload and confirm Food is still `550`.

**Acceptance Scenarios**:

1. **Given** the seed budget and no district selected yet, **When** the visitor taps the Food district, **Then** the controls show `Selected: Food` and `$650`, and the Food district is the only selected district.
2. **Given** Food is selected at `$650`, **When** the visitor taps `−` once, **Then** the UI sends `PATCH /api/budget/categories/food` with `{ "amount": 600 }`, and after a `200` response Food is `$600`, remaining is `$50`, and every other category amount is unchanged.
3. **Given** Food is `$0`, **When** the visitor views the `−` control, **Then** `−` is disabled, no request is sent, and Food stays `$0`.
4. **Given** a live API, **When** `PATCH` fails, **Then** a `role="alert"` message shows the server’s error text and on-screen amounts do not change.

---

### User Story 3 - See the world react to the new amount (Priority: P2)

After Food changes, the Market district’s visible unit count decreases and the header remaining value updates in the same paint as the new amount. The visitor can point at the market and the remaining number without opening a table.

**Why this priority**: The product thesis is the visual mapping. Without a measurable world change, this is a form with decoration.

**Independent Test**: Record `data-units` on the Food district before and after a `$50` decrease. The attribute must change by exactly `1`.

**Acceptance Scenarios**:

1. **Given** Food is `$650` (`data-units="13"`), **When** Food becomes `$600`, **Then** the Food district’s `data-units` is `"12"` and its visible label still includes `Food` and the exact amount.
2. **Given** a category amount of `$0`, **When** that district is rendered, **Then** `data-units="0"` and the district remains tappable and labeled.

---

### User Story 4 - Recognize and recover from overspending (Priority: P2)

The visitor taps `+` on Food from the seed. Remaining becomes `−$50`. The world enters a warning state that does not depend on color alone. Reducing Food (or another category) until remaining is `≥ $0` clears the warning.

**Why this priority**: The brief’s failure mode is the most memorable contrast in the demo.

**Independent Test**: `PATCH` Food to `700`. Response has `remaining: -50`, `overspent: true`. UI shows warning text `Overspent`. `PATCH` Food to `650`. Warning is absent.

**Acceptance Scenarios**:

1. **Given** the seed (`remaining = 0`), **When** any category increases by `$50`, **Then** `overspent` is `true`, remaining displays as `−$50`, and a visible `Overspent` label is present on the world and/or header.
2. **Given** an overspent budget, **When** amounts are reduced so remaining is `0` or greater, **Then** `overspent` is `false` and the `Overspent` label is not in the document.

---

### User Story 5 - Reset the town to the seed (Priority: P2)

After experimenting, the visitor taps Reset. Every category, remaining, savings rate, world units, and overspend flag return to the seed. The next visitor (or the next demo take) starts from the same numbers.

**Why this priority**: The demo must be repeatable in under a minute.

**Independent Test**: Mutate Food, then `POST /api/budget/reset`. Body matches the seed. UI Reset produces the same result after reload.

**Acceptance Scenarios**:

1. **Given** any persisted budget, **When** the visitor taps Reset and the API returns `200`, **Then** all seed amounts and derived totals are shown.
2. **Given** Reset fails, **When** the error returns, **Then** a `role="alert"` is shown and the previous amounts remain.

---

### User Story 6 - Keep exploring when the API is down (Priority: P3)

If `GET /api/budget` fails or does not settle within 3000 ms, the UI renders the checked-in fixture, shows an offline banner, and still allows `−` / `+` / Reset against in-memory state. This path is resilience, not a substitute for the backend.

**Why this priority**: Constitution Principle II. It is required for venue-wifi failure, but MVP acceptance still requires the live API path (US1–US5) to exist and pass.

**Independent Test**: Stop the API, reload the frontend. Fixture totals match the seed. `−` on Food updates remaining locally. Banner text is visible. Restart API, reload: live data from the server replaces local edits.

**Acceptance Scenarios**:

1. **Given** the API is unreachable, **When** the visitor loads the app, **Then** the offline banner is visible, seed numbers render from the fixture, and no `role="alert"` claims a fatal load failure.
2. **Given** offline mode, **When** the visitor changes Food, **Then** remaining updates locally and no successful `PATCH` is required.
3. **Given** offline local edits, **When** the visitor reloads with the API healthy, **Then** the UI displays the server budget, not the discarded local edits.

---

### User Story 7 - Natural-language scenario (Priority: P4, stretch)

The visitor types “What if I spend $900 on a trip?” and previews a structured category change before applying it.

**Why this priority**: Brief stretch only. Must not block MVP.

**Independent Test**: Not required for MVP acceptance.

**Acceptance Scenarios**:

1. **Given** stretch is implemented, **When** a scenario is returned, **Then** the UI shows a preview and changes the budget only after an explicit Apply action.

---

### Edge Cases

- `−` at `$0`: control disabled; no request.
- `+` has no maximum; remaining may be any negative integer multiple of `$50` reachable from the UI.
- `PATCH` amount that is not a multiple of 50 (API-only): accepted if it is an integer `≥ 0`; UI never produces this value.
- Non-integer, negative, or missing `amount`: `422`.
- Unknown category key: `404`.
- `GET` when the table is empty: seed-on-read, then `200`.
- Concurrent tabs: last successful write wins; no locking UI.
- Savings is a category. Reducing Food must not increase Savings. Remaining absorbs the difference.
- Income is not editable in MVP.
- Desktop widths `> 390px`: the phone frame stays 390px wide and centered; the page background may fill the viewport; the frame itself does not grow.

## Requirements *(mandatory)*

Canonical IDs use the `MW-*` prefix. `FR-*` aliases exist so Spec Kit section names stay intact. The matrix in `traceability.md` is authoritative for verification.

### Functional Requirements

- **FR-001 / MW-PROD-001**: The product is a single-month visual budget sandbox. The first view is the world and totals. There is no onboarding, auth, or empty-start wizard.
- **FR-002 / MW-PROD-002**: The demonstrated month is May 2026 (`2026-05`).
- **FR-003 / MW-PROD-003**: Exactly five districts exist, keys `housing`, `food`, `transport`, `entertainment`, `savings`.
- **FR-004 / MW-PROD-004**: The primary journey is tap district → change amount → header and world update from the returned budget.
- **FR-005 / MW-FE-019**: The primary path uses the backend: load via `GET /api/budget`, adjust via `PATCH /api/budget/categories/{key}`, reset via `POST /api/budget/reset`.
- **FR-006 / MW-BE-005**: The server is the source of derived totals. The client displays `remaining`, `savings_rate`, `total_allocated`, and `overspent` from the last successful `BudgetResponse` (or from the local engine when, and only when, offline).
- **FR-007 / MW-DATA-013**: Updating one category MUST NOT change any other category’s stored amount.
- **FR-008 / MW-PROD-008**: The natural-language AI scenario is stretch (`optional`). MVP acceptance does not require it.

### Key Entities

- **Budget**: One monthly plan. Fields: month, income, updated timestamp, derived totals.
- **Category**: One of five named allocations belonging to that budget. Fields: key, amount.
- **BudgetResponse**: The API/UI document that includes stored fields plus `total_allocated`, `remaining`, `savings_rate`, `overspent`.
- **SeedBudget**: The immutable checked-in constant set defined under Financial Rules.

## Financial Rules *(normative)*

All money values are **integer United States dollars**. There are no cents in storage, API payloads, or UI controls.

| Name | Value |
|---|---|
| income | `4200` |
| housing | `1500` |
| food | `650` |
| transport | `350` |
| entertainment | `300` |
| savings | `1400` |

Formulas (integer arithmetic except savings rate):

- `total_allocated = housing + food + transport + entertainment + savings`
- `remaining = income - total_allocated`
- Seed `total_allocated = 4200`
- Seed `remaining = 0`
- `savings_rate = savings / income` (exact rational; seed is `1400 / 4200 = 1/3`)
- `overspent = remaining < 0`
- Category amounts MUST be integers `≥ 0`
- UI steps are exactly `$50`
- Changing one category does not silently change another
- Reset writes the seed amounts and seed income

### Rounding and formatting

| Surface | Rule | Seed example |
|---|---|---|
| API money fields | JSON numbers that are integers (no fractional part) | `1400` |
| API `savings_rate` | JSON number, exact `savings / income`, at least 4 decimal places when serialized (`0.3333`) | `0.3333` |
| UI money | `$` + groups of three digits; hyphen-minus for negative remaining (`−$50` U+2212 or ASCII `-` prefixed as `-$50`). No cents. | `$1,400`, `$0`, `-$50` |
| UI savings rate | nearest integer percent, half-away-from-zero / `Math.round(savings_rate * 100)` | `33%` |
| Impact line | `{Label} {+/−}${abs(delta)} → Remaining {+/−}${abs(remainingDelta)}` | `Food -$100 → Remaining +$100` |

The brief wireframe’s “30% saved” is layout copy only. The seed rate is **33%**, not 30%.

## World visual mapping *(normative for meaning, measured via `data-units`)*

Each district MUST remain labeled with its category name and exact formatted amount. Color is never the only signal (MW-FE-017). The **observable** change for evaluators is `data-units = floor(amount / 50)`. The **visible** change MUST use that integer so a $50 UI step is noticeable:

| Key | District label | Visual at higher `data-units` | Seed units |
|---|---|---|---|
| housing | Homes | More or larger house shapes | 30 |
| food | Market | More or larger stall/market shapes | 13 |
| transport | Roads | More road segments; a car/activity mark if units > 0 | 7 |
| entertainment | Park | More attraction or light shapes | 6 |
| savings | Vault | Larger vault; more tree/green marks | 28 |

Overspend (remaining < 0): world root `data-overspent="true"`, visible `Overspent` text, and a CSS pulse. Cracks or a storm cloud are optional polish on top of that flag.

Income is not user-editable. It does not require its own district. Remaining is the headline treasury number (MW-FE-005). A decorative coin spring is optional polish.

MVP bottom controls stay expanded (always visible). Collapsing the sheet is optional polish and must not hide `−` / `+` / Reset. Those actions sit in the lower half of the 390×844 frame.

## Requirement catalog

Classification: `required` = MVP. `optional` = stretch or resilience that must not hide a missing backend.

### Product (`MW-PROD-*`)

| ID | Statement | Acceptance condition | Surface | Verify | Class |
|---|---|---|---|---|---|
| MW-PROD-001 | No onboarding | First paint after load is the world screen | `frontend/src/App.tsx` | Viewport walk | required |
| MW-PROD-002 | Month is May 2026 | Visible text includes `May 2026` | Header | Viewport + GET `month` | required |
| MW-PROD-003 | Five districts only | Exactly those five keys rendered | World | DOM count | required |
| MW-PROD-004 | Tap → adjust → update | One Food decrement changes Food and remaining | App + API | Demo path | required |
| MW-PROD-005 | Impact line after a change | Text matches the format above for the last delta | Controls | DOM text | required |
| MW-PROD-006 | Overspend is obvious | `Overspent` visible iff `remaining < 0` | World/Header | DOM + API flag | required |
| MW-PROD-007 | Reset restores seed | After Reset, amounts equal the table above | Reset + API | GET after POST | required |
| MW-PROD-008 | AI scenario is stretch | MVP checklist has no failing AI item | n/a | Review | optional |
| MW-PROD-009 | 60-second demo script | Script in `quickstart.md` is executable | Docs + app | Rehearsal | required |

### Frontend (`MW-FE-*`)

| ID | Statement | Acceptance condition | Surface | Verify | Class |
|---|---|---|---|---|---|
| MW-FE-001 | Keep React 19 + TS + Vite + Tailwind | No Next.js, no added game engine, no new runtime UI library | `frontend/package.json` | Diff | required |
| MW-FE-002 | Single screen | One route: `/` only | `App.tsx` | No router | required |
| MW-FE-003 | 390×844 usable, no horizontal scroll | `document.documentElement.scrollWidth <= 390` at 390×844 | Layout | Browser | required |
| MW-FE-004 | Desktop phone frame | At 1280×800 the interactive column is 390px wide and centered | Layout | Browser | required |
| MW-FE-005 | Header metrics | Shows title `Money World`, `May 2026`, formatted remaining, formatted savings rate | Header | DOM | required |
| MW-FE-006 | Tappable districts | Each district is a `<button>` (or `role="button"`) with its category label | World | DOM | required |
| MW-FE-007 | Selected controls | Controls show selected label and exact formatted amount | Controls | DOM | required |
| MW-FE-008 | $50 stepper | `−` and `+` change amount by 50 via PATCH (live) or engine (offline) | Controls | Network + state | required |
| MW-FE-009 | Touch targets | `−`, `+`, Reset, and each district ≥ 44×44 CSS pixels | CSS | Computed style | required |
| MW-FE-010 | World units | `data-units={floor(amount/50)}` on each district | World | DOM attr | required |
| MW-FE-011 | Overspend presentation | World root `data-overspent="true"` and visible `Overspent` text when overspent | World | DOM | required |
| MW-FE-012 | Reset control | Visible Reset control ≥ 44×44 | Controls | DOM | required |
| MW-FE-013 | Loading state | `Loading` text (or equivalent) until first settle | App | First paint | required |
| MW-FE-014 | Write errors | Failed live PATCH/Reset → `role="alert"` with server detail; amounts unchanged | App | Forced 422 | required |
| MW-FE-015 | Offline banner | Unreachable GET → banner containing `Offline`; fixture rendered | App | API down | required |
| MW-FE-016 | Empty+retry | If GET fails and fixture cannot be imported, show `No budget available` and Retry | App | Fault injection | required |
| MW-FE-017 | Labels not color-only | Each district shows a text name in addition to color | World | DOM | required |
| MW-FE-018 | Pixel direction, no engine | CSS/SVG/emoji-like pixel shapes only; no Three.js, Phaser, Pixi | deps + CSS | Diff | required |
| MW-FE-019 | Live path is default | Healthy API: mode `live`, writes hit `/api/budget*` | App | Network log | required |
| MW-FE-020 | Fallback uses engine | Offline ± and Reset call the same pure functions the tests cover | `engine/budget.ts` | Unit tests | required |
| MW-FE-021 | Items UI not demo | `ItemForm` / `ItemList` are not rendered on `/` | `App.tsx` | DOM | required |

### Backend (`MW-BE-*`)

| ID | Statement | Acceptance condition | Surface | Verify | Class |
|---|---|---|---|---|---|
| MW-BE-001 | `GET /api/budget` | `200` + `BudgetResponse` | router | pytest | required |
| MW-BE-002 | `PATCH /api/budget/categories/{key}` | `200` + persisted amount, others unchanged | router | pytest | required |
| MW-BE-003 | `POST /api/budget/reset` | `200` + seed amounts | router | pytest | required |
| MW-BE-004 | `GET /api/health` | `200` `{"status":"ok"}` | existing | pytest/curl | required |
| MW-BE-005 | Server-derived totals | Response totals equal the formulas; client-supplied totals are ignored | service | pytest | required |
| MW-BE-006 | Amount validation | `amount` missing / non-integer / `< 0` → `422` | schema | pytest | required |
| MW-BE-007 | Unknown category | `PATCH .../flights` → `404` with detail `Unknown category` | router | pytest | required |
| MW-BE-008 | Seed-on-read | Empty table + GET inserts seed and returns it | service | pytest | required |
| MW-BE-009 | SQLAlchemy model | `Budget` + `BudgetCategory` (or equivalent two-table model) persisted | models | migration | required |
| MW-BE-010 | Alembic revision | New revision after `69fd0530e630` creates the tables | `alembic/` | `upgrade head` | required |
| MW-BE-011 | SQLite default | `DATABASE_URL` unset → `sqlite:///./app.db` | config | existing | required |
| MW-BE-012 | Income read-only | No MVP endpoint accepts a new income | OpenAPI | contract review | required |
| MW-BE-013 | Items API retained | Existing `/api/items` keeps working | items router | existing smoke | required |
| MW-BE-014 | Useful errors | `422`/`404` bodies use FastAPI `detail` (string or validation array) | schemas | pytest | required |

### Data (`MW-DATA-*`)

| ID | Statement | Acceptance condition | Surface | Verify | Class |
|---|---|---|---|---|---|
| MW-DATA-001 | Seed constants | Values match the Financial Rules table | seed + fixture | pytest + vitest | required |
| MW-DATA-002 | Formulas | `remaining`, `total_allocated`, `overspent`, `savings_rate` match formulas | engine + service | unit tests | required |
| MW-DATA-003 | Non-negative amounts | DB/API reject `< 0` | schema + DB | pytest | required |
| MW-DATA-004 | Integer dollars | No fractional money stored | schema | pytest | required |
| MW-DATA-005 | Singleton month | At most one budget row for `2026-05` | model unique | pytest | required |
| MW-DATA-006 | Fixture parity | `frontend/src/fixtures/budget.ts` constants === backend seed | both files | review + tests | required |
| MW-DATA-007 | Category enum | Only the five keys | model + OpenAPI | pytest | required |

### Deployment (`MW-DEPLOY-*`)

| ID | Statement | Acceptance condition | Surface | Verify | Class |
|---|---|---|---|---|---|
| MW-DEPLOY-001 | Local full stack | `npm run setup && npm run dev` serves UI `:5173` and API `:8000` | scripts | manual | required |
| MW-DEPLOY-002 | Migrate + seed | `npm run migrate` then GET seeds | alembic + GET | curl | required |
| MW-DEPLOY-003 | Production frontend build | `npm run build` exits 0 | frontend | CI-local | required |
| MW-DEPLOY-004 | Two-service Vercel file | Existing `vercel.json` frontend + `/api` backend remains the deploy shape | `vercel.json` | review | required |
| MW-DEPLOY-005 | Evaluator API path | `quickstart.md` curl sequence succeeds against `:8000` | docs + API | curl | required |
| MW-DEPLOY-006 | Health | `/api/health` is `200` when API is up | main.py | curl | required |
| MW-DEPLOY-007 | Live URL caveat | Spec does not claim `cursor-squad-august-app.vercel.app` already serves Money World | this spec | review | required |
| MW-DEPLOY-008 | SQLite vs host | Local/eval persistence is SQLite. Hosted serverless filesystems may lose writes; seed-on-read still makes GET succeed | plan.md | review | required |

### Testing (`MW-TEST-*`)

| ID | Statement | Acceptance condition | Surface | Verify | Class |
|---|---|---|---|---|---|
| MW-TEST-001 | Backend happy path | GET seed, PATCH isolate, POST reset | `backend/tests/` | pytest | required |
| MW-TEST-002 | Backend invalid path | 422 and 404 cases | `backend/tests/` | pytest | required |
| MW-TEST-003 | Frontend engine | remaining, overspend, ±50, reset, units | `frontend/src/engine/budget.test.ts` | vitest | required |
| MW-TEST-004 | Commands | Backend tests run via a documented `pytest` invocation; frontend via `npm run test` | README later / quickstart now | command | required |
| MW-TEST-005 | No false shipped claims | README still describes the starter until delivery | `README.md` | review | required |

## Non-functional requirements

- **MW-NFR-001**: At 390×844, essential controls (districts, stepper, Reset) are reachable without horizontal scrolling.
- **MW-NFR-002**: After a successful PATCH, the next paint that shows the new amount also shows the new remaining and new `data-units` (no second user action).
- **MW-NFR-003**: GET/PATCH/Reset complete in under 2000 ms on local `npm run dev` against SQLite.
- **MW-NFR-004**: No authentication header is required.
- **MW-NFR-005**: No new production runtime dependency beyond pytest/httpx for backend tests and existing frontend packages.
- **MW-NFR-006**: Pixel assets use `image-rendering: pixelated` if bitmaps are added; CSS shapes are acceptable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new visitor reaches correct seed totals without signing in.
- **SC-002**: Reducing Food by `$100` from seed yields Food `$550` and remaining `$100` after reload.
- **SC-003**: At 390×844 the layout has no horizontal scrollbar and every listed control is ≥ 44×44.
- **SC-004**: An evaluator can prove the backend independently with the `quickstart.md` curl sequence (GET, PATCH, GET, reset) and matching JSON.
- **SC-005**: With the API stopped, the visitor can still complete tap → `−` → remaining change on fixture data, with the offline banner visible.
- **SC-006**: A colleague following `quickstart.md` (not tribal knowledge) completes the 60-second demo path.

## Out of scope

- Bank connections, imports, auth, multi-user, multi-month, forecasting, currency conversion, debt, investments
- Native iOS/Android apps
- Three.js / game engines / free-roam / quests
- Production security audit and full a11y audit
- GitHub Actions CI (workflow-scope wall; not spine)
- Claiming the current Vercel URL already hosts Money World
- Replacing or deleting the items FastAPI example (it stays; it is not the demo)
- Updating the public README to say Money World is implemented (delivery phase)

## Assumptions

- One anonymous shared budget is acceptable for the hackathon (no user id).
- Default selected district on first interactive frame after load is `food`.
- Bottom controls stay expanded in MVP so the stepper remains visible without an extra gesture.
- UI minus/plus always send an absolute `amount`, not a delta.
- `Math.round` for the displayed percent is acceptable; seed shows `33%`.
- Impact line uses ASCII `-`/`+` and `$` as in `Food -$100 → Remaining +$100` if U+2212 is inconvenient.
- Items starter code remains in the repo unused by `/`.
- `pytest` + `httpx` may be added to backend dev dependencies; this is required for MW-TEST-001.
- Constitution v1.1.1 currently forbids a live-API demo path. This spec **requires** that path and records a v1.2.0 amendment for approval rather than silently editing governance.
- Hosted Postgres may already exist behind the stale Vercel URL. Local evaluation uses SQLite regardless.

## Open decisions (approval required)

See also `constitution-amendment-v1.2.0.md`.

1. **Constitution v1.2.0**: Approve a PR that puts FastAPI on the production demo path while keeping the offline fixture as fallback (Principle II intact). Until merged, implementers treat this spec as the product contract and the constitution clause as a documented conflict.
2. **Hosted persistence**: For a public URL, accept seed-on-read SQLite (writes may vanish on serverless) **or** require `DATABASE_URL` Postgres so PATCH survives cold starts.
3. **Landing branch**: After documentation approval, implement on `001-money-world` (recommended) versus committing directly to `main`.

No other product behavior is left unspecified for MVP.
