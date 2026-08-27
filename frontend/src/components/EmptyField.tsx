/**
 * T009 — the opening frame.
 *
 * An empty green field and one thing to do. This is the only moment that
 * teaches the metaphor without a word of onboarding, so it stays almost
 * empty on purpose: the river has to be something the person makes happen,
 * not something already on screen when they arrive.
 *
 * Colours are art-bible.md §2 literals. They move to the shared CSS custom
 * properties once T002 lands them in index.css.
 */
const GRASS = '#4caf50'
const GRASS_LIT = '#7ac36f'
const GRASS_DARK = '#2f6b30'
const INK = '#1b2a4a'
const GOLD = '#ffd94a'
const CREAM = '#f4d9a0'

export interface EmptyFieldProps {
  onAddIncome: () => void
  onLoadDemo: () => void
}

export function EmptyField({ onAddIncome, onLoadDemo }: EmptyFieldProps) {
  return (
    <div
      className="flex min-h-dvh w-full flex-col items-center justify-between overflow-x-hidden px-4 pb-8 pt-16"
      style={{
        background: `linear-gradient(${GRASS_LIT} 0%, ${GRASS} 45%, ${GRASS_DARK} 100%)`,
      }}
    >
      <header className="flex flex-col items-center gap-3 text-center">
        <h1
          className="font-pixel text-[16px] leading-relaxed"
          style={{ color: CREAM, textShadow: `2px 2px 0 ${INK}` }}
        >
          Money River
        </h1>
        <p className="max-w-[18rem] text-sm" style={{ color: INK }}>
          A month of money is one river. Add your income and watch where it goes.
        </p>
      </header>

      {/* Decoration only — the field is the point, and it is deliberately bare. */}
      <div aria-hidden className="h-24 w-full" />

      <div className="flex w-full max-w-sm flex-col gap-3">
        <button
          type="button"
          onClick={onAddIncome}
          className="min-h-[56px] w-full cursor-pointer px-6 font-pixel text-[12px] leading-none transition-transform active:translate-y-[2px]"
          style={{
            background: GOLD,
            color: INK,
            border: `3px solid ${INK}`,
            boxShadow: `0 4px 0 ${INK}`,
          }}
        >
          Add Income
        </button>
        <button
          type="button"
          onClick={onLoadDemo}
          className="min-h-[44px] w-full cursor-pointer px-6 font-pixel text-[10px] leading-none transition-transform active:translate-y-[2px]"
          style={{
            background: 'transparent',
            color: INK,
            border: `3px solid ${INK}`,
          }}
        >
          Load demo budget
        </button>
      </div>
    </div>
  )
}
