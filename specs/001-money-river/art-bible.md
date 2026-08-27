# Art Bible: Money River

The contract for anything drawn. Follow it and two people drawing different objects produce one coherent world.

It documents the system that **already exists** in [`frontend/src/pixel/`](../../frontend/src/pixel/README.md) rather than proposing a new one. Where this file and that code disagree, the code is right and this file is the bug.

## 1. Coordinates and scale

The world is **96 × 128 art-pixels**. Every coordinate in `RiverModel` is in that space.

Two things draw into it, and **they do not share a coordinate system** — this is the single most likely thing to get wrong:

| Layer | Coordinate space | Set by |
|---|---|---|
| The river SVG | art-pixels | `viewBox="0 0 96 128"` |
| Sprites and coins in the DOM | **CSS pixels** | `art × scale` |

A coin riding the river with `offset-path` is a DOM element, so its path must be in **CSS pixels**, while the identical curve inside the SVG is in art-pixels. One helper emits both, and nothing else builds a path string:

```ts
// frontend/src/world/path.ts
export function riverPath(model: RiverModel): string        // art units — for the SVG
export function scalePath(d: string, scale: number): string // CSS px   — for offset-path
```

Get this wrong and the coins drift off the water. It reads as broken and is easy to miss on desktop, where the scale factor is larger and the drift is proportionally smaller.

### Scale table

**Integer factors only.** A fractional scale puts pixel edges between device pixels and every sprite goes soft.

| Viewport width | Scale | World size in CSS px |
|---|---|---|
| 320–389 px | ×3 | 288 × 384 |
| 390–479 px | ×4 | 384 × 512 |
| 480–599 px | ×5 | 480 × 640 |
| 600 px and up | ×6 | 576 × 768, centred |

### The river must not be smooth

Every SVG path in the river carries `shape-rendering="crispEdges"`. It disables anti-aliasing and produces the stair-stepped edge that reads as 8-bit. Without it the river is the one smooth-edged object in a hard-edged world and looks like a rendering bug.

Flow width is the path's **`stroke-width`**, taken straight from `RiverModel`. No other element encodes it.

## 2. The palette

**20 colours plus transparent. Hard cap 20.** Nothing is drawn in a colour that is not on this list — that constraint is most of what makes art from different hands look like one game.

The single-character keys are the ones used in text art. The first eight are already in the code; the rest extend that set.

| Char | Name | Hex | Used for |
|---|---|---|---|
| `.` | — | transparent | Empty space (`null` in the palette) |
| `k` | ink | `#1b2a4a` | **Outline on every sprite.** The dark keyline is what makes the style read. |
| `n` | night | `#101a33` | Page background, UI chrome |
| `w` | cream | `#f4d9a0` | Walls, lit faces |
| `p` | paper | `#f4efe4` | Text on dark, labels |
| `b` | water | `#2b7fd4` | River core |
| `l` | waterLit | `#5cb3ff` | Crest highlight, the mouth pool |
| `u` | waterDeep | `#17538f` | Shadow side of the water |
| `g` | grass | `#4caf50` | The green field |
| `e` | grassDark | `#2f6b30` | Bank shadow, foliage shade |
| `h` | grassLit | `#7ac36f` | Field highlight, tufts |
| `s` | sand | `#c8a26a` | Dry riverbed, paths |
| `y` | gold | `#ffd94a` | Coins, the spring, income |
| `o` | goldLit | `#fff0b0` | Coin sparkle |
| `d` | wood | `#7b4a2d` | Doors, trunks, posts |
| `r` | brick | `#c0392b` | **Housing** |
| `f` | wheat | `#e08c3a` | **Food** |
| `t` | slate | `#6b7a99` | **Transport** |
| `m` | plum | `#8a4fa8` | **Entertainment** |
| `v` | teal | `#2fa88a` | **Savings** |
| `a` | alert | `#e0453f` | Overspend warning |

Defined once in `frontend/src/world/palette.ts` as a `Palette`, and as CSS custom properties in `frontend/src/index.css`, so sprites and chrome share literal values.

**Category colour is one value in three places** — the tributary stroke, the label, and the bottom-sheet control — so the connection is visible without reading. It lives on `Category.color`.

`alert` and `brick` are both reds and sit close. That is tolerable only because **colour is never the only signal**: overspend is a cracked bed *and* an icon *and* a sentence (FR-012). Never lean on the two being told apart.

## 3. Authoring an object

An object is **text in a `.ts` file**. No sprite editor, no binary assets, no `public/` directory, no loader. A stranger adds a house in twelve lines, and the pull request diff shows the change as pixels.

```tsx
import { PixelSprite } from '../pixel'
import { PAL } from './palette'

const HOUSE = [
  '...kkk...',
  '..krrrk..',
  '.krrrrrk.',
  'krrrrrrrk',
  'kwwwwwwwk',
  'kwyykwwwk',
  'kwyykwddk',
  'kwwwwwddk',
  'kkkkkkkkk',
]

<PixelSprite art={HOUSE} palette={PAL} scale={4} alt="Housing" />
```

Animate by passing several frames of identical size:

