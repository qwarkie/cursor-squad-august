# Screenshots

Captured from the **live deployment**, not from a dev server:
`https://cursor-squad-august-live.vercel.app`, headless Chromium,
390 × 844, `deviceScaleFactor: 2`, touch enabled.

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
