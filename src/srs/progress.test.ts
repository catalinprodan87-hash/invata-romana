import { describe, it, expect } from 'vitest'
import type { Meta } from './store'
import type { SrsState } from './scheduler'
import type { Item } from '../content/types'
import { bumpStreak, recordActivity, knownItemCount, frequencyBackbone } from './progress'

function makeMeta(overrides: Partial<Meta> = {}): Meta {
  return {
    xp: 0,
    streak: { count: 0, lastDay: '' },
    daily: { day: '', count: 0 },
    completedLessons: [],
    micPrivacyAck: false,
    ...overrides,
  }
}

function makeState(interval: number): SrsState {
  return { ease: 2.5, interval, due: '2026-06-22', lapses: 0, seen: 1 }
}

function makeItem(id: string): Item {
  return { id, ro: 'ro', uk: 'uk', pron_uk: '', freqRank: 1, cefr: 'A1', tags: [], example_ro: '', example_uk: '' }
}

// ── bumpStreak ────────────────────────────────────────────────────────────────

describe('bumpStreak', () => {
  it('sets count=1 and lastDay when lastDay is empty (first activity ever)', () => {
    const meta = makeMeta({ streak: { count: 0, lastDay: '' } })
    const result = bumpStreak(meta, '2026-06-22')
    expect(result.streak).toEqual({ count: 1, lastDay: '2026-06-22' })
  })

  it('increments count when lastDay is yesterday (consecutive days)', () => {
    const meta = makeMeta({ streak: { count: 3, lastDay: '2026-06-21' } })
    const result = bumpStreak(meta, '2026-06-22')
    expect(result.streak).toEqual({ count: 4, lastDay: '2026-06-22' })
  })

  it('resets count to 1 when there is a gap (lastDay is 3 days ago)', () => {
    const meta = makeMeta({ streak: { count: 5, lastDay: '2026-06-19' } })
    const result = bumpStreak(meta, '2026-06-22')
    expect(result.streak).toEqual({ count: 1, lastDay: '2026-06-22' })
  })

  it('is a no-op for streak when called on the same day as lastDay', () => {
    const meta = makeMeta({ streak: { count: 3, lastDay: '2026-06-22' } })
    const result = bumpStreak(meta, '2026-06-22')
    expect(result.streak).toEqual({ count: 3, lastDay: '2026-06-22' })
  })

  it('does not mutate the input meta', () => {
    const meta = makeMeta({ streak: { count: 3, lastDay: '2026-06-21' } })
    bumpStreak(meta, '2026-06-22')
    expect(meta.streak.count).toBe(3)
  })
})

// ── recordActivity ────────────────────────────────────────────────────────────

describe('recordActivity', () => {
  it('adds xp to meta', () => {
    const meta = makeMeta({ xp: 10 })
    const result = recordActivity(meta, '2026-06-22', 5, 3)
    expect(result.xp).toBe(15)
  })

  it('accumulates daily.count when called on the same day', () => {
    const meta = makeMeta({ daily: { day: '2026-06-22', count: 4 } })
    const result = recordActivity(meta, '2026-06-22', 0, 3)
    expect(result.daily).toEqual({ day: '2026-06-22', count: 7 })
  })

  it('resets daily.count on a new day', () => {
    const meta = makeMeta({ daily: { day: '2026-06-21', count: 10 } })
    const result = recordActivity(meta, '2026-06-22', 0, 3)
    expect(result.daily).toEqual({ day: '2026-06-22', count: 3 })
  })

  it('bumps the streak as part of recordActivity', () => {
    const meta = makeMeta({ streak: { count: 2, lastDay: '2026-06-21' } })
    const result = recordActivity(meta, '2026-06-22', 5, 1)
    expect(result.streak).toEqual({ count: 3, lastDay: '2026-06-22' })
  })

  it('does not mutate the input meta', () => {
    const meta = makeMeta({ xp: 10, daily: { day: '2026-06-22', count: 4 } })
    recordActivity(meta, '2026-06-22', 5, 3)
    expect(meta.xp).toBe(10)
    expect(meta.daily.count).toBe(4)
  })
})

// ── knownItemCount ────────────────────────────────────────────────────────────

describe('knownItemCount', () => {
  it('returns 0 when there are no states', () => {
    expect(knownItemCount({})).toBe(0)
  })

  it('counts only states with interval >= 7', () => {
    const states: Record<string, SrsState> = {
      a: makeState(7),
      b: makeState(14),
      c: makeState(6),
      d: makeState(0),
      e: makeState(1),
    }
    expect(knownItemCount(states)).toBe(2)
  })

  it('counts a state with interval exactly 7 as known', () => {
    const states: Record<string, SrsState> = { a: makeState(7) }
    expect(knownItemCount(states)).toBe(1)
  })

  it('does not count a state with interval 6 as known', () => {
    const states: Record<string, SrsState> = { a: makeState(6) }
    expect(knownItemCount(states)).toBe(0)
  })
})

// ── frequencyBackbone ─────────────────────────────────────────────────────────

describe('frequencyBackbone', () => {
  it('returns { known: 0, total: 0 } for empty inputs', () => {
    expect(frequencyBackbone({}, [])).toEqual({ known: 0, total: 0 })
  })

  it('returns correct known and total counts', () => {
    const states: Record<string, SrsState> = {
      a: makeState(7),
      b: makeState(3),
      c: makeState(10),
    }
    const bank = [makeItem('a'), makeItem('b'), makeItem('c'), makeItem('d')]
    expect(frequencyBackbone(states, bank)).toEqual({ known: 2, total: 4 })
  })

  it('total equals bank.length regardless of states', () => {
    const bank = [makeItem('x'), makeItem('y')]
    expect(frequencyBackbone({}, bank)).toEqual({ known: 0, total: 2 })
  })
})
