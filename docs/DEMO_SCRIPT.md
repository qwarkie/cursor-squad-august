# Money River — 60-second demo

Every tap and every figure below was walked on a production build at 390 × 844 and the
numbers are what the app actually renders. Nothing here is from memory.

**Live:** https://cursor-squad-august-live.vercel.app

## Before you start

1. Open the live URL on a phone-width window.
2. **Clear site data**, or tap **Reset** → confirm. The budget persists in `localStorage`, and a
   half-adjusted month from a rehearsal is the worst possible opening frame.
3. You should be looking at a green field, a title, and two buttons. That is the start.

---

## The script

**0:00 — the empty field** *(no tap)*

> "This is a month of money. Right now there isn't any."

An empty green field and one thing to do. No onboarding, no tour.

---

**0:08 — tap `Load demo budget`**

> "Here's a real month. Four thousand two hundred in, and every dollar already spoken for."

| Reads | |
|---|---|
| header | `Income $4,200 · August 2026 · 33% saved` |
| figure | `$0` — `balanced — all allocated` |

**Say the word "balanced" out loud.** `$0` is the app working, not the app broken, and it is the
one thing a judge can misread in the opening second.

---

**0:18 — point at the river, don't tap**

> "Income is the spring at the top. Every category is a tributary that takes water away — and
> below each one, the trunk is visibly thinner. You don't read that you have less left. You watch
> it thin out."

Trunk widths step **24 → 15 → 12 → 10 → 8**. The signboards name each branch, and the settlements
scale with the amount: Housing has **6 houses and 3 residents**, Food has **3 houses**, Transport
**2**. Savings ends in a **reservoir** — water held, not consumed.

> "The biggest expense looks biggest. You can read this map without reading a number."

---

**0:32 — tap the `Food` row, then `−` twice**

> "Say I cook twice more a week."

| Reads | |
|---|---|
| Food | `$650 → $600 → $550` |
| figure | `$100` — `left` |
| sentence | **`Food −$100 → Remaining +$100`** |

> "The tributary narrows, the trunk below it thickens, and the app says the trade in words."

---

**0:44 — tap `+` four times**

> "And if I go the other way —"

| Reads | |
|---|---|
| figure | `−$100` — `over budget` |
| world | dry cracked bed below the last branch, warning sprite, `OVER BUDGET — −$100` |

> "The river runs dry. Not a red number — a riverbed with no water in it."

---

**0:52 — tap `−` twice**

Back to `$0 · balanced — all allocated`. The state is recoverable and the demo is repeatable.

---

**0:56 — close the sheet, tap the income figure in the header**

> "And if the month itself changes —"

Enter `6000` → **`Income $6,000`**, `$1,800 left`, **the whole trunk widens**.

> "Same river, more water."

**Stop there.** 60 seconds.

---

## If you have another 20 seconds

- **Reset** → confirm → the empty green field returns with nothing left over.
- Everything runs with **the network off**. No API, no key, no model call — the demo path is
  fixtures and arithmetic, on purpose.

## Questions you will be asked, and the honest answers

| Question | Answer |
|---|---|
| "Is that real data?" | One month, checked into the repo as a fixture. There's no import and no accounts — that was cut, deliberately. |
| "Does it persist?" | `localStorage`, one month. Reload and it's there. No backend on the demo path at all. |
| "Why 8-bit?" | Text-art sprites rasterised to one `data:` URL and animated on the compositor. No asset files, no sprite editor — `HOUSE` is nine rows of characters in `world/objects.ts`. |
| "What's next?" | Multi-month, and a natural-language scenario field. Both were specified out of scope for the two hours rather than half-built. |

## Contingency — if the network dies at the podium

**Do not debug it in front of a judge.** Switch to the captures and narrate the same script over
them; the beats are identical.

| Beat | Capture |
|---|---|
| 0:00 empty field | [`docs/screenshots/01-empty-field.png`](screenshots/01-empty-field.png) |
| 0:08 seeded month, balanced | [`docs/screenshots/02-seeded-balanced.png`](screenshots/02-seeded-balanced.png) |
| 0:32 adjusting a category | [`docs/screenshots/03-category-sheet.png`](screenshots/03-category-sheet.png) |
| 0:44 over budget | [`docs/screenshots/04-overspent.png`](screenshots/04-overspent.png) |

Second fallback: `npm --prefix frontend install && npm --prefix frontend run dev` runs the whole
demo path locally with no network. The app never calls out.

## The two sentences to land if you only get two

> **"You don't read that you have less money left. You watch the river thin out."**

> **"Every number is exact — the river is how you feel it, the header is how you check it."**
