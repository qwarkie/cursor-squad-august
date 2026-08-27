import { HEX } from './palette'

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
export interface EmptyFieldProps {
  onAddIncome: () => void
  onLoadDemo: () => void
}

export function EmptyField({ onAddIncome, onLoadDemo }: EmptyFieldProps) {
  return (
    <div
      className="flex min-h-dvh w-full flex-col items-center justify-between overflow-x-hidden px-4 pb-8 pt-16"
      style={{
        background: `linear-gradient(${HEX.grassLit} 0%, ${HEX.grass} 45%, ${HEX.grassDark} 100%)`,
      }}
    >
      <header className="flex flex-col items-center gap-3 text-center">
        <h1
          className="font-pixel text-[16px] leading-relaxed"
          style={{ color: HEX.cream, textShadow: `2px 2px 0 ${HEX.ink}` }}
        >
          Money River
        </h1>
        <p className="max-w-[18rem] text-sm" style={{ color: HEX.ink }}>
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
            background: HEX.gold,
            color: HEX.ink,
            border: `3px solid ${HEX.ink}`,
            boxShadow: `0 4px 0 ${HEX.ink}`,
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
            color: HEX.ink,
            border: `3px solid ${HEX.ink}`,
          }}
        >
          Load demo budget
        </button>
      </div>
    </div>
  )
}
