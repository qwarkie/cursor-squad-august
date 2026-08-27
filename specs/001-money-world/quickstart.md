# Quickstart / evaluation guide: Money World

This is the validation runbook. It describes how the **finished** app must be verified.
The application is **not implemented** on `main` @ `6727981`. Commands that depend on budget routes will fail until implementation.

## Prerequisites

- Node 20+
- `uv` (Python 3.12)
- From repo root

```bash
npm run setup
```

`setup` installs root/frontend/backend dependencies and runs `alembic upgrade head`. After the Money World migration exists, that command creates the budget tables. The first `GET /api/budget` inserts the seed if the table is empty.

## Start

```bash
npm run dev
```

| Surface | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://127.0.0.1:8000 |
| Swagger | http://127.0.0.1:8000/docs |
| Health | http://127.0.0.1:8000/api/health |

Vite proxies `/api` to port 8000. Frontend code uses relative `/api` paths.

Frontend only (fallback testing): `npm run dev:web`  
API only: `npm run dev:api`

## Production build (frontend)

```bash
npm run build
```

Must exit 0. Output: `frontend/dist`.

## Test commands

```bash
npm run test                 # Vitest (must include engine/budget.test.ts)
cd frontend && npx tsc -b    # or npm run typecheck from root
cd backend && uv run pytest  # budget API + service tests (added in implementation)
npm run lint
```

## Evaluator — backend independently

With `npm run dev:api` (or `npm run dev`):

```bash
curl -sS http://127.0.0.1:8000/api/health
# {"status":"ok"}

curl -sS http://127.0.0.1:8000/api/budget
# remaining == 0, food == 650, savings_rate ≈ 0.3333, overspent == false

curl -sS -X PATCH http://127.0.0.1:8000/api/budget/categories/food \
  -H 'Content-Type: application/json' \
  -d '{"amount":550}'
# food == 550, remaining == 100, housing == 1500, overspent == false

curl -sS http://127.0.0.1:8000/api/budget
# same as previous body (persisted)

curl -sS -X PATCH http://127.0.0.1:8000/api/budget/categories/food \
  -H 'Content-Type: application/json' \
  -d '{"amount":-1}'
# HTTP 422

curl -sS -X PATCH http://127.0.0.1:8000/api/budget/categories/flights \
  -H 'Content-Type: application/json' \
  -d '{"amount":100}'
# HTTP 404, detail contains "Unknown category"

curl -sS -X POST http://127.0.0.1:8000/api/budget/reset
# seed amounts restored, remaining == 0
```

Contract details: [contracts/openapi.yaml](./contracts/openapi.yaml).

## Evaluator — frontend-to-backend flow

1. `npm run dev`.
2. Open http://localhost:5173 at **390×844** (DevTools device mode).
3. Confirm no horizontal scrollbar (`scrollWidth <= 390`).
4. Header: `Money World`, `May 2026`, remaining `$0`, savings `33%`.
5. Five labeled districts; Food selected by default or after one tap.
6. Network: first request is `GET /api/budget` → 200.
7. Tap `−` twice on Food. Network: two `PATCH .../food` with `600` then `550`.
8. Header remaining `$100`. Food district `data-units` `13` → `11`.
9. Reload. Food still `$550` (proves persistence).
10. Tap `+` until remaining is negative. `Overspent` visible, `data-overspent="true"`.
11. Tap Reset. Network: `POST /api/budget/reset`. Seed numbers return.

## Fallback if the API is unavailable

1. Stop the API (`dev:web` only, or kill port 8000).
2. Reload the frontend.
3. Offline banner is visible. Seed numbers still render.
4. `−` on Food updates remaining locally.
5. Restart API, reload: server state wins (local offline edits discarded).

## 60-second demo path (deterministic)

Spoken line: “I reduce Food by $100, the market shrinks, remaining goes from $0 to $100.”

| t | Action | Expected |
|---|---|---|
| 0s | Load `/` at 390×844 with API up | Seed totals; GET 200 |
| 10s | Point at header | `$0` left, `33%` saved, May 2026 |
| 15s | Tap Market / Food | Controls: Food `$650` |
| 25s | Tap `−` twice | Food `$550`, remaining `$100`, impact `Food -$100 → Remaining +$100`, units 13→11 |
| 40s | Tap `+` three times | Food `$700`, remaining `-$50`, `Overspent` |
| 50s | Tap `−` once | Remaining `$0`, `Overspent` gone |
| 55s | Tap Reset | Seed restored |
| 60s | Stop talking | Town and numbers match the opening state |

## Deployed architecture (current repo, not this feature)

- `vercel.json`: Vite frontend + FastAPI `app.main:app`, `/api` rewrite.
- Documented URL: https://cursor-squad-august-app.vercel.app — **items starter, stale, not Money World**.
- Push to `main` does not redeploy (issue #5).
- Local `npm run dev` is the canonical evaluator environment until a fresh deploy is approved.

## Environment assumptions

| Variable | Default | Role |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./app.db` | Persistence |
| none for frontend | relative `/api` | Vite proxy / same origin |
