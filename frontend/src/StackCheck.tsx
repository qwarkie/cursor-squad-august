import { motion } from 'motion/react'
import { create } from 'zustand'

import { PixelSprite, type Palette } from './pixel'

/**
 * Stack check, not a feature. Renders one of everything the Money World build
 * depends on so a regression in the toolchain is visible in one screenshot.
 * Mount it from main.tsx when you want to look at it; nothing imports it.
 */

const PAL: Palette = {
  '.': null,
  r: '#c0392b', // roof
  w: '#f4d9a0', // wall
  d: '#7b4a2d', // door / trunk
  g: '#4caf50', // foliage
  y: '#ffd94a', // coin / window
  k: '#1b2a4a', // outline
}

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

// Two frames = a villager that bobs. Frames must share one size.
const VILLAGER = [
  ['.kkk.', '.kyk.', 'kkkkk', '.k.k.', '.d.d.'],
  ['.kkk.', '.kyk.', 'kkkkk', '.k.k.', '.dd..'],
]

const COIN = [
  ['.yyy.', 'y.k.y', 'y.k.y', 'y.k.y', '.yyy.'],
  ['..y..', '..k..', '..k..', '..k..', '..y..'],
]

type Store = { spend: number; bump: () => void }
const useStore = create<Store>((set) => ({
  spend: 650,
  bump: () => set((s) => ({ spend: s.spend + 50 })),
}))

// One curve for the money to ride. Coordinates are CSS px in this box.
const RIVER = 'M 20 60 C 120 20, 200 140, 330 90'

export default function StackCheck() {
  const { spend, bump } = useStore()

  return (
    <main
      className="mx-auto flex min-h-dvh max-w-[390px] flex-col gap-4 bg-[#101a33] p-4 text-white"
      style={{ fontFamily: 'var(--font-pixel)' }}
    >
      <h1 className="text-[10px] leading-4 text-[#ffd94a]">MONEY WORLD — STACK CHECK</h1>

      <section className="rounded border border-white/20 p-3">
        <p className="mb-2 text-[8px] text-white/60">PixelSprite — static</p>
        <PixelSprite art={HOUSE} palette={PAL} scale={6} alt="House" />
      </section>

      <section className="rounded border border-white/20 p-3">
        <p className="mb-2 text-[8px] text-white/60">PixelSprite — 2-frame loop</p>
        <div className="flex items-end gap-4">
          <PixelSprite art={VILLAGER} palette={PAL} scale={8} fps={4} alt="Villager" />
          <PixelSprite art={COIN} palette={PAL} scale={8} fps={8} alt="Coin" />
        </div>
      </section>

      <section className="rounded border border-white/20 p-3">
        <p className="mb-2 text-[8px] text-white/60">offset-path — money flow</p>
        <div className="relative h-[160px] w-[350px]">
          <svg className="absolute inset-0" width="350" height="160" aria-hidden="true">
            <path d={RIVER} fill="none" stroke="#2b7fd4" strokeWidth="14" strokeLinecap="round" />
            <path d={RIVER} fill="none" stroke="#5cb3ff" strokeWidth="4" strokeLinecap="round" />
          </svg>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="absolute left-0 top-0"
              style={{
                offsetPath: `path('${RIVER}')`,
                // Without this the element inherits offset-rotate: auto and
                // tilts along the curve, which shears the pixel grid. Pixel
                // art must stay axis-aligned.
                offsetRotate: '0deg',
                animation: `pixel-flow 3s linear ${i * 0.6}s infinite`,
              }}
            >
              <PixelSprite art={COIN} palette={PAL} scale={4} fps={8} />
            </span>
          ))}
        </div>
      </section>

      <section className="rounded border border-white/20 p-3">
        <p className="mb-2 text-[8px] text-white/60">zustand + motion + 44px target</p>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={bump}
            whileTap={{ scale: 0.9 }}
            className="h-11 min-w-11 rounded bg-[#ffd94a] px-3 text-[10px] text-[#101a33]"
          >
            +50
          </motion.button>
          <motion.span
            key={spend}
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-[12px]"
          >
            ${spend}
          </motion.span>
        </div>
      </section>
    </main>
  )
}
