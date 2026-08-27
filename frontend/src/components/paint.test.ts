import { describe, expect, it } from 'vitest'

/**
 * The chrome layer declares no paint with an alpha channel.
 *
 * `bg-black/50` on the two sheet backdrops put an off-palette wash over the
 * whole world, and it was provable rather than arguable: of the twenty palette
 * colours, none has a 50%-black composite that is still in the palette. An
 * alpha channel composites *between* values by definition, so any use of one
 * leaves the palette (art-bible §7 #3) wherever it lands.
 *
 * This asserts the source rather than the screen on purpose. A rendered-pixel
 * census is red forever on correct art, because text always anti-aliases —
 * Pollen measured 184 "off-palette" values on a correct build and every one
 * was a glyph edge. Pixels answer what the screen showed; source answers what
 * we asked for, and the palette rule is about what we asked for.
 *
 * Scope and limits, stated so this is not mistaken for full palette coverage:
 *
 *  - Alpha only. It does NOT catch an interpolating gradient, which was the
 *    other real defect (EmptyField's `linear-gradient` emitted 58 colours, 57
 *    off-palette). Telling an interpolating gradient from a hard-stop one
 *    needs a stop parser across %, deg and clamped zeros; the `.scrim` dither
 *    is a legitimate conic gradient and a naive rule fails it. Fizz withdrew
 *    that half of the runtime check for the same reason.
 *  - Chrome only. The world layer paints through its own palette module.
 */
/**
 * Read through Vite rather than `node:fs`, so the test needs no node types and
 * runs wherever the app builds.
 */
const SOURCES = import.meta.glob('./*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Comments describe removed violations; they are not declarations. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

const ALPHA_PAINT: { name: string; pattern: RegExp }[] = [
  { name: 'rgba()/hsla()', pattern: /\b(?:rgba|hsla)\(/ },
  { name: 'a slash-alpha colour function', pattern: /\b(?:rgb|hsl|oklch|oklab|color)\([^)]*\// },
  {
    name: 'a Tailwind slash-opacity utility',
    pattern: /\b(?:bg|text|border|from|via|to)-[a-z0-9-]+\/\d{1,3}\b/,
  },
  { name: 'an eight-digit hex', pattern: /#[0-9a-fA-F]{8}\b/ },
]

const files = Object.keys(SOURCES)
  .filter((f) => !f.endsWith('.test.ts'))
  // The starter CRUD components are not on the demo path.
  .filter((f) => !f.includes('/Item'))
  .sort()

describe('chrome paint', () => {
  it('has files to check — a clean sweep of nothing is not a pass', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  for (const file of files) {
    it(`${file} declares no colour with an alpha channel`, () => {
      const source = stripComments(SOURCES[file])
      for (const { name, pattern } of ALPHA_PAINT) {
        const hit = source.match(pattern)
        expect(
          hit,
          `${file} declares ${name} (${hit?.[0]}). An alpha channel composites between palette ` +
            `values, so whatever it lands on is off-palette. Dim by dithering instead — see ` +
            `.scrim in index.css.`,
        ).toBeNull()
      }
    })
  }
})
