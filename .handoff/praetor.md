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

**Submit `https://cursor-squad-august-live.vercel.app`.** Git-linked, auto-deploys unattended in
about two minutes, verified serving the exact bundle `main` builds.

Two decoys, both answering **200**, both of which a judge could reach:

- `cursor-squad-august-app.vercel.app` — the README's URL for most of the event. Hand-deployed on an
  account no agent can administer. Serves the **26 August build forever**; it is not wired to the
  repo and never will be. `quickstart.md` was corrected at `724ac56` and carries three durable
  warnings; `README.md:59` was still wrong as of gate 3 (#43).
- `money-river.vercel.app` — resolves to an **unrelated stranger's app**, and it is the URL somebody
  guesses from the project name.

**Never accept HTTP 200 as proof of a deploy.** Compare the live asset hash against a local
`npm run build` of `HEAD`, and grep the deployed bundle for a string only the new code contains.
That check caught a full day of stale deploy that every casual check had passed.

## Verification lesson worth more than any single finding

`shape-rendering` is an **inherited** SVG presentation attribute. `getAttribute('shape-rendering')`
returns `null` on a child that is inheriting it perfectly well. A live-DOM audit read that null
across 22 shapes and reported the attribute missing; it was set on the `<svg>` root the whole time
(`World.tsx:77`). Acting on it would have been 22 redundant edits at T−60.

The real defect in the same finding was `strokeLinecap="round"`, explicitly set five times in
`River.tsx` — which is what actually made the tributaries render as rounded lozenges.

**Verify a report against the source before ordering work from it, especially a good report.** The
half that was right and the half that was wrong arrived in the same paragraph.

## State of `main` @ `9907785` — the demo path is complete and live

```
npx tsc -b      -> exit 0
npm run build   -> exit 0, dist/assets/index-CiCyxc8Q.js  347.71 kB / 110.75 kB gzip
live cursor-squad-august-live -> /assets/index-CiCyxc8Q.js   MATCH

deployed bundle greps: 'tributar' 7 · 'reservoir' 4 · 'balanced' 4 · 'over budget' 2
                       'Add Income' 1 · 'Load demo budget' 1 · 'copy it as a template' 0
```

Walked on the live URL at 390x844 in real Chromium: empty field -> income -> seeded month -> adjust
-> overspend -> recover -> reset, zero console errors. Trunk steps `24 -> 15 -> 12 -> 10 -> 8` down
the branches, so SC-002 lands. The seeded month at `$0` reads as **balanced**, not as a warning —
which tasks.md called "the single most likely thing to be got wrong".

**Ten of the brief's eleven acceptance criteria pass.** The one that does not is
*"a colleague can run, deploy, and demo it from the repository README"* — #43.

**15 landed issues were closed at gate 3**; they had been sitting open while the work was on `main`,
which makes a board useless to anyone hunting for remaining work. Open spine at gate 3: **#42**
(the walk) and **#43** (README) only.

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


## FREEZE QUEUE — published at 01:57, FREEZE called 35 min early

Spine was complete and verified, so the risk from here is unmanaged edits to a working build, not
missing features. **The queue is the only permitted change set.** Each item under 15 minutes, single
file, obvious revert, ranked by points-per-minute against Technical Execution and Functional
Completeness. Execute in order, one commit each, verify `typecheck && test && build` **and the live
asset hash** after every one.

| # | Change | File | Note |
|---|---|---|---|
| 1 | `transition: stroke-width 300ms ease-out` on trunk + tributary paths | `world/River.tsx` | T021, cut at gate 1. SC-003. One property. |
| 2 | Re-enable width/number transitions at 150ms under `prefers-reduced-motion` | `index.css` | T027. **Does nothing without #1** — pair or neither. |
| 3 | Place `MARKET` on the food tributary | `world/Settlements.tsx` | Built, tested, imported nowhere. In the brief's mapping. Drop if it fights the layout. |
| 4 | Coins riding the river | new `world/Coins.tsx` | T013, cut at gate 1. Brief lists flowing coins. New file = clean revert. |
| 5 | Tributaries: straight lines -> meander curve | `world/geometry.ts` | **Last on purpose.** Highest payoff, highest chance of breaking a working river. **Not under 15 minutes remaining.** |

Taken before publication: `b0d1f99` header wrap + list clipping + minus glyph; `ebc8c26` README URL
+ stale warning + relative screenshot paths.

**Not in the queue, forbidden under any extension: the natural-language AI scenario field.** Brief
calls it optional and says it must not block the core demo. July retro: zero repos ran agent loops,
deterministic calculators won, technical scores saturated at 8.45/10 with near-zero rank
correlation. An extension is exactly enough time to half-wire it and break a working demo.

**Brief deliverable nobody owned:** §90-Minute Execution Plan, 80-90 min — *"Rehearse demo. Seed
data reset, 60-second script, contingency screenshot/video."* Assigned to Herald at freeze. The four
captures in `docs/screenshots/` are the fallback material.

## THE LESSON THAT COST THE MOST — my task rule manufactured an orphaned requirement

`setSheet('income')` had exactly one caller, on the empty field. **FR-002's "enter *and later edit*"
was unreachable from the running app and US1 scenario 3 could not be performed at all** — until
`31f5367`, found at T-50 by Honey.

T010 built the income sheet. T026 wired the composition. **Neither owned the trigger for the
already-has-a-budget case, so the requirement was nobody's and both tasks closed green.**

That hole is cut by my own rule: *"every task touches exactly one owned surface."* It prevented
merge fights all night **and** it manufactured this. Both are true. The fix is not to drop the rule
— it is to add a step:

> **After generating tasks, walk every FR and every user-story scenario and name the task that makes
> it reachable.** A requirement that spans two surfaces needs a task that owns the seam, or it
> belongs to nobody. Task coverage is not requirement coverage.

**And the pass that finds these: read the spec against the shipped app, never against the task
list.** A walk written from the task list asks the questions the task list already asked. Four
defects tonight — ghost river, round caps, capped settlements, unreachable income edit — every one
invisible to 127 passing tests, every one found by a person looking at the running product.


## SUBMITTED BUILD != `main` HEAD — read this first

**Submission: `https://cursor-squad-august-live.vercel.app`, serving `78a230a`.**

The Vercel account hit its **Hobby daily cap of 100 deployments** at ~02:05 UTC. Every commit after
`78a230a` failed to deploy with *"Deployment rate limited — retry in 24 hours."* So `main` advanced
and the site did not.

```
gh api repos/qwarkie/cursor-squad-august/commits/<sha>/status
  -> Vercel - cursor-squad-august-live : failure
     "Deployment rate limited - retry in 24 hours."
gh api 'repos/.../deployments?per_page=100' | length  -> 100
```

**Cause: three Vercel projects were Git-linked and every push built all three.** Two were useless —
`cursor-squad-august-app` (the dead hand-deployed host serving a 26 Aug build) and `money-river`
(created chasing the failed option B; its public domain serves an unrelated stranger's app). They
consumed roughly two thirds of the budget for zero value, and that is why three finished fixes are
stranded.

### Stranded on `main`, green, undeployable

| SHA | Change | Consequence on the shipped build |
|---|---|---|
| `6478e08` | Category colour restored on the tributary stroke (SC-002 ruling) | Colour is present on **signboards** but not on strokes. Branching is harder to read mid-river. **One of art-bible §2's three placements, not the signal** — all five category colours are on the live screen as signboard backgrounds. |
| `22e7a99` | Income control 44 px | Live target is 36 px. Works; fails art-bible non-negotiable #6. |
| `3d0d60a`, `cc30ab4` | Harness fixes and new assertions | Test-only. The colour and reachable-alert assertions **fail against `78a230a` by design** — the gap is the finding. |
| `cdf97ac` | Five spend icons | A **feature pushed 30 minutes after FREEZE**. Never deployable. Not reverted: a revert costs a build attempt and changes nothing a judge sees. |

### Also known and deliberately not fixed

The overspend `role="alert"` renders inside `World.tsx`'s `aria-hidden="true"` sprite overlay, so it
never reaches the accessibility tree. **FR-012 still holds** because the header carries `over budget`
as ordinary text. Moving a live region out of an aria-hidden container at T-20 was correctly refused.

### THE LESSON

**Count the resource nobody is counting.** FREEZE was framed as protecting code quality. What
actually needed protecting was a 100-build daily quota that no one — including me — was tracking,
being spent three-for-one by projects we did not need. Every blocker of the whole event was a
credential or a plan limit: the Vercel Git link, the `workflow` token scope, and this. **None was
code.** Next time, enumerate the external quotas before the clock starts and delete redundant
deploy targets on sight.

### Seven measurement artifacts, zero shipped as false claims

`getAttribute` on an inherited SVG attribute; water-plus-highlight read as two trunk segments; a dev
server on the wrong port; a hit-test predicate counting ancestors, which made the check unpassable
for any control in a top-anchored header; a settlement count capped at 3 so the largest expense
rendered like the second largest; my "11/11 criteria pass" when the README criterion still failed;
and my "all-blue tributaries" which was true of strokes and misleading about the screen. **Every one
was caught by its own author or the next reader.** Verify a report against the source before ordering
work from it - including your own.


## CERTIFIED — live `78a230a`: **39/41**. `main`: **41/41**.

SHA proven from two directions, not inferred: a clean build of `78a230a` produces
`index-Vuol0JCn.js`, and that is byte-identical to what the live URL serves. Verified
independently by Praetor and by the T029 harness.

**The two live failures are the two stranded fixes, and nothing else:**

```
FAIL  each tributary strokes in its own category colour   -> fixed 6478e08, undeployable
FAIL  the income control is at least 44px tall  (36 px)   -> fixed 22e7a99, undeployable
```

Everything else green on the shipped build: income edit widens the trunk with no reload,
`Food -$100 -> Remaining +$100` to the character, overspend with dry bed and exact negative figure,
recovery, reset, **SC-007 identical geometry across two loads**, no horizontal scroll at 390 or 320,
zero console and zero page errors, and `/api` appears **0 times in the shipped bundle** — Principle
II proven by absence on the submitted artifact.

**Write it as "fails on the shipped build, fixed on `main` @ <sha>, undeployable" — never a bare
FAIL.** The gap between the two numbers is the finding; a bare FAIL reads as a defect nobody fixed.

Repo confirmed **public to an anonymous request** — the highest-consequence check of the night and
the last one anyone thought to run. A private repo behind a submitted link fails exactly like the
dead host did: invisible to everyone who is signed in.


## FINAL — submitted `78a230a` on `-live`. The alternative, and why it lost.

**Submission: `https://cursor-squad-august-live.vercel.app` serving `78a230a`. Certified 39/41.**

Verified coherent across every artifact at `6bef98d`:

```
README.md:18,:83 · quickstart.md:61 · docs/DEMO_SCRIPT.md:6   all -> -live
docs/screenshots/*   captured from -live @ 78a230a, hash-asserted before capture
raw CDN image        26,253 B = the new capture (cache cleared)
stale-host warning   names -app as the one not to trust
```

### The better artifact we did not ship

`cursor-squad-august-app.vercel.app` walked **41/41** — it carries both stranded fixes because
**the Vercel quota is enforced PER PROJECT, not per account**, and that project still had room. Bundle
identity proven (`index-DOWeDodp.js` == a local build). Its post-freeze sprites were walked end to
end. **It lost on coherence, not merit:** our own README and quickstart told a reader that host was
dead, and switching needed four coordinated doc changes plus fresh stills with minutes left.

### THE LESSON, and it is about sequencing not judgement

I ruled three times on one question in twenty minutes — no-switch, switch, no-switch. **The middle
ruling was correct on the evidence and I could not land it**, because I spent the window deliberating
instead of pre-positioning the docs commit alongside the probe that would justify it.

> **When you order a check that could change a decision, order the change that check would trigger
> at the same time.** Otherwise the check completes, the decision flips, and the window is gone.

Had the probe and the docs commit been ordered together, `-app` at 41/41 ships.

### Two inferences I drew wrong from a fact I already had

1. Rate limit -> "all deploys are blocked." **It is per project**; one host kept deploying all along.
2. Rate limit -> "any correction is expensive." **Docs-only pushes are free** — rejected before they
   build. Both times another agent did the arithmetic I should have done.

### "A 200 on a PNG is not the picture."

Two agents verified the four contingency screenshots resolved 200 and neither opened them. They
showed a UI **no candidate build rendered** — captured before the signboards landed. The demo script
narrated "the signs name each branch" over a picture with no signs. Same shape as the dead host
answering 200, `getAttribute` on an inherited attribute, and the dev server on the wrong port:
**every one was a check returning a truthful answer to a question nobody meant to ask.**

The capture script now asserts the bundle hash before taking a frame and aborts otherwise, so a
screenshot can no longer drift from its build silently. That is the fix worth keeping.


## FREEZE was declared and then ignored three times — and it cost something concrete

`cdf97ac` spend icons, `c5d4090` generated field art, plus `6ac05fd`'s SC-002 regression. None could
reach the submitted URL, so none changed what a judge sees. **But `cdf97ac` committed a symlink into
the repository:**

```
git ls-tree -r cdf97ac | grep node_modules
120000 blob e7da4e17…   frontend/node_modules     <- mode 120000 = symlink
```

Untracked again by `3c9121b`. The submitted build `78a230a` was never affected (0 tracked
`node_modules`). But for ~40 minutes `main` carried a symlink to a path that exists on one machine,
and **a judge cloning in that window could have hit it.** Invisible to 127 passing tests, a green
build, and the walk — because none of them clone.

**That is the honest cost of a freeze that was announced and not enforced.** Not bad code:
unreviewed change to a shared artifact while attention was elsewhere. The record should say so.

Also inverted under us: the `README.md:99` stale-host warning became false in all three of its
claims, including a promise that **the submitted URL auto-redeploys** — the one thing it could not do.
Corrected doc-only at zero quota. **Documentation describing the world is a thing that rots when the
world moves; re-read your own warnings before you sign off.**


### Refinement worth more than the fix (Honey), and its best evidence (Pollen)

> **Documents describing infrastructure need a shorter half-life than documents describing
> behaviour.** A demo script ages in revisions; a deploy warning ages in minutes.

The README host-warning went false three times in ninety minutes because it *had* to describe
infrastructure, and infrastructure was the thing that moved. The evidence is Pollen's own heading in
`quickstart.md`: **"Three warnings that outlive that fix" — and two of the three did not outlive
ninety minutes.** The two that survived are the two that never named infrastructure
(`money-river` is not ours; a green build is not a live demo).

Moving-state word count across the four docs, since it is now a measurable thing:

```
README.md  3 (fixed d464a8a) · quickstart.md 3 (fixed here) · DEMO_SCRIPT.md 0 · screenshots/README 0
```

**When a document must describe infrastructure, write only what is fixed and name no moving state.**
Both landed rewrites claim nothing about which host tracks `main` — the exact fact that flipped twice.

## Decision log

| Gate | Call | Cut | Remains SPINE | Would cut next |
|---|---|---|---|---|
| pre-clock (2026-08-26 01:22 UTC, stopped by owner) | `HOLD` | stale branches `e4011ae`, `ac5795c`; starter-repair task set | #5 deploy pipeline | the backend from the deployed surface entirely — serve fixtures only and delete `/api` from `vercel.json` |
| pre-clock (2026-08-27 00:15 UTC, second standby) | `HOLD` | nothing new | #5 — now demonstrably load-bearing: the live URL serves a build that predates the SR-1 fix | same as above; if #5's auto-deploy link has not landed when the clock starts, cut the live-URL demo and demo from a local `npm run build && npm run preview` |
| pre-clock (2026-08-27 00:20 UTC) | `HOLD` | the dependency on the owner for #5 — authorized option B, a fresh agent-owned deploy, rather than waiting on the hand-deployed project being linked | #5, now with an agent-side path | CI. The workflow-scope wall is real and re-verified; if anyone proposes GitHub Actions as spine, cut it on sight |
| **gate 1 — 01:39 UTC** | `HOLD` | nothing new at this gate; standing cuts T013 coins and T021 width transitions to `optional` | engine done, path builders done, entry point done, sprites done; world shell, chrome, #47 integration, deploy-walk all open | the T020 slider — keep `-`/`+`, the $50 steps carry the interaction — then T022 trade-off sentence |
| **gate 2 — 01:36 UTC** (called early) | `CUT T019` | T019 tap-to-select to `optional` (the category list already satisfies the brief's tappable-district line); T023 scoped to the balanced-vs-dry distinction, sprite tail declared droppable | T011 + T015 — `River.tsx` did not exist on **any** remote ref with ~65 min left, all remaining risk in one file with one owner | T023's whole visual treatment; the header text already signals overspend |
| **gate 3 — 01:43 UTC** | `HOLD` | nothing — spine landed instead | #42 the walk, #43 the README | the meander curve. Tributaries ship as provisional straight lines and nobody is to spend clock on the curve before FREEZE |
| **FREEZE — 01:57 UTC** (35 min early) | `FREEZE` | nothing further; queue published as the only permitted change set | none — all spine landed and verified, 11/11 brief acceptance criteria pass | queue item 5, the meander curve. It is last for a reason and must not be attempted under 15 minutes remaining |
| **submission — 02:33 UTC** | `SHIP 78a230a` | option 2 (fresh Vercel account, new URL) refused: trading a verified URL for an unverified one at T-15 | the live URL at `78a230a`, walked end to end by two agents independently | nothing. Ship what is verified. |

## Grounding

From the July 2026 retro across 27 repos: technical scores saturated at mean 8.45/10 with roughly
zero correlation to final rank. **Functional Completeness and Problem–Solution Fit are the only
levers.** One team submitted a demo URL that 404'd and scored 3/10 on viability — which is trap 1
above, and it is why #5 is spine. Deterministic calculators won; zero repos ran agent loops.
