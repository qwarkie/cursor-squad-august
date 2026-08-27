# Praetor — handoff

Spec authority. Owns scope and the interface with other teams. Writes no application code.

## Current

- **Role now: gates only.** Spec Kit is **7 of 7**. I do not write application code.
- **The clock is real.** T+0 = `01:14 UTC` 2026-08-27, deadline approx **`02:44 UTC`**. The brief says
  **90 minutes**, not 120 — the configured gates (T+90/T-150/T-90/T-40) were calibrated for a longer
  event and are nonsense here. Rescaled to wall clock: gate 1 `01:39`, gate 2 `01:59`,
  gate 3 `02:19`, **FREEZE `02:32`**.
- **Board:** 34 issues, `#13`-`#47`, against `specs/001-money-river`. 25 spine / 7 optional,
  16 `open-to-anyone`. Full index and per-task ownership are in the comment on **#8**.
- **Process changed by the owner:** direct push to `main`, no branches, no PRs (Dmytro, `01:22 UTC`).
  Two controls published in place of review: each agent works in its **own git worktree** — six were
  sharing one checkout and staging over each other — and `typecheck && test && build`
  **before every push**. Without PRs that local gate is the only thing enforcing Principle I.

## THE DEMO URL — get this wrong and the submission is yesterday's build

**Submit `https://cursor-squad-august-live.vercel.app`.** Git-linked, auto-deploys on push to `main`,
verified serving the exact bundle `main` builds — asset hash match, not merely HTTP 200.

Two decoys, both returning **200**:

- `cursor-squad-august-app.vercel.app` — the URL in the README for most of the event. Hand-deployed
  on an account no agent can administer; served the **pre-#11 bundle for 24 hours**. #43 fixes it.
- `money-river.vercel.app` — created during the failed option-B attempt. Returns 200, serves no
  bundle.

**Never accept HTTP 200 as proof of a deploy.** Compare the live asset hash against a local
`npm run build` of `HEAD`. That check caught a full day of stale deploy that every casual check had
passed, and #5's acceptance was rewritten around it.

## State of `main` @ `900b915`, verified in a clean worktree

```
npx vitest run  -> 7 files, 82 tests, all pass
npx tsc -b      -> exit 0
npm run build   -> exit 0, dist/assets/index-B5piu6LG.js  327.71 kB / 105.39 kB gzip
```

Landed fast under direct-push: `639d985` types + seed (T003/T025), `30f7539` engine (T004/T005),
`ec611f9` path builders + entry point (T006/T032), `900b915` sprite inventory
(T012/T017/T018/T024).

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

1. **The stale-deploy trap is RESOLVED, but the decoy URLs remain — see "THE DEMO URL" above.**
   It was live for 24 hours and invisible because the URL returned 200 and the page rendered.
   Auto-deploy now works on `cursor-squad-august-live`. Keep the habit even though this instance is
   closed: asset hash against a local build, never HTTP status.

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

1. **Run the remaining gates: `01:59`, `02:19`, FREEZE `02:32`.** One word — `HOLD` | `CUT <what>` |
   `FREEZE` — plus one line. At FREEZE publish the QUEUE: 5–8 cuts, each under 15 minutes, single
   file, obvious revert, ranked by points-per-minute. Deadlines get extended when organizers hit
   technical problems; a pre-vetted queue converts that window into rank. Costs four minutes if no
   window opens.
2. **Watch #47 T034 (composition root).** It is the single task whose slippage breaks the demo —
   every lane is building a piece and `App.tsx` was still the items-CRUD starter at gate 1.
3. **Watch #43** — the README still names the stale URL.

### Superseded (kept for the reasoning)

0. **~~#5 authorized as option B~~** — B failed: `create_git_project` returned 404 on read and 403
   on deployments, so the connector had create rights and nothing else. A happened instead and #5
   is closed. Lesson worth keeping: a connector that can create is not a connector that can
   administer, and the failure surfaced only on the *second* call.

**Original option-B rationale:** — redeploy `main` fresh under an account an agent can
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
| **gate 1 — 01:39 UTC** | `HOLD` | nothing new at this gate; standing cuts T013 coins and T021 width transitions to `optional` | engine done, path builders done, entry point done, sprites done; world shell, chrome, #47 integration, deploy-walk all open | the T020 slider — keep `-`/`+`, the $50 steps carry the interaction — then T022 trade-off sentence |

## Grounding

From the July 2026 retro across 27 repos: technical scores saturated at mean 8.45/10 with roughly
zero correlation to final rank. **Functional Completeness and Problem–Solution Fit are the only
levers.** One team submitted a demo URL that 404'd and scored 3/10 on viability — which is trap 1
above, and it is why #5 is spine. Deterministic calculators won; zero repos ran agent loops.
