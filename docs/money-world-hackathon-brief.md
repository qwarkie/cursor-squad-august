# Money World

## Mobile-First Hackathon Concept Brief

**One-line pitch:** A personal budget becomes a tiny pixel world that users can understand and reshape in seconds.

## Hackathon Context

- **Build time:** 90 minutes
- **Method:** AI agents handle product scaffolding, frontend, backend, testing, and deployment in parallel
- **Target:** A polished, deployable mobile-first web app with one memorable interaction
- **Priority:** A clear working demo over production completeness
- **Demo story:** Change one expense and immediately watch the world—and the remaining money—respond

## Product Thesis

Traditional budget apps ask users to interpret tables, cards, and charts. **Money World turns the same financial system into a small world users can see and manipulate.**

> What happens if I spend $300 more this month? In a spreadsheet, you calculate it. In Money World, you see it happen.

The product is not a game and not a full banking app. It is a visual financial sandbox for understanding the trade-offs inside one monthly budget.

## Why the Visual Metaphor Is Meaningful

The world is a direct representation of the budget, not decoration:

- Income supplies the world with resources.
- Expense categories consume space and resources.
- Savings create safety and visible resilience.
- Overspending makes a district grow at the expense of the rest of the world.
- Editing a number changes both the financial result and the scene immediately.

This makes allocation, imbalance, and trade-offs easier to notice than in a conventional list of numbers.

## Mobile-First UX

Design for a **390 × 844 px** viewport first. The app is a single vertical screen with no required horizontal scrolling.

Principles:

- One-thumb operation and touch targets of at least 44 × 44 px
- The world is visible immediately, without onboarding
- The primary action is reachable near the bottom of the screen
- Numbers remain readable; visual metaphor never replaces essential labels
- Changes animate quickly, then settle into an unambiguous state
- Desktop uses the same experience in a centered phone-width container

## Core Screen Layout

```text
┌──────────────────────────────────┐
│ Money World          May 2026    │
│ $1,250 left  •  30% saved        │
├──────────────────────────────────┤
│                                  │
│       INTERACTIVE PIXEL WORLD    │
│                                  │
│   homes  market  road  park      │
│              savings vault       │
│                                  │
├──────────────────────────────────┤
│ Selected: Food                   │
│ $650                             │
│ [ − ]  ━━━━━●━━━━━━  [ + ]       │
│ $100 less → Savings +$100        │
├──────────────────────────────────┤
│ [ Reset ]       [ Try scenario ] │
└──────────────────────────────────┘
```

1. **Header:** month, money remaining, and savings rate
2. **World canvas:** tappable pixel-art districts
3. **Bottom sheet:** selected category, amount, slider/stepper, and impact preview
4. **Actions:** reset demo and optionally open the AI scenario input

The bottom sheet may collapse to keep the world prominent. On very small screens, actions remain fixed above the safe-area inset.

## Pixel-Art / 8-Bit Direction

Visual reference: **Stardew Valley × SimCity × a finance dashboard**, without copying their assets or interfaces.

- Warm, optimistic palette with dark navy UI chrome
- Crisp pixel edges; no smoothing on pixel assets
- Simple top-down or slightly isometric tiles
- Limited sprite set: house, market, restaurant, road/car, park/arcade, vault, trees, coins, and water
- Category colors stay consistent between world, labels, and controls
- Small animations only: flowing coins, chimney smoke, building growth, vault glow, and warning pulse
- Use CSS/SVG or a small sprite sheet; avoid Three.js and complex game engines
- Provide text labels and icons so color is never the only signal

## Finance-to-World Mapping

| Finance concept | World element | Visual behavior | User action |
|---|---|---|---|
| Monthly income | Central coin spring / town treasury | Sends coin particles into the town | Display only in MVP |
| Rent / housing | Homes district | More spend creates larger or more homes | Tap and adjust amount |
| Food | Market and restaurant | Buildings grow and become busier | Tap and adjust amount |
| Transport | Roads and moving car | More spend adds road activity | Tap and adjust amount |
| Entertainment | Park / arcade | More spend adds attractions and lights | Tap and adjust amount |
| Savings | Vault and protected green area | Grows, glows, and adds trees as savings rise | Updates from all changes |
| Remaining money | Treasury balance / water level | Rises or falls after every edit | Shown as a headline number |
| Overspending | Cracks, red pulse, or storm cloud | Appears when expenses exceed income | Resolve by reducing a category |

The exact number of buildings can be normalized rather than financially literal. The amount and remaining balance must always be exact.

## MVP Scope

Ship one seeded monthly budget:

```json
{
  "income": 4200,
  "categories": {
    "housing": 1500,
    "food": 650,
    "transport": 350,
    "entertainment": 300,
    "savings": 1400
  }
}
```

Required MVP:

