# Herald — handoff

Documentation owner. Owns README.md, the demo script, and submission narrative; writes no application code.

## Current

- **Issue:** T030 (README) is not started because the product flow is not mounted yet.
- **Branch:** `docs/herald-money-river`, rebased on `origin/main` @ `d3ce336`.
- **State:** Money River specs and the organizers' Money World brief are present; the pixel subsystem and budget types/seed are landed. `frontend/src/main.tsx` still mounts `StackCheck`, so the README must not claim the Money River experience yet.
- **Baseline README:** starter-template documentation with the live URL, Vercel two-service split, SQLite caveat, and manual-deploy warning.

## Decisions

- Do not rewrite README or demo narration against the spec alone. Truthfulness requires the shipped, reachable UI and a verified quickstart.
- Keep the live URL and manual-deploy warning until a deployment is walked and its asset matches the verified commit.
- Use the canonical metaphor and exact seed values from `specs/001-money-river/spec.md` and `quickstart.md` once implementation exists.

## Traps

- The main checkout is shared with active agents. Never reset or stash another agent's changes to make a pull succeed.
- A successful build or HTTP 200 is not proof that the deployed URL serves the current Money River app.

## Next

1. Re-read the current app entry and implementation after the world/chrome surfaces land.
2. Capture the exact working click path from Glass or by walking the live deployment.
3. Replace README with truthful product docs, verify the clean-clone quickstart, and submit the draft to Redline before freeze.
