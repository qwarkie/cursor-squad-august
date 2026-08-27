import { PixelSprite } from '../pixel'
import type { CategoryIcon } from '../types'
import { CATEGORY_ICONS, DEFAULT_ICON } from '../world/icons'
import { PAL } from '../world/palette'
import { HEX } from './palette'

/**
 * The five spend icons, as the sprites themselves.
 *
 * Swatches or names would make the reader translate — "Market" is a word that
 * has to be imagined as a building before you can tell whether you want it.
 * The picker shows the exact art that will stand at the end of the tributary,
 * at the scale it is drawn on a phone, so choosing is recognition rather than
 * translation.
 *
 * Shared by the add sheet and the edit sheet: the same five buttons in the
 * same order in both places, so the choice made at creation is changed by
 * tapping the control it was made with.
 */
export interface IconPickerProps {
  value: CategoryIcon | undefined
  onChange: (icon: CategoryIcon) => void
  /** Kept short in the bottom sheet, where the world is the thing being watched. */
  legend?: string
}

export function IconPicker({ value, onChange, legend = 'Icon' }: IconPickerProps) {
  const selected = value ?? DEFAULT_ICON

  return (
    <fieldset>
      <legend className="font-pixel text-[10px]">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {CATEGORY_ICONS.map((icon) => {
          const active = selected === icon.key
          return (
            <button
              key={icon.key}
              type="button"
              onClick={() => onChange(icon.key)}
              aria-pressed={active}
              aria-label={icon.name}
              /* 44px is the floor for a touch target; the sprite sits inside it. */
              className="flex size-[48px] cursor-pointer items-center justify-center"
              style={{
                background: active ? HEX.gold : 'transparent',
                border: `3px solid ${active ? HEX.ink : HEX.paper}`,
              }}
            >
              <PixelSprite art={icon.art} palette={PAL} scale={3} fps={4} alt="" />
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
