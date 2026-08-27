# cursor-squad-august

Starter base: **React 19 + TypeScript + Vite + Tailwind** on the front end,
**FastAPI + SQLAlchemy + Alembic** on the back end.
Ships with one working CRUD example (`items`) to copy as a template for your own entities.

## Requirements

- Node 20+
- [uv](https://docs.astral.sh/uv/) — manages Python and backend dependencies (downloads Python 3.12 itself)

## Getting started

```bash
npm run setup  # installs root/frontend/backend deps and applies migrations
npm run dev    # starts the API and the front end together
```

- Front end: http://localhost:5173
- API: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/docs

In development Vite proxies `/api` to the backend, so CORS never gets in the way
and the front end uses relative paths.

## Layout

```
backend/
  app/
    main.py          entry point, router wiring, CORS
    config.py        settings from the environment (pydantic-settings)
    db.py            engine, session, Base
    models/item.py   example SQLAlchemy model
    schemas/item.py  Pydantic request and response schemas
    routers/items.py CRUD endpoints
  alembic/           migrations
frontend/
  src/
    api/client.ts    fetch wrapper that unpacks FastAPI errors
    types.ts         TS types mirroring the backend schemas
    components/      ItemForm, ItemList
    App.tsx          page composition and state handling
```

## Database

SQLite by default — the file lives at `backend/app.db`, so nothing needs to be provisioned.
Moving to Postgres takes an environment variable, not a code change:

```bash
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/cursor_squad
```

Add `psycopg[binary]` to the backend dependencies and apply the migrations.

## Deployment

Live: **https://cursor-squad-august-app.vercel.app**

`vercel.json` declares two services behind one domain — the Vite build at `/` and
the FastAPI app at `/api`, so the front end keeps using relative paths in production
exactly as it does behind the dev proxy.

SQLite does not survive on Vercel: the filesystem is recreated per request. Set
`DATABASE_URL` to a hosted Postgres connection string in the project's environment
variables. A bare `postgres://` URL is rewritten to the psycopg driver in
`app/config.py`, so the string a provider hands out works unchanged.

> **Known gap.** The Vercel project is not linked to this repository, so a push to
> `main` does **not** redeploy — deploys are manual today, and the live front end can
> lag `main`. Tracked in [#5](https://github.com/qwarkie/cursor-squad-august/issues/5).
> Verify the live URL before relying on it.

## Adding your own entity

1. Model in `backend/app/models/`, following `item.py`
2. Import it in `backend/alembic/env.py`, otherwise autogenerate will not see it
3. Schemas in `backend/app/schemas/`
4. Router in `backend/app/routers/`, wired up in `main.py`
5. `npm run makemigration "describe the change"`, then `npm run migrate`
6. Types in `frontend/src/types.ts` and methods in `frontend/src/api/client.ts`

Frontend types and backend schemas are kept in sync by hand — watch for drift.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | API and front end together |
| `npm run dev:api` | backend only |
| `npm run dev:web` | front end only |
| `npm run build` | production build of the front end |
| `npm run test` | front-end unit tests (Vitest) |
| `npm run typecheck` | TypeScript project build, no emit |
| `npm run lint` | ESLint and Ruff |
| `npm run migrate` | apply migrations |
| `npm run makemigration "message"` | create a migration from model changes |

## Not included

No CI or Docker — deliberately, to keep the base minimal. Add them as the project needs them.
