# `pixel/` — authoring 8-bit objects

No sprite editor, no binary assets. An object is plain text in a `.ts` file,
so anyone (or an agent) can add a house in twelve lines and `git diff` shows
the change as pixels.

```tsx
const PAL = { '.': null, r: '#c0392b', w: '#f4d9a0', k: '#1b2a4a' }
const HOUSE = ['..kkk..',
               '.krrrk.',
               'kwwwwwk',
               'kkkkkkk']

<PixelSprite art={HOUSE} palette={PAL} scale={6} alt="Housing district" />
```

Animate by passing several frames of identical size:

```tsx
const VILLAGER = [['.k.', 'kkk', 'd.d'],
                  ['.k.', 'kkk', '.dd']]

<PixelSprite art={VILLAGER} palette={PAL} scale={8} fps={4} />
```

## How it renders

Frames are rasterised to RGBA, packed into one horizontal strip, and encoded as
a single `data:` URL. Animation is a CSS `steps()` keyframe walking
`background-position` — it runs on the compositor, so a screen full of animated
sprites costs zero React re-renders and zero timers.

- `raster.ts` — pure, DOM-free, unit-tested (`raster.test.ts`)
- `sprite.ts` — canvas encoding, memoised per art+palette
- `PixelSprite.tsx` — the component

## Rules that bite

- **Every row in a frame must be the same length**, and every frame the same
  size. Both throw — a ragged sprite is an authoring typo that is nearly
  invisible on a phone.
- **Palette must define every character used.** Unknown characters throw
  rather than rendering transparent.
- `null` in the palette means transparent.
- **Use integer `scale`.** Fractional values put pixel edges between device
  pixels and the sprite blurs.

## Moving things along a path

Money flowing through the world is CSS, not a physics loop: put the element on
an SVG path with `offset-path` and animate `offset-distance` (keyframe
`pixel-flow`, defined in `index.css`).

```tsx
<span style={{ offsetPath: `path('${RIVER}')`, offsetRotate: '0deg',
               animation: 'pixel-flow 3s linear infinite' }}>
  <PixelSprite art={COIN} palette={PAL} scale={4} />
</span>
```

**`offsetRotate: '0deg'` is not optional.** The default is `auto`, which turns
the element to follow the curve and shears the pixel grid into diagonal mush.

See `../StackCheck.tsx` for a page exercising all of the above; mount it from
`main.tsx` to look at it.
