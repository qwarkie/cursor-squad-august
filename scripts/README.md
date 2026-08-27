# The two instruments

Both take a URL as an argument and exit non-zero on failure, so either can judge
any build — local, preview, or the deployed site — without being edited.

```bash
npm run walk      -- http://localhost:4173    # the demo path, 46 checks
npm run gradients -- http://localhost:4173    # every declared gradient
npm run walk      -- https://<deployment>     # same checks, any build
```

**Always pass the URL.** With no argument `walk_demo.py` falls back to
`localhost:5173` and `gradient_check.py` to `localhost:4173` — well-known dev
ports, so a no-argument run judges whatever happens to be listening there.
Running `npm run walk` bare on a clean `main` produced a failure for an alpha
scrim removed two commits earlier: it had found a stale dev server from another
checkout. Both print the URL they are judging on the first line. Read it.

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

## Where instruments died

Every instrument that failed here failed at a **selection** or a **parse**.
Every one that survived had neither.

```
selection   a colour match caught signboards, because art-bible §2 mandates
            the same hue in three places
            a sprite fingerprint matched the art, not the wrapper carrying
            offset-path, so moving coins were measured as scenery
            a hit-test counted ancestors, so the scan walked the whole header
parse       a colour regex knew one spelling of alpha and the app emitted
            another
            two attempts at a gradient stop parser were withdrawn rather than
            tuned — % , deg and clamped zeros, and a legitimate hard-stop
            conic reads as interpolating

survived    a whole-crop pixel diff — never asked what a pixel was
            a run-length scan across one row — no selector to get wrong
            isolating a band by coordinate rather than by hue
            rendering one declaration alone on a blank tile — no text in the
            frame to anti-alias, no syntax interpreted
```

The limit, because it has one: **no selector and no parser buys freedom from
contamination. It buys nothing against measuring the wrong quantity.** A
derivation from `geometry.ts` constants was uncontaminated, correct, and silent
about the question being asked.
