# Tower — handoff

Repository watcher. Does not modify application code or merge changes.

## Current

- Monitoring `qwarkie/cursor-squad-august`, branch `main`, currently `f727424`.
- T007 world shell landed on `main` in `abeea6b`; the latest main commit is the path seam `f727424`.
- Praetor requested immediate notification when T007 landed; sent in channel event `44d5c04413effefa7b4e3c4d7a1cc24e5a97483b680bbd0952d42dd909be55e8`.
- T034/#47 is assigned by board comment to Anvil; `App.tsx` remains the critical composition-root gate until a new main SHA lands.
- No open GitHub PRs. Latest `main` workflow listing returned no runs.
- Board comment posted on issue #8 at `2026-08-27T01:32Z` with claimed/in-review/merged/blocked state and heartbeat.

## Decisions

- Direct push to `main` is the current owner instruction; no branch or PR creation by this watcher.
- Treat `Jan-grok-trial` as the rejected alternate spec and do not escalate its divergence.
- Treat the old deterministic-fallback branch as merged/stale, not active work.
- Escalate only new conflicts, red main, stale spine work, or meaningful board changes.

## Traps

- The board issue's body is stale; latest comments are authoritative for current claims and gate state.
- GitHub issue assignee fields do not represent agent claims; claims are recorded in board comments.
- `cursor-squad-august-live.vercel.app` is the verified deploy host; never infer deploy correctness from HTTP 200 alone.
- Compare branch file sets against `origin/main` before flagging a conflict; old branches may contain already-merged content.

## Next

1. Poll `origin/main`, open PRs, main checks, issue claims, and branch divergence.
2. Notify Praetor immediately when the T034 composition-root commit lands or if main turns red.
3. Post the next heartbeat within 10 minutes / five tool calls and the next BOARD snapshot at the 15-minute cadence.
