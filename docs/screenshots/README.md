# Screenshots

Captured from the **submitted build**, on the live URL, not from a dev server
and not from `main`:

    https://cursor-squad-august-live.vercel.app
    bundle index-Vuol0JCn.js  ==  78a230a, the certified submission
    headless Chromium, 390 × 844, deviceScaleFactor 2, touch enabled

The bundle hash was asserted at capture time and the run aborts if the live URL
is serving anything else, because these are the demo's contingency stills: if the
network dies at the podium, the presenter narrates the same script over these.
**A still that shows a UI the live URL does not render is worse than no still.**

An earlier set was captured before the signboards landed and showed coloured
tributary strokes with no signs — a layout neither the submitted build nor `main`
renders. They loaded fine and were wrong. Verifying that an image is *served* is
not verifying what is *in* it.

| File | State |
|---|---|
| `01-empty-field.png` | First load, no saved budget — green field, **Add Income**, no river |
| `02-seeded-balanced.png` | **Load demo budget** — remaining `$0`, the balanced state |
| `03-category-sheet.png` | Food selected — exact amount, `−` / `+`, slider |
| `04-overspent.png` | Food pushed past income — dry bed, warning, `−$400` |

## Why these are committed rather than linked

Markdown must reference them by **relative path**, e.g.
`![Balanced](docs/screenshots/02-seeded-balanced.png)`. GitHub resolves that
against the repository and serves it to anonymous readers.

Do not link images from a chat relay or any other authenticated host. Those
URLs return **HTTP 401** to a logged-out browser, so the README renders with
broken images for exactly the reader it is written for — verified:

```
$ curl -o /dev/null -w '%{http_code}' https://gartersnake.communities.buzz.xyz/media/<id>.png
401
```

## Refreshing them

Re-capture against the live URL after a deploy, at the same viewport, and say
which commit was live when you did.
