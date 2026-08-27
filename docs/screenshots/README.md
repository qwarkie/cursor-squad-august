# Screenshots

## Provenance — a stamp, not a currency claim

    captured from   https://cursor-squad-august-live.vercel.app
    serving         assets/index-DHlJcBWS.js  ==  8cb5322
    on              2026-08-27
    how             headless Chromium, 390 x 844, deviceScaleFactor 2, touch on

That is a historical fact and it stays true. **These files do not claim to show
what the URL serves today**, and they must not — the host is git-linked and
deploys unattended whenever its per-project build quota allows, so any sentence
here asserting currency expires the moment a push lands. Two earlier versions of
this file made exactly that claim and both were false within the hour.

## The check

Whether a still still matches the submitted URL is a question you answer, not
one this file can answer for you:

    curl -s https://cursor-squad-august-live.vercel.app \
      | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'

If that hash is not the one stamped above, the stills predate the live build.
**That is an honest lag, not a defect.** Re-capture when someone is about to
rely on them — before a demo, before a submission — and re-stamp. Nobody
re-captures on a schedule, and nobody writes "these are current" instead.

`scripts/capture_stills.py <url>` produces a set and prints the stamp above. It
reads the bundle name before the first frame and again after the last, and
discards the set if they differ — so a deploy landing mid-run can never leave a
set silently mixed across two builds. The URL is required; there is no default.

## What went wrong three times, because none of it expires

    1  captured before the signboards landed, committed as current   the capture was wrong
    2  captured before the header fix, committed as current          the capture was wrong
    3  captured correctly from 78a230a — and the HOST moved to 863822d

The third is the one this file is now shaped around. **The images did not
change; the ground under them did.** The `78a230a` set showed a gradient empty
field — the smooth ramp removed at `768ac6b` for emitting 58 colours, 57 of
them outside the twenty — so narrating the demo script over it would have shown
a judge a known art-bible violation on the opening frame.

The check that catches all three is the same one: **does a fresh capture of the
submitted URL match what is committed.** Hashes, not timestamps — a
`last-modified` header is CDN revalidation time and has already misled one
reading tonight.

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

