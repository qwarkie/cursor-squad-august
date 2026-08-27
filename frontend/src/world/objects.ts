import type { Art } from '../pixel'

/**
 * The object inventory from specs/001-money-river/art-bible.md §4.
 *
 * Text art only. This module deliberately does not import `PAL` — a sprite is
 * characters, and the palette is applied at the render site by `PixelSprite`.
 * Keeping the two apart is what lets art land without waiting on the palette,
 * and it is why `objects.test.ts` checks characters against the art bible
 * rather than against whatever `palette.ts` happens to contain.
 *
 * Sizes are the contract, not a suggestion: the layout is built against the
 * table in art-bible.md §4, so changing a size means changing that table
 * first. `objects.test.ts` fails if any sprite drifts from it.
 */

/** 5 x 5, 2 frames. Rides the river on `offset-path` (T012, T013). */
export const COIN: readonly Art[] = [
  ['.kkk.', 'koyyk', 'kyyyk', 'kyyyk', '.kkk.'],
  ['..k..', '.kyk.', '.kyk.', '.kyk.', '..k..'],
]

/** 16 x 12, 2 frames. The spring at the top of the trunk (T012). */
export const SPRING: readonly Art[] = [
  [
    '.....kkkkkk.....',
    '...kkyyyyyykk...',
    '..kyyollllooyyk.',
    '.kyyollllllooyyk',
    'kyyobbbbbbbbooyk',
    'kyyobbllllbbooyk',
    'kyyobbbbbbbbooyk',
    '.kyyoobbbbooyyk.',
    '..kyyoobbooyyk..',
    '...kkyybbyykk...',
    '.....kbbbbk.....',
    '......kbbk......',
  ],
  [
    '.....kkkkkk.....',
    '...kkyyyyyykk...',
    '..kyyollllooyyk.',
    '.kyyollllllooyyk',
    'kyyobbllllbbooyk',
    'kyyobbbbbbbbooyk',
    'kyyobbllllbbooyk',
    '.kyyoobbbbooyyk.',
    '..kyyoobbooyyk..',
    '...kkyybbyykk...',
    '.....kbbbbk.....',
    '......kbbk......',
  ],
]

/**
 * 9 x 9, 1 frame. Stands at the end of an expense tributary (T017).
 * Moved verbatim from `StackCheck.tsx`; it is also the worked example in
 * art-bible.md §3, so it is the one sprite whose pixels are already spec.
 */