```tsx
const RESIDENT = [
  ['.kkk.', '.kyk.', 'kkkkk', '.k.k.', '.d.d.'],
  ['.kkk.', '.kyk.', 'kkkkk', '.k.k.', '.dd..'],
]

<PixelSprite art={RESIDENT} palette={PAL} scale={4} fps={4} />
```

How it renders, and why it is cheap: frames are rasterised to RGBA, packed into one horizontal strip, and encoded as a single `data:` URL. Animation is a CSS `steps()` keyframe walking `background-position`. **A screen full of animated sprites costs zero React re-renders and zero timers** — it runs on the compositor.

### Rules that throw

These fail loudly at authoring time rather than producing subtly wrong art that nobody spots on a phone:

- Every row in a frame is the same length, and every frame the same size.
- Every character used is defined in the palette. An unknown character throws; it does not render transparent.
- `null` in the palette means transparent.
- `scale` is an integer. Fractional values blur the sprite.
- `alt` is set for anything meaningful and left empty for decoration — the component switches between `role="img"` and `aria-hidden` on it.

## 4. Object inventory

Everything the demo path needs. Each is one claimable task, independent of every other. Sizes are the contract — the layout is built against them, so changing a size means changing this table first.

| Object | Size (art-px) | Frames | Where | Priority |
|---|---|---|---|---|
| `COIN` | 5 × 5 | 2 | Rides the river on `offset-path` | spine |
| `HOUSE` | 9 × 9 | 1 | Housing tributary | spine |
| `RESIDENT` | 5 × 5 | 2 | Beside settlements | spine |
| `MARKET` | 12 × 9 | 2 | Food tributary | spine |
| `SPRING` | 16 × 12 | 2 | Top of the trunk, gold | spine |
| `RESERVOIR` | 24 × 16 | 2 | Savings tributary terminus | spine |
| `CRACK` | 8 × 8 | 1 | Overlays the dry bed when overspent | spine |
| `WARNING` | 9 × 9 | 2 | Overspend, pulses | spine |
| `CAR` | 8 × 5 | 2 | Transport tributary, rides its bank | optional |
| `ARCADE` | 10 × 10 | 2 | Entertainment tributary, blinking | optional |
| `TREE` | 7 × 9 | 2 | Bank decoration, sways | optional |

**Not sprites.** The trunk, the tributaries, and the mouth pool are SVG paths — their width is live data, not fixed art. The dry bed is the trunk path stroked in `sand` with `CRACK` sprites laid over it.

Two frames is usually enough. Prefer two good frames to four mediocre ones — at 4–8 fps and scale 4, nobody is counting.

## 5. Motion

The keyframes exist in `frontend/src/index.css`:

- **`pixel-strip`** — walks `background-position-x` across the sprite strip. Frame animation.
- **`pixel-flow`** — drives `offset-distance` from 0% to 100%. Anything riding the river.

| Motion | Timing | Notes |
|---|---|---|
| Sprite frames | 4–8 fps | One rate per object kind. Mixed rates across similar objects read as broken. |
| Coins down the river | 3 s per traverse, staggered | Stagger by index; never randomise, or geometry stops being reproducible (FR-015). |
| Coin density | scales with `stroke-width` | Density *is* the data — a thin river visibly carries fewer coins. |
| Tributary opens | 400 ms ease-out | `stroke-width` 0 → target. |
| Width change | 300 ms ease-out | Every affected path transitions together (FR-010, SC-003). |
| Settlement appears | 250 ms | Scale-in on the wrapper, not on the sprite art. |
| Warning pulse | 600 ms loop | Scale and opacity, not hue. |
| Bottom sheet | 250 ms ease-out | `motion`, in the DOM layer. |
| Header number | 200 ms count-up | The exact figure lands before the world settles. |

**Everything settles inside 1 second** (SC-003). A world still moving when the judge looks away reads as unresolved.

**`offset-rotate: 0deg` on every element riding a path.** The default is `auto`, which rotates the element to follow the curve and shears the pixel grid into diagonal mush. This is not optional and it is not obvious.

**Reduced motion** is already handled globally in `index.css`: under `prefers-reduced-motion: reduce`, all animations and transitions collapse to `0.01ms`. Continuous motion stops and every state stays readable, which satisfies FR-016. Optionally, meaning-carrying transitions — width and number changes — may be re-enabled at 150 ms; that is a refinement, not a requirement.

## 6. Type

`Press Start 2P` via `@fontsource/press-start-2p`, self-hosted and imported in `index.css`. A font CDN is a network dependency and breaks Principle II. Exposed as the Tailwind theme token `--font-pixel`.

It is a display face and it is wide. Use it for header figures, category labels, and button text. **Do not** set body copy or the trade-off sentence in it — those use the system stack so they stay readable at 390 px.

Sizes: header figure 12–16 px, labels 10 px, small captions 8 px. Never scale it fractionally.

## 7. Non-negotiables

1. Integer scale factors only.
2. `image-rendering: pixelated` on sprites, `shape-rendering="crispEdges"` on river paths. No smoothing anywhere.
3. No colour outside the 20.
4. `offset-rotate: 0deg` on anything riding a path.
5. No colour-only signals.
6. Touch targets ≥ 44 × 44 CSS px, whatever the art measures.
7. No asset files. If it cannot be expressed as text art or an SVG path, it needs a decision, not a `.png`.
