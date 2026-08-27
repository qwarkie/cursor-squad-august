# Money River

**A month of money is one river.**

**Income** is the spring at the top — it sets how wide the river starts. **Each
expense category** is a tributary that branches off sideways and carries water
away, and **below every branch the trunk is visibly narrower**. You do not read
that you have less money left; you watch the river thin out.

Settlements stand at the end of each tributary — they are what the money turned
into, and there are more of them where more money went. Savings ends in a
**reservoir** rather than a village, because that water is held, not consumed.
What reaches the bottom is what is left.

Mobile-first at 390 × 844, in 8-bit pixel art. Tap a tributary to reshape it and
every width and figure moves with you.

**Live: https://cursor-squad-august-live.vercel.app**

The demo path is **entirely client-side** — no API, no key, no network call and no
model call. The world is a pure function of one `Budget` held in `localStorage`,
so the same budget always draws the same river.

## Requirements

- **Node 20+**

That is everything the demo path needs.

This repository also carries a FastAPI backend. It is **not** on the demo path and
nothing above depends on it; [`specs/001-money-river/quickstart.md`](specs/001-money-river/quickstart.md)
documents the full-stack path and the `uv` it needs.

## Getting started

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

Open **http://localhost:5173**.

You land on an empty green field with one button. Tap **Add Income**, enter
`4200`, and a river appears. Tap **Load demo budget** instead and a complete
seeded month renders in one tap — five tributaries, settlements along their
banks, and a reservoir for savings.

Both commands were run from a fresh clone before being written here.

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

Live: **https://cursor-squad-august-live.vercel.app**

| | |
|---|---|
| ![Empty field](docs/screenshots/01-empty-field.png) | ![The seeded month, balanced](docs/screenshots/02-seeded-balanced.png) |
| ![Adjusting a category](docs/screenshots/03-category-sheet.png) | ![Overspent](docs/screenshots/04-overspent.png) |

**Demoing it?** [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) — the 60-second script with the exact taps, and what to do if the network dies.

`vercel.json` declares two services behind one domain — the Vite build at `/` and
the FastAPI app at `/api`, so the front end keeps using relative paths in production
exactly as it does behind the dev proxy.

SQLite does not survive on Vercel: the filesystem is recreated per request. Set
`DATABASE_URL` to a hosted Postgres connection string in the project's environment
variables. A bare `postgres://` URL is rewritten to the psycopg driver in
`app/config.py`, so the string a provider hands out works unchanged.

> **Two hosts answer, and only one is the demo.** The URL above serves the certified
> submission build. `cursor-squad-august-app.vercel.app` also returns **200** and serves
> a **different** build — it is not the submission, so do not cite it. Neither host will
> pick up further pushes today: the account's daily deploy quota is spent. For the
> submission window that is a feature rather than a fault — the URL above cannot change
> underneath you. `money-river.vercel.app` is **not ours** and serves a stranger's app.

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