export const HOUSE: Art = [
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

/**
 * 5 x 5, 2 frames. Appears beside settlements at higher amounts (T017).
 *
 * Moved from `StackCheck.tsx`, where it was named VILLAGER, with one change:
 * the torso row was `kkkkk`, all ink, which renders as an unreadable dark
 * blob at 5 x 5 next to a cream-walled HOUSE. It is now `kwwwk` — ink arms,
 * cream body — so the figure reads at scale 4 on a phone. Revert by putting
 * that one row back if the original was deliberate.
 */
export const RESIDENT: readonly Art[] = [
  ['.kkk.', '.kwk.', 'kwwwk', '.k.k.', '.d.d.'],
  ['.kkk.', '.kwk.', 'kwwwk', '.k.k.', '.dd..'],
]

/** 12 x 9, 2 frames. The food tributary; the awning flutters (T017). */
export const MARKET: readonly Art[] = [
  [
    '.kkkkkkkkkk.',
    'kfwfwfwfwfwk',
    'kkkkkkkkkkkk',
    'kwwwwwwwwwwk',
    'kwyywwwwyywk',
    'kwyywwwwyywk',
    'kwwwwddwwwwk',
    'kwwwwddwwwwk',
    'kkkkkkkkkkkk',
  ],
  [
    '.kkkkkkkkkk.',
    'kwfwfwfwfwfk',
    'kkkkkkkkkkkk',
    'kwwwwwwwwwwk',
    'kwyywwwwyywk',
    'kwyywwwwyywk',
    'kwwwwddwwwwk',
    'kwwwwddwwwwk',
    'kkkkkkkkkkkk',
  ],
]

/**
 * 24 x 16, 2 frames. The savings terminus (T018).
 *
 * Held water, not consumed water — a teal rim, deep water inside, and a sand
 * dam across the bottom. This is the one terminus that is not settlements,
 * and it is the only visual that distinguishes a savings category from an
 * expense one (spec US2 scenario 4).
 */
export const RESERVOIR: readonly Art[] = [
  [
    '....kkkkkkkkkkkkkkkk....',
    '..kkvvvvvvvvvvvvvvvvkk..',
    '.kvvuuuuuuuuuuuuuuuuvvk.',
    'kvvuubbbbbbbbbbbbbbuuvvk',
    'kvuubbbbllllllbbbbbbuuvk',
    'kvuubbbbbbbbbbbbbbbbuuvk',
    'kvuubbllllllllllbbbbuuvk',
    'kvuubbbbbbbbbbbbbbbbuuvk',
    'kvuubbbbbbllllllbbbbuuvk',
    'kvuubbbbbbbbbbbbbbbbuuvk',
    'kvvuubbbbbbbbbbbbbbuuvvk',
    '.kvvuuuuuuuuuuuuuuuuvvk.',
    '..kkvvvvvvvvvvvvvvvvkk..',
    '...kkssssssssssssssskk..',
    '..kssssssssssssssssssk..',
    '..kkkkkkkkkkkkkkkkkkkk..',
  ],
  [
    '....kkkkkkkkkkkkkkkk....',
    '..kkvvvvvvvvvvvvvvvvkk..',
    '.kvvuuuuuuuuuuuuuuuuvvk.',
    'kvvuubbbbbbbbbbbbbbuuvvk',
    'kvuubbbbbbllllllbbbbuuvk',
    'kvuubbbbbbbbbbbbbbbbuuvk',
    'kvuubbbbllllllllllbbuuvk',
    'kvuubbbbbbbbbbbbbbbbuuvk',
    'kvuubbbbllllllbbbbbbuuvk',
    'kvuubbbbbbbbbbbbbbbbuuvk',
    'kvvuubbbbbbbbbbbbbbuuvvk',
    '.kvvuuuuuuuuuuuuuuuuvvk.',
    '..kkvvvvvvvvvvvvvvvvkk..',
    '...kkssssssssssssssskk..',
    '..kssssssssssssssssssk..',
    '..kkkkkkkkkkkkkkkkkkkk..',
  ],
]

/**
 * 8 x 8, 1 frame. Laid over the trunk when it is stroked in `sand` (T024).
 *
 * Deliberately almost all transparent: it overlays the dry bed rather than
 * replacing it, so the sand shows through the gaps between the fissures.
 */
export const CRACK: Art = [
  '...k....',
  '...k....',
  '..k.....',
  '..k.k...',
  '.k...k..',
  '.k....k.',
  'k......k',
  'k.......',
]

/**
 * 9 x 9, 2 frames. The overspend warning (T024).
 *
 * The pulse itself is scale and opacity on the wrapper (art-bible §5), never
 * hue. These two frames only blink the mark, so the sprite still reads as a
 * warning with motion suppressed — FR-012 forbids leaning on colour, and
 * `alert` sits close to `brick` on purpose-built category art.
 */
export const WARNING: readonly Art[] = [
  [
    '....k....',
    '...kak...',
    '..kaaak..',
    '..kaaak..',
    '.kaapaak.',
    '.kaapaak.',
    'kaaaaaaak',
    'kaaapaaak',
    'kkkkkkkkk',
  ],
  [
    '....k....',
    '...kak...',
    '..kaaak..',
    '..kaaak..',
    '.kaaoaak.',
    '.kaaoaak.',
    'kaaaaaaak',
    'kaaaoaaak',
    'kkkkkkkkk',
  ],
]
