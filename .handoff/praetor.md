# Praetor — handoff

Spec authority. Owns scope and the interface with other teams. Writes no application code.

## Current

- **Issue:** none claimed. Spec Kit is **1 of 7**: constitution v1.1.1 ratified on `main`.
- **Branch:** `main`. Nothing of mine is unpushed.
- **Half-done:** steps 2–7 of the Spec Kit sequence (`specify`, `clarify`, `plan`, `tasks`,
  `taskstoissues`, hand to Tower). All six are blocked on exactly one input: **the organizers'
  theme, pasted verbatim.** They run as a single pass once it lands. Do not start them from a
  paraphrase of the theme; step 3 (`clarify`) exists precisely to kill paraphrase.
- Repo Spec Kit skills are at `.claude/skills/speckit-*/SKILL.md`. They are **not** registered as
  slash commands in this session — follow them manually.

## State of `main` @ `4a0d6bd`, verified in this checkout

```
git rev-parse --short HEAD  -> 4a0d6bd
npx vitest run              -> 2 files, 13 tests, all pass
npx tsc -b                  -> exit 0
npm run build               -> exit 0, dist/assets/index-BddyzR6M.js  198.54 kB / 62.63 kB gzip
```

`origin` has two branches: `main` and `feat/deterministic-fallback-and-write-errors`
(merged as PR #11, `git log origin/main..<branch>` is empty, safe to delete).

## Decisions

- **Backend is off the production demo path.** The deployed app renders the demo path from
  checked-in fixtures and makes no `/api` call. FastAPI is local dev only. Anything requiring the
  live API is `optional`, never `spine`. Encoded in constitution v1.1.0. Revisit only if the theme
  requires persistence across sessions or devices — and then in the spec, not in code.
- **SPINE may never depend on work owned outside this team.** Shared cross-team work goes in
  `optional`. Other teams' timelines are not ours to control.
- **Report by SHA, never by "done".** Attribute every test/build claim to the commit it ran at,
  confirmed with `git rev-parse HEAD` in the same shell.
- **Repairing starter components that `/speckit.tasks` will delete was CUT as a task set.** Fixing
  the starter for its own sake is Principle V applied to ourselves. SR-1/SR-2 landed instead as
  requirements binding on the real feature, which is why PR #11 was the right shape.
- **Direct push to `main`** is acceptable for a single-surface change whose acceptance check passed
  on the pushed commit. PR required for multi-surface changes, demo-path contract changes, and
  constitution amendments.
- **Diff every PR against `main` before merging.** Green + mergeable is not safe here; see Traps.

## Traps

1. **The live deploy is stale and looks fine.** `https://cursor-squad-august-app.vercel.app`
   returns HTTP 200, so every casual check passes. It is serving the **pre-#11** build:

   ```
   live  /assets/index-qtxljjNW.js   196780 B   == the 7aab0de baseline, byte for byte
   main  /assets/index-BddyzR6M.js   198540 B   == 4a0d6bd
   grep -ic 'deterministic|Walk the live URL|390px'  live bundle -> 0 0 0
   ```

   The fixture strings from `frontend/src/fixtures/items.ts` are absent from the live bundle.
   **The SR-1/SR-2 fix is not on the live site.** Never read "the URL loads" as "the demo path
   works" — check the asset hash against a local build of `HEAD`.

   Root cause, found independently by Pollen and consistent with the above: the Vercel account any
   agent can reach lists **zero projects** (`vercel list_projects -> []`). The app serving 200s was
   deployed by hand from an account nobody here controls, so there is no project to attach a Git
   hook to. Tracked in **#5**. Pollen also confirmed the backend is genuinely live and backed by
   real Postgres — a row created `2026-08-26T04:52:13` is still served — which does not change the
   fixture doctrine: the demo path must not depend on it.

2. **Stale branches here have been armed reverts, twice.** `origin/speckit/constitution` @
   `e4011ae` was unmerged, 1 ahead, and a PR from it would have deleted 556 lines across 11 files
   including the entire constitution, `vercel.json`, and the vitest wiring — because someone
   pushed a `fix(setup)` onto a closed branch instead of a fresh one. Same shape as PR #3. Both
   deleted; recovery is `git push origin <sha>:refs/heads/<name>` with `e4011ae` / `ac5795c`.

3. **No agent can push `.github/workflows/` from this checkout.** Re-tested 2026-08-27 00:18 UTC
   after a report that the scope had been granted — it has not, at least not here:

   ```
   $ gh auth status | grep scopes
   Token scopes: 'gist', 'read:org', 'repo'
   $ git push origin ci/workflow-draft
   ! [remote rejected] (refusing to allow an OAuth App to create or update workflow
     .github/workflows/ci.yml without `workflow` scope)
   ```

   A `ci.yml` that was untracked in the shared checkout (not mine) is committed locally at
   `2cd7103` on `ci/workflow-draft` and preserved verbatim outside the repo at
   `WORK_LOGS/CURSOR_SQUAD_UNPUSHED_CI_WORKFLOW.md`. Its `on:` block still lists the deleted
   `add-spec-kit` branch. **Do not plan CI into SPINE.** If another agent reports it can push
   workflows, that is its own token, not this checkout's — verify with the push itself, not with
   `gh auth status`, before believing it.

4. **`MaersTek` has push but not admin.** It cannot enable Pages, cannot set branch protection,
   cannot create the Vercel link. `POST /pages` returns 404. Anything needing repo-owner
   credentials must **not** be labelled `open-to-anyone` (Principle III).

5. **This checkout is shared** with several agents. Branch before touching anything; the working
   tree is not yours. It was 4 commits behind `origin/main` when I picked it up today.

6. **Assignee cannot name an agent.** Only `MaersTek` and `qwarkie` are assignable and every agent
   pushes as `MaersTek`. Read it as: `qwarkie` + `blocked-on-owner` = needs the human, do not
   escalate. `MaersTek` = an agent owns it. Unassigned + `open-to-anyone` = deliberately claimable,
   which is not a defect.

## Next

0. **#5 is authorized to proceed as option B** — redeploy `main` fresh under an account an agent can
   actually reach, accepting a new URL, because Git links at project-create time and auto-deploy
   works from then on. Rationale: #5 is SPINE and had **zero** agent-side path, and SPINE may not
   depend on work this team does not control. Option A (owner links the existing project, URL
   preserved) remains the owner's override and makes B redundant at a cost of about four minutes.
   Do not spend a second gate waiting for A.
1. Get the theme verbatim, then run Spec Kit 2→7 in one pass. Task rules at generation time: one
   owned surface per task, independently mergeable, SPINE:OPTIONAL ≈ 60/40, at least a third
   labelled `open-to-anyone`.
2. Push the issue board to Tower and stop planning.
3. Run the gates at T+90, T−150, T−90, T−40 — one word (`HOLD` | `CUT <what>` | `FREEZE`) plus one
   line. At T−150 run `/speckit.converge` and convert its output into a **CUT**, never into new
   tasks. At `FREEZE` publish the QUEUE: 5–8 cuts, each under 15 minutes, single file, obvious
   revert, ranked by points-per-minute.

## Decision log

| Gate | Call | Cut | Remains SPINE | Would cut next |
|---|---|---|---|---|
| pre-clock (2026-08-26 01:22 UTC, stopped by owner) | `HOLD` | stale branches `e4011ae`, `ac5795c`; starter-repair task set | #5 deploy pipeline | the backend from the deployed surface entirely — serve fixtures only and delete `/api` from `vercel.json` |
| pre-clock (2026-08-27 00:15 UTC, second standby) | `HOLD` | nothing new | #5 — now demonstrably load-bearing: the live URL serves a build that predates the SR-1 fix | same as above; if #5's auto-deploy link has not landed when the clock starts, cut the live-URL demo and demo from a local `npm run build && npm run preview` |
| pre-clock (2026-08-27 00:20 UTC) | `HOLD` | the dependency on the owner for #5 — authorized option B, a fresh agent-owned deploy, rather than waiting on the hand-deployed project being linked | #5, now with an agent-side path | CI. The workflow-scope wall is real and re-verified; if anyone proposes GitHub Actions as spine, cut it on sight |

## Grounding

From the July 2026 retro across 27 repos: technical scores saturated at mean 8.45/10 with roughly
zero correlation to final rank. **Functional Completeness and Problem–Solution Fit are the only
levers.** One team submitted a demo URL that 404'd and scored 3/10 on viability — which is trap 1
above, and it is why #5 is spine. Deterministic calculators won; zero repos ran agent loops.
