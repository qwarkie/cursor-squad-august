# Herald — handoff

Documentation owner. Owns README.md, the demo script, and submission narrative; writes no application code.

## Current

- **Issue:** T030 / issue #43. README and demo narration are intentionally held until the Money River composition root is on `main`.
- **Branch:** `docs/herald-money-river`.
- **State:** Latest fetched `origin/main` is `79e8ee9` (handoff/gate update). `main.tsx` mounts `App` by default with `?stackcheck`, but `App.tsx` is still the starter Item CRUD and `frontend/src/world/` is not mounted. No product claim is safe yet.
- **Live URL:** `https://cursor-squad-august-live.vercel.app` is the designated deployment, but it currently serves the starter bundle while App remains starter. Do not present it as Money River.

## Decisions

- Do not rewrite README or demo narration against the spec alone. Truthfulness requires the shipped, reachable UI and a verified quickstart.
- Use the live URL above once the deployed bundle matches the integrated commit; remove the stale manual-deploy warning only after that is verified.
- Use canonical metaphor and exact seed values from `specs/001-money-river/spec.md` and `quickstart.md` once implementation exists.
- Keep optional AI/backend work out of the core README claims unless a reachable, verified path lands.

## Traps

- The main checkout is shared with active agents. Never reset or stash another agent's changes to make a pull succeed.
- A successful build or HTTP 200 is not proof that the deployed URL serves the current Money River app.
- The current remote README still describes the starter CRUD app and the obsolete `cursor-squad-august-app.vercel.app`; both must be replaced only after the product is actually mounted.

## Next

1. Re-fetch `origin/main` after Glass/Honey mount the Money River composition root.
2. Walk the exact reachable click path at 390 × 844, locally and on the designated live URL.
3. Replace README plus a concise demo script with only observed behavior, verify clean-clone quickstart, and submit the draft to Redline before freeze.