- Single responsive screen
- Seeded demo data; no onboarding required
- Five tappable world elements
- Selected-category bottom sheet
- Slider or `− / +` controls in $50 increments
- Immediate recalculation of remaining money and savings rate
- Visible world response to amount changes
- Overspending state
- Reset-to-default action
- Public deployed URL

If time is tight, use CSS shapes and emoji-like custom pixel icons before adding elaborate sprites.

## Core Interactions

1. **Explore:** Tap a district to see its category and exact monthly amount.
2. **Reshape:** Drag the slider or use `− / +` to change that expense.
3. **Understand:** The affected district changes size/activity; remaining money and savings update instantly.
4. **See the trade-off:** A short message explains the result, for example: `Food −$100 → Remaining +$100`.
5. **Recover:** If expenses exceed income, the town enters a clear warning state until the user reduces spending.
6. **Reset:** Restore the seeded budget for a repeatable demo.

For the MVP, `savings` may be treated as one planned allocation. `remaining = income − sum(all categories)`. Do not silently move money into savings when another category changes; show the new remaining amount directly.

## Minimal Backend / API

The demo can work entirely client-side. Add a minimal backend only if it helps demonstrate a full-stack, agent-driven build.

Suggested endpoints:

```http
GET /api/budget
PUT /api/budget
POST /api/scenario   # stretch feature only
```

Minimal data model:

```ts
type Budget = {
  income: number;
  categories: Record<string, number>;
  updatedAt: string;
};
```

Implementation options, in order of speed:

1. Local React state + `localStorage`
2. One serverless route returning/storing JSON in memory
3. Hosted database only if setup is already automated

No authentication is required. Validate amounts as non-negative numbers and recalculate totals on the server if a backend is used.

## Out of Scope

- Bank connections or transaction imports
- Authentication, accounts, and multiple users
- Real financial advice or forecasting
- Multiple months, historical analytics, and recurring transactions
- Currency conversion, debt schedules, and investment tracking
- Complex game mechanics, free movement, quests, or procedural maps
- Production-grade persistence, security, and accessibility audit
- Native iOS/Android apps

## Optional Stretch AI Feature

Add a single natural-language scenario field:

> “What if I spend $900 on a trip?”

The AI returns structured changes only:

```json
{
  "category": "entertainment",
  "delta": 900,
  "summary": "A $900 trip leaves you with $900 less this month."
}
```

Show a preview and require **Apply scenario** before changing the world. Use schema-validated output and fall back to a deterministic parser for simple dollar amounts. This feature is optional and must not block the core demo.

## 90-Minute Execution Plan

| Time | Goal | Deliverable |
|---|---|---|
| 0–10 min | Align and scaffold | Final data model, component list, repository, deployment target |
| 10–30 min | Build functional UI | Mobile layout, header metrics, category selection, bottom sheet |
| 20–45 min | Build visual world in parallel | Pixel assets/CSS tiles and value-to-visual mapping |
| 30–55 min | Add state and logic | Controls, totals, overspending, reset, local persistence or API |
| 55–70 min | Integrate and polish | Animations, responsive fixes, empty/error states, readable labels |
| 70–80 min | Deploy and test | Public URL, smoke test on a phone-sized viewport |
| 80–90 min | Rehearse demo | Seed data reset, 60-second script, contingency screenshot/video |

Suggested AI-agent split:

- **Agent 1 — Frontend:** layout, components, mobile behavior
- **Agent 2 — Visuals:** pixel world, sprites/CSS, animations
- **Agent 3 — Logic/backend/deploy:** calculations, API/persistence, deployment, smoke test
- **Human integrator:** resolves scope, reviews merges, and rehearses the story

Integrate continuously; do not wait until minute 70 to combine branches.

## Acceptance Criteria

The build is complete when:

- It loads from a public URL without sign-in.
- At 390 × 844 px, all essential content is usable with no horizontal scrolling.
- The initial budget and headline totals are correct.
- Every visible category district is tappable and identifies its amount.
- Changing a category updates exact totals immediately.
- At least one meaningful world property changes with each category value.
- Expenses above income trigger an unmistakable warning state.
- Reset restores the original world and numbers.
- Controls have clear labels and touch targets of at least 44 × 44 px.
- The main demo works even if the AI feature or backend is unavailable.
- A colleague can run, deploy, and demo it from the repository README.

## Short Handoff Summary

Build **Money World** as a single-screen, mobile-first financial sandbox. A seeded monthly budget appears as a small 8-bit town. Users tap a district, change its expense, and immediately see both the exact financial impact and a meaningful visual response in the world. Keep the core deterministic, client-side, and deployable within 90 minutes. Prioritize the tap → adjust → world reacts loop; treat the backend and natural-language AI scenario as optional layers.

**Demo in one sentence:** “I reduce Food by $100, the market shrinks, my remaining money increases by $100, and the whole financial trade-off becomes visible.”
