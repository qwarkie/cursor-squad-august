<!--
SYNC IMPACT REPORT
Version change: (template, unversioned) → 1.0.0
Rationale: MAJOR-equivalent initial ratification. Every placeholder principle replaced with
concrete, enforceable governance for a two-hour hackathon build.

Principles added (all new — the prior file was an unfilled scaffold):
  I.   Demo Path Integrity
  II.  Deterministic Fallback
  III. Stranger-Claimable Tasks
  IV.  Functional Completeness Over Technical Depth
  V.   Cut Early, Cut Loudly
  VI.  Single Owned Surface

Sections added: Additional Constraints; Development Workflow; Governance
Sections removed: none (template placeholders replaced in place)
Deferred TODOs: none — no placeholder tokens remain.

Templates checked for consistency:
  .specify/templates/plan-template.md      — Constitution Check gate reads this file at runtime, no edit needed
  .specify/templates/spec-template.md      — no constitution references, no edit needed
  .specify/templates/tasks-template.md     — no constitution references, no edit needed
  .specify/templates/checklist-template.md — no constitution references, no edit needed
-->

# cursor-squad-august Constitution

This constitution governs a two-hour hackathon build. It is deliberately short and deliberately
short-lived. It exists to make the demo survive, not to make the codebase beautiful.

## Core Principles

### I. Demo Path Integrity (NON-NEGOTIABLE)

**The demo path must execute end to end at every commit on main.**

Not "at the end". Not "on a branch". At every commit on `main`. A commit that breaks the demo path
is reverted, not fixed forward. The demo path is the single named sequence of user actions a judge
watches start to finish; it is defined in the feature spec and it does not change without a
scope decision.

*Rationale:* We do not control when we are judged, and a broken `main` at the wrong minute costs
the entire event. Reverting is always faster than debugging under a clock.

### II. Deterministic Fallback (NON-NEGOTIABLE)

**No feature ships without a deterministic fallback.**

Every feature on the demo path must produce a correct, presentable result with no network, no API
key, no model call, and no external service. Non-deterministic sources are enhancements layered on
top of a deterministic result that already renders. If the fallback is not implemented, the feature
is not done.

*Rationale:* Venue wifi fails, rate limits hit, and a spinner that never resolves scores below an
absent feature.

### III. Stranger-Claimable Tasks

**Any task another team could own is written to be claimable by a stranger.**

Such a task states its file paths, its acceptance check, and everything needed to start, with no
tribal context and no question asked of the author. It is labeled `open-to-anyone`. A task that
requires a conversation before work can begin is not claimable and must be rewritten or cut.

*Rationale:* This label is the only mechanism by which load leaves this team.

### IV. Functional Completeness Over Technical Depth

Given a choice between finishing a working slice and deepening an unfinished one, finish the slice.
Refactors, abstractions, test coverage beyond the demo path, and architecture that serves no
demoed behavior are out of scope for the duration.

*Rationale:* Measured on 27 repos from the July 2026 event, technical scores were saturated
(mean 8.45/10) and their correlation with final rank was effectively zero. Functional Completeness
and Problem-Solution Fit were the levers.

### V. Cut Early, Cut Loudly

A half-wired feature scores worse than an absent one, because it breaks the demo path. Scope is cut
early and announced in the channel with what was cut and why. Only the spec authority changes
scope; every other contributor may propose a CUT but may not enact one.

*Rationale:* Late cuts leave dead code and broken links. Early cuts leave a smaller working product.

### VI. Single Owned Surface

Every task touches exactly one owned surface — engine or UI or API or docs, never two. Two claimed
tasks must never block each other, and each must be independently mergeable into `main`.

*Rationale:* Parallel contributors under a clock cannot afford merge conflicts or handoff waits.

## Additional Constraints

- **Stack is fixed:** React + TypeScript + Vite + Tailwind on the front end, FastAPI + SQLAlchemy +
  Alembic on the back end, SQLite. No framework migrations, no Next.js, no new runtime dependency
  that the demo path does not require.
- **The live deployment is part of the demo path.** A deploy that 404s fails Principle I exactly as
  a broken build does. The live URL is opened and walked, not assumed.
- **The README quickstart is a claim under test.** A fresh clone following it literally must reach a
  running app. A README that overclaims is a defect.
- **Deterministic fixtures are checked in.** Seed data required to render the demo path lives in the
  repository, not in someone's local database.

## Development Workflow

- Work lands on `main` through small, independently mergeable pull requests.
- Every task carries exactly one of `spine` (the demo path depends on it) or `optional`.
- `spine` tasks may never depend on work owned outside this team. Cross-team dependencies are
  permitted only on `optional` tasks.
- Cross-team proposals are exchanged as issue links. Work that is not an issue does not exist.
- Gate calls are issued at fixed checkpoints as one word — `HOLD`, `CUT <what>`, or `FREEZE` — plus
  one line. At `FREEZE`, a ranked queue of individually safe, sub-15-minute, single-file changes is
  published for any deadline extension.

## Governance

This constitution supersedes convention, preference, and prior habit for the duration of the event.

- **Authority:** the spec authority owns scope and is the only role that may amend this document or
  enact a cut. Anyone may propose an amendment or a cut.
- **Amendment procedure:** amendments are made in a pull request that edits this file, states the
  version bump and its reason in the Sync Impact Report, and is announced in the team channel.
- **Versioning:** semantic. MAJOR for a removed or redefined principle, MINOR for a new principle or
  materially expanded guidance, PATCH for clarification.
- **Compliance review:** every pull request is checked against Principles I, II, III, and VI before
  merge. `/speckit.plan` runs a Constitution Check gate against this file; a violation must be
  justified in the plan's Complexity Tracking table or the approach must change.
- **Expiry:** this constitution governs the August 2026 hackathon build and is not intended to
  outlive it.

**Version**: 1.0.0 | **Ratified**: 2026-08-26 | **Last Amended**: 2026-08-26
