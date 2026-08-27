# Quickstart: Money River

Written to be run literally from a fresh clone. The constitution treats a quickstart that overclaims as a defect, so every command here is one that has to actually work.

## The short path (demo path only)

The demo path is entirely client-side — no API, no database, no `uv`, no Python. To run what a judge sees:

```bash
git clone https://github.com/qwarkie/cursor-squad-august.git
cd cursor-squad-august
npm --prefix frontend install
npm --prefix frontend run dev
```

Open http://localhost:5173. You should land on a green field with one button.

## The full path (adds the backend)

Only needed for `optional` work that touches the API. Requires [uv](https://docs.astral.sh/uv/).

```bash
npm run setup     # root + frontend deps, backend deps, migrations
npm run dev       # API on :8000 and the front end on :5173 together
```

## Walking the demo path

This is the sequence a judge watches. Every step must work with **the network disabled** — turn off wifi and run it again before claiming it passes (Constitution, Principle II).

1. **Empty field.** Load with no saved budget (use a private window, or clear the `money-river:budget:v1` key). One green field, one **Add Income** button near the bottom, no river.
2. **The river is born.** Tap **Add Income**, enter `4200`, confirm. A river appears and flows. Header reads income `$4,200`, remaining `$4,200`.
3. **A tributary takes its cut.** Add `Housing`, `1500`. A branch splits off to the right, houses grow at its end, **the trunk below is visibly narrower**, remaining reads `$2,700`.
4. **Again, and the point lands.** Add `Food`, `650`. Second branch, on the left, below the first. Trunk narrows again. Remaining `$2,050`.
5. **Reshape.** Tap the Food tributary. The sheet names it and shows `$650`. Press `−` twice. Amount `$550`, remaining `$2,150`, the tributary visibly thinner, and a line reads `Food −$100 → Remaining +$100`.
6. **Run it dry.** Raise a category past what is left. The trunk below the last branch turns to cracked bed, a warning shows as icon and text, remaining shows an exact negative figure.
7. **Recover.** Bring it back down. Water returns, warning clears.
8. **Reset.** Confirm reset. Back to the empty green field.
9. **One-tap refill.** Tap **Load demo budget**. The full seeded month renders at once — remaining `$0`, the **balanced** state with an empty basin. This is correct, not a bug; see spec Assumptions.

## Verifying before you claim it works

Run these and read the output. Evidence before assertions.

```bash
npm run test        # engine + sprite compiler unit tests
npm run typecheck   # tsc -b, no emit
npm run lint        # eslint + ruff
npm run build       # production build of the front end
```

Then, by eye, at a 390 × 844 viewport in device emulation:

- No horizontal scrollbar.
- Every control at least 44 × 44 px.
- Pixels are crisp, not blurred — if edges look soft, the canvas is on a non-integer scale factor.
- With `prefers-reduced-motion` forced on, the world still renders every state correctly, just still.

## The live deployment

Live: **https://cursor-squad-august-live.vercel.app**

Auto-deploy on push to `main` works, verified on [#5](https://github.com/qwarkie/cursor-squad-august/issues/5#issuecomment-5433182556): the live asset hash is byte-identical to a local `npm run build` of `HEAD`, and production deployments track every direct push.

Three warnings that outlive that fix:

> **`https://cursor-squad-august-app.vercel.app` is the old hand-deployed site.** It still answers 200 and it still serves a build from 26 August. It is not wired to this repository and will never update. Do not submit it, do not walk it, do not cite it.
>
> **`https://money-river.vercel.app` is not ours.** It resolves to an unrelated app. It is the URL somebody will guess from the project name.
>
> **A green build still is not a live demo.** Open the URL and walk the path on it. Auto-deploy proves the bundle shipped, not that the product works.
