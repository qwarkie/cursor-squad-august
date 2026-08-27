# Proposed constitution amendment v1.2.0

**Status**: Draft for approval. **Not applied.**  
**Process**: Governance requires a pull request that edits `.specify/memory/constitution.md`, states the version bump in the Sync Impact Report, and is announced in the team channel. This file is the proposed PR body, not the amendment itself.

## Why this exists

The Money World product decision makes FastAPI + SQLAlchemy + seed + reset the **primary** application flow.

Constitution v1.1.1 Additional Constraints currently says:

> **The backend is not on the production demo path.** FastAPI + SQLAlchemy + Alembic + SQLite remain in the repository and remain available for local development and for `optional` work, but the deployed application makes no `/api` call on the demo path. The demo path renders from deterministic fixtures checked into the front end. Anything that requires the live API is `optional`, never `spine`. This follows from Principle II: a demo path that needs a server it cannot reach in production has no deterministic fallback. Revisit only if the event theme requires persistence across sessions or devices, and revisit in the spec, not in a debugging session.

That clause conflicts with:

- `docs/money-world-hackathon-brief.md` (backend allowed; client-side is an option, not a ban)
- The explicit documentation-phase decision that the backend is required
- `specs/001-money-world/spec.md` MW-FE-019, MW-BE-001..003

Principle II (deterministic fallback) does **not** conflict. The conflict is only the Additional Constraint that forbids `/api` on the demo path and labels API work `optional`.

Praetor handoff (`.handoff/praetor.md`) repeats the old decision and should be updated in the same PR if the amendment is approved.

## Smallest consistent change

- **Version**: 1.1.1 → **1.2.0** (MINOR: materially expanded guidance; no principle removed)
- **Replace** the Additional Constraint paragraph quoted above with:

> **The production demo path is full-stack with a deterministic fallback.** The UI loads and mutates the monthly budget through FastAPI. SQLAlchemy persistence, the Alembic budget migration, and the checked-in seed are `spine`. Deterministic fixtures remain required as an offline fallback (Principle II) and as the server seed. The fallback must not replace or hide a missing backend. SQLite is the hackathon persistence target. Hosted Postgres remains a deploy-time option when the filesystem cannot persist. Work that exists only to call a model or a third-party API stays `optional`.

- **Leave unchanged**: Principles I–VI, write-failure visibility, README-as-claim, live-URL honesty, single-owned-surface tasking.

## Complexity Tracking (if implementers start before the PR merges)

Until the PR merges, implementers follow `spec.md` as the product contract and treat the v1.1.1 backend-off-path sentence as a known, documented exception recorded in `plan.md`.
