# Feature Specification: Money River

**Feature Branch**: `001-money-river`

**Created**: 2026-08-26

**Status**: Draft

**Input**: User description: "A finance tracker with cartoon 8-bit animation, mobile first. It starts as just a green field and an Add Income button. Once income is added, an animated river appears, representing the flow of money. The river shrinks through branching tributaries. Along its banks stand little houses and villagers." Plus the Money World hackathon brief (mobile-first pixel budget sandbox, 390×844, seeded budget, tap-to-adjust, deployed URL).

## The Metaphor (canonical)

A month of money is **one river**.

- **Income** is the spring at the top. It sets how wide the river starts.
- **Each expense category** is a **tributary** that branches off sideways and carries water away.
- **Below every branch the trunk is visibly narrower** — that is the whole point of the product. You do not read that you have less money left; you watch the river thin out.
- **Settlements** (houses, and residents that appear at higher amounts) sit at the end of each tributary. They are what the money turned into.
- **Savings** is a tributary that ends in a **reservoir**, not a settlement — the water is held, not consumed.
- **What reaches the bottom** is money remaining, shown as a pool at the river mouth.

This supersedes the "town with districts" mapping in the hackathon brief. The brief's sprite vocabulary (homes, market, road, park, vault, trees, coins, water) survives; its layout as tappable districts does not. See Assumptions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The river is born (Priority: P1)

A person opens the app on a phone and sees an empty green field and one button: **Add Income**. They tap it, type a monthly income, and confirm. A river springs into existence and starts flowing down the field, its width set by the amount they entered.

**Why this priority**: This is the memorable opening frame and the only moment that teaches the metaphor without a word of onboarding. Nothing else in the product means anything until the river exists.

**Independent Test**: Load the app with no stored data, add an income, and confirm a flowing river renders at a width proportional to the amount, with the exact amount readable as a number. Delivers the core "money is a flow" idea on its own.

**Acceptance Scenarios**:

1. **Given** a first load with no saved budget, **When** the app renders, **Then** the screen shows a green field, no river, and a single primary action **Add Income** placed within thumb reach at the bottom.
2. **Given** the empty state, **When** the person enters `4200` and confirms, **Then** the river appears with an entry animation, flows continuously from top to bottom, and the header reads income `$4,200` and remaining `$4,200`.
3. **Given** a river exists, **When** the person edits the income to a larger number, **Then** the trunk widens and the header updates, with no page reload.
4. **Given** an income of `0` or empty input, **When** the person confirms, **Then** the input is rejected with a visible message and no river is created.

---

### User Story 2 - A tributary takes its cut (Priority: P1)

The person adds an expense category — a name and an amount. A tributary splits off the trunk, water visibly diverts into it, settlements grow at its end, and **the trunk below the branch becomes narrower**. The remaining figure drops by exactly that amount.

**Why this priority**: This is the demo. Story 1 without Story 2 is a screensaver; Story 2 is where a budget becomes visible as a trade-off.

**Independent Test**: With a river present, add one expense and confirm three things change together — a new tributary renders, the trunk width below it decreases, and remaining decreases by exactly the amount entered.

**Acceptance Scenarios**:

1. **Given** an income of `$4,200` and no expenses, **When** the person adds `Housing $1,500`, **Then** a tributary branches off, the trunk below it is narrower than above it, and remaining reads `$2,700`.
2. **Given** one tributary exists, **When** a second expense is added, **Then** it branches **below** the first, and the trunk narrows again at that point — branches are ordered top to bottom in the order they were added.
3. **Given** a tributary is rendered, **When** its amount is large enough, **Then** more settlements stand at its end than for a small amount, and at least one residents sprite is animating.
4. **Given** a savings category is added, **When** it renders, **Then** it ends in a reservoir rather than settlements, and its water is visibly held rather than consumed.
5. **Given** any set of tributaries, **When** the widths are measured, **Then** trunk width below the last branch corresponds to remaining, and the sum of tributary widths plus the final trunk width corresponds to income.

---

### User Story 3 - Reshape and see the trade-off (Priority: P2)

The person taps a tributary. A bottom sheet names the category, shows its exact amount, and offers `−` / `+` in $50 steps and a slider. As they change it, the tributary and the trunk below re-size, settlements appear or disappear, and the header numbers update immediately. A one-line message states the trade-off.

**Why this priority**: Turns the visualization into a sandbox. High value, but the demo already reads without it — Stories 1 and 2 alone tell the story.

**Independent Test**: Tap a rendered tributary, press `−` twice, and confirm the amount drops by `$100`, remaining rises by `$100`, and the tributary is visibly thinner.

