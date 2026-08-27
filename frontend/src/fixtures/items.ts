import type { Item } from '../types'

/**
 * Checked-in seed data for the deterministic fallback (Constitution, Principle II).
 *
 * The demo path renders from these when the API is unreachable — no network, no
 * key, no service. Timestamps are fixed literals on purpose: a fixture that
 * reads the clock is not deterministic and makes screenshots unstable.
 */
export const FIXTURE_ITEMS: Item[] = [
  {
    id: 3,
    title: 'Walk the live URL before the demo',
    description: 'Incognito, 390px. A deploy that 404s fails Principle I.',
    is_done: false,
    created_at: '2026-08-26T09:00:00',
    updated_at: '2026-08-26T09:00:00',
  },
  {
    id: 2,
    title: 'Give every feature a deterministic fallback',
    description: 'Venue wifi fails. A spinner that never resolves scores below nothing.',
    is_done: true,
    created_at: '2026-08-26T08:30:00',
    updated_at: '2026-08-26T08:45:00',
  },
  {
    id: 1,
    title: 'Keep the demo path green on every commit',
    description: 'Revert beats debugging under a clock.',
    is_done: true,
    created_at: '2026-08-26T08:00:00',
    updated_at: '2026-08-26T08:15:00',
  },
]
