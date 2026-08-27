# The two instruments

Both take a URL as an argument and exit non-zero on failure, so either can judge
any build — local, preview, or the deployed site — without being edited.

```bash
npm run walk      -- http://localhost:4173    # the demo path, 46 checks
npm run gradients -- http://localhost:4173    # every declared gradient
npm run walk      -- https://<deployment>     # same checks, any build
```

**Always pass the URL, and `gradient_check.py` now refuses to run without it.**

`walk_demo.py` still falls back to `localhost:5173` — a well-known dev port, so
a no-argument run judges whatever is listening there. Running `npm run walk`
bare on a clean `main` reported an alpha scrim removed two commits earlier: it
had reached a stale dev server from another checkout.

Printing the judged URL is not a sufficient mitigation, and the counterexample
is on this repo. A fresh-clone test was nearly published green after Vite had
reported a port collision and moved the app to `5176` — the line was in the
terminal and the run still measured someone else's app. **A plausible URL never
looks wrong**, so a check whose correctness depends on a person reading a line
is the class this file exists to remove. Requiring the argument converts a
silent wrong answer into a loud missing one.

| | asks | answers |
|---|---|---|
| `walk_demo.py` | does the demo path work | the spec's user stories, performed — income edit, the trade-off sentence, overspend and recovery, reset, determinism across two loads, layout at 390 and 320 |
| `gradient_check.py` | does any declared gradient interpolate | art-bible §7 — a gradient with distinct colours at distinct positions emits a ramp, and every value between the stops is off-palette |

Neither is wired into `npm test`. They need a running build, and a check that
cannot run is worse than no check because its absence looks like a pass.

## What a check has to answer before it is trusted here

Four questions, each earned by a check that passed while the thing it named was
broken:

1. **Does it go red on the broken commit?** Otherwise it does not discriminate —
   it complains. A paint check once read `bg-black/50` as opaque, because
   Tailwind v4 emits `oklab(0 0 0 / 0.5)` and the parser knew only `rgba(`. It
   was green on `main` *and* green on the commit it was written for.
2. **What does it print on an empty page?** Every *no bad ones found* assertion
   is true of a blank screen. Two checks scored green on a world with no river
   in it, guarded only by another check happening to run first.
3. **Can it ever go green on a correct one?** A rendered-pixel palette census is
   red forever, because text always anti-aliases: a correct build measured 184
   "off-palette" values and every one was a glyph edge.
4. **Can the observer distinguish the two states at all?** Before any before/after
   verdict, diff the pixels. A zero diff means there is no verdict to give — a
   visual improvement was reported on a branch that was byte-identical across
   the two builds.

## What separated the instruments that held from the ones that did not

Not *selection versus none* — that was the first version of this and it was too
clean. The survivors select too: a pixel diff selects crops by bounding box, a
row scan selects a row index, a coordinate crop selects an x range. One of those
bounding boxes is the same one that contaminated a colour census.

**What separated them is whether the selector's correctness can be checked from
the output.**

```
DID NOT HOLD   the selector was invisible in the result
  a colour match caught signboards — art-bible §2 mandates the hue in three
  places, and the count alone could not show it
  a sprite fingerprint matched the art, not the wrapper carrying offset-path
  a hit-test counted ancestors, so the scan walked the whole header
  an absence assertion over an empty set — nothing to see, so it passed
  a colour regex knew one spelling of alpha and the app emitted another

HELD           the contamination cancelled, or the evidence was printed beside
               the verdict
  a whole-crop pixel diff — the boxes were full of signboard, and signboard is
  identical across two builds, so common-mode contamination contributes zero
  a run-length row scan — grass[76] ink[4] slate[160] ink[4] grass[26] IS the
  evidence; a row through the wrong thing would say so
  a coordinate crop — the confounder named, its x given, put out of frame, and
  checkable by a second person without re-running anything
  the URL as an argument — certified two builds without an edit
  one declaration rendered alone on a blank tile — no confounder to cancel or
  print, because nothing else is in the frame
```

A stop parser sits in the first column: it prints a verdict, not its reasoning.
Three were built for the gradient class and all three withdrawn — the last one
**while it was passing**, on this rule rather than on a red run.

The limit, because it has one: **none of this touches measuring the wrong
quantity.** A derivation from `geometry.ts` constants prints its own reasoning,
needs nothing cancelled, and was still about the tributary's path when the
question turned out to be about its rim.