**Acceptance Scenarios**:

1. **Given** tributaries are rendered, **When** the person taps one, **Then** a bottom sheet opens naming that category with its exact amount, and the tapped tributary is visibly highlighted.
2. **Given** `Food $650` is selected, **When** `−` is pressed twice, **Then** the amount reads `$600` then `$550`, remaining rises by `$100` in total, and a line reads `Food −$100 → Remaining +$100`.
3. **Given** a category is selected, **When** the amount is driven to `$0`, **Then** the tributary closes, its settlements are removed, and the trunk below returns to its pre-branch width.
4. **Given** a category amount changes, **When** the world re-renders, **Then** widths animate to the new value rather than snapping, and settle within one second.
5. **Given** the bottom sheet is open, **When** the person dismisses it, **Then** the world remains at the new values and no change is lost.

---

### User Story 4 - The river runs dry (Priority: P2)

When tributaries claim more than the spring supplies, the trunk below the last branch runs dry — a cracked bed instead of water — and the world enters an unmistakable warning state until spending comes down.

**Why this priority**: Overspending is the one state a budget app must not render ambiguously, and the brief lists it as an acceptance criterion. It depends on Story 3 to be recoverable.

**Independent Test**: Push category amounts past income and confirm the dry-bed state and the exact negative remaining figure both render, then reduce a category and confirm the state clears.

**Acceptance Scenarios**:

1. **Given** income `$4,200` and expenses totalling `$4,600`, **When** the world renders, **Then** the trunk below the last branch shows a dry cracked bed, a warning is visible as text and shape (not colour alone), and remaining reads `−$400`.
2. **Given** the overspent state, **When** a category is reduced enough to clear it, **Then** water returns to the trunk and the warning disappears.
3. **Given** expenses equal income exactly, **When** the world renders, **Then** the state reads as **balanced** — an empty basin at the mouth, distinct from the dry cracked bed — and remaining reads `$0`.

---

### User Story 5 - Demo budget and reset (Priority: P2)

From the empty field, a secondary action loads a complete seeded month in one tap. A reset returns the app to the empty green field.

**Why this priority**: The empty start is the memorable frame, but a judge should not watch six numbers get typed. One tap fills the world; one tap empties it, so the demo is repeatable.

**Independent Test**: From an empty field, tap **Load demo budget** and confirm the full seeded river with all tributaries renders; tap reset and confirm the empty field returns.

**Acceptance Scenarios**:

1. **Given** the empty state, **When** **Load demo budget** is tapped, **Then** the seeded month renders complete with all its tributaries and the header totals match the seed exactly.
2. **Given** any state, **When** reset is confirmed, **Then** the app returns to the empty green field with the **Add Income** button and no residual river.
3. **Given** the app is reloaded, **When** a budget was previously entered, **Then** it is restored from local storage; if storage is empty or unreadable, the empty field renders rather than an error.

---

### Edge Cases

- **Very many categories.** Beyond the count that fits the canvas height, further tributaries must remain reachable and legible rather than overlapping; the world scales branch spacing down to a floor, then the list scrolls.
- **Very large or very small amounts.** A category worth a rounding fraction of income must still render as a visible tributary at minimum width, and must still be tappable at the 44 px minimum. A single category near 100% of income must not squeeze the trunk to invisibility before its branch point.
- **Amount exceeds income on a single category.** Permitted; the world goes to the overspent state rather than clamping the input.
- **Negative or non-numeric input.** Rejected with a visible message; the world does not change.
- **Reduced-motion preference.** The world renders and updates correctly with flow animation and particles suppressed; width changes and state remain readable.
- **No network, no API, no model call.** Every scenario above holds — the demo path is fully client-side (Constitution, Principle II).
- **Storage unavailable or corrupt.** Treated as first load. A failed write surfaces a visible error (Constitution, Additional Constraints).
- **Rotation and small screens.** At 320 px wide the world and controls remain usable with no horizontal scroll.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render an empty green field with a single primary **Add Income** action when no budget exists.
- **FR-002**: Users MUST be able to enter and later edit a monthly income as a non-negative number.
- **FR-003**: System MUST render a continuously animated river whose trunk width at the spring is proportional to income.
- **FR-004**: Users MUST be able to add an expense category with a name and an amount.
- **FR-005**: System MUST render each category as a tributary branching off the trunk, ordered top to bottom by the order the categories were added.
- **FR-006**: System MUST narrow the trunk below each branch so that trunk width corresponds to income minus the sum of all tributaries above that point.
- **FR-007**: System MUST render settlements at the end of each expense tributary, in a count that increases with the amount, and MUST render a reservoir instead for a savings category.
- **FR-008**: System MUST display exact figures for income, each category amount, and remaining, where `remaining = income − sum(all category amounts)`. Money moves between categories only when the user moves it.
- **FR-009**: Users MUST be able to select a tributary by tapping it and adjust its amount in $50 steps, and via a slider.
- **FR-010**: System MUST update every affected number and every affected width within the same interaction, with no reload and no save step.
- **FR-011**: System MUST state the trade-off of the last change in words, naming the category, its delta, and the resulting change to remaining.
- **FR-012**: System MUST render three distinct terminal states — surplus, balanced (`remaining == 0`), and overspent (`remaining < 0`) — and MUST signal overspend by shape and text, never by colour alone.
- **FR-013**: Users MUST be able to load a complete seeded month in one action from the empty state, and to reset back to the empty field.
- **FR-014**: System MUST persist the budget locally across reloads, and MUST surface any failure to persist as a visible error.
- **FR-015**: System MUST produce identical world geometry for identical budget input on every load, with no dependence on the clock, the network, or an unseeded random source.
- **FR-016**: System MUST honour `prefers-reduced-motion` by suppressing continuous motion while keeping every state and figure readable.
- **FR-017**: System MUST operate with no network access, no API key, and no model call on every path above.
- **FR-018**: System MUST present all essential content and controls at a 390 × 844 viewport with no horizontal scrolling, with touch targets no smaller than 44 × 44 px.

### Key Entities

- **Budget**: one month. Holds an income figure and an ordered list of categories. The single source of truth; everything visual is derived from it.
- **Category**: a named claim on the income, with an amount and a kind — `expense` or `savings`. Its order in the list fixes where its tributary meets the trunk.
- **River model**: the derived geometry — trunk segments with the amount each carries, tributaries with their widths and settlement counts, the remaining figure, and the terminal state. Derived, never edited directly, and a pure function of the Budget.
- **Settlement**: a house or resident standing at the end of an expense tributary. Its count is a normalized function of the amount, not a literal one.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From a cold load, a person reaches a flowing river in under 15 seconds using only the **Add Income** button, without instructions.
- **SC-002**: A person who has never seen the app can state what the narrowing trunk means after watching one category be added, without being told.
- **SC-003**: Every amount change is reflected in both the numbers and the world within 300 ms of the input, and animation settles within 1 second.
- **SC-004**: The world holds at least 30 fps on a mid-range phone at the 390 × 844 viewport with the full seeded budget rendered.
- **SC-005**: The complete demo path — empty field, add income, add categories, adjust one, trigger and clear overspend, reset — runs end to end with the network disabled.
- **SC-006**: The deployed public URL serves the same demo path with no sign-in.
- **SC-007**: Two consecutive loads of the same budget produce pixel-identical world geometry.
- **SC-008**: At 390 × 844 no essential control falls below 44 × 44 px and no horizontal scrollbar appears.

## Assumptions

- **The river supersedes the town.** The brief's district layout is dropped in favour of the river the product owner specified verbally. The brief's sprite vocabulary and its finance-to-world intent are kept. This is a deliberate deviation, recorded here rather than left to discovery.
- **The brief's seed contradicts itself and is resolved toward the brief's text.** The brief's mock header reads `$1,250 left • 30% saved` while its seed — income `4200`, housing `1500`, food `650`, transport `350`, entertainment `300`, savings `1400` — sums to exactly `4200`, leaving `$0`. The brief's own rule wins: `remaining = income − sum(all categories)`, so the seeded month loads at **remaining `$0`, the balanced state**. The balanced state is therefore a first-class visual, not an edge case, and the demo script's first move creates surplus. If a non-zero opening surplus is wanted instead, that is a seed change, not a rule change.
- **Cold start is empty by design.** The brief calls for seeded data and no onboarding; the product owner calls for an empty field. Both are served: empty field first, one-tap seed alongside it.
- **Settlement counts are normalized, not literal.** Amounts and remaining are exact; how many houses stand by a tributary is a display decision.
- **Savings is an allocation, not a leftover.** A savings category consumes income like any other and is shown as held rather than spent.
- **One month, one currency, no accounts.** No transaction import, no history, no auth, no multi-month — all out of scope per the brief.
- **The backend is off the demo path.** Everything above renders from client state and checked-in fixtures (Constitution, Additional Constraints). Any API persistence is `optional` work.
- **The natural-language scenario feature is out of scope for this spec.** It is a stretch layer in the brief and would be specified separately.
