import type { Meta } from './store'
import type { SrsState } from './scheduler'
import type { Item } from '../content/types'

/** Compute the ISO date string for the day before `today`. */
function yesterday(today: string): string {
  const [y, m, d] = today.split('-').map(Number)
  const date = new Date(y, m - 1, d - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Returns a new Meta with the streak updated for `today`.
 * - Same day as lastDay → no change.
 * - lastDay is yesterday → count + 1.
 * - Any other case (gap or empty) → count reset to 1.
 * Always sets streak.lastDay = today (unless same-day no-op which also leaves lastDay unchanged).
 */
export function bumpStreak(meta: Meta, today: string): Meta {
  const { streak } = meta
  if (streak.lastDay === today) return meta

  const newCount = streak.lastDay === yesterday(today) ? streak.count + 1 : 1

  return {
    ...meta,
    streak: { count: newCount, lastDay: today },
  }
}

/**
 * Returns a new Meta reflecting activity on `today`:
 * - xp += xpGain
 * - daily.count accumulates when day matches today, otherwise resets to itemsDone
 * - streak is bumped via bumpStreak
 */
export function recordActivity(meta: Meta, today: string, xpGain: number, itemsDone: number): Meta {
  const daily =
    meta.daily.day === today
      ? { day: today, count: meta.daily.count + itemsDone }
      : { day: today, count: itemsDone }

  const updated: Meta = {
    ...meta,
    xp: meta.xp + xpGain,
    daily,
  }

  return bumpStreak(updated, today)
}

/** Number of SRS states that have been "matured" (interval >= 7 days). */
export function knownItemCount(states: Record<string, SrsState>): number {
  return Object.values(states).filter(s => s.interval >= 7).length
}

/**
 * Returns how many items in the bank are "known" vs the total bank size.
 */
export function frequencyBackbone(
  states: Record<string, SrsState>,
  bank: Item[],
): { known: number; total: number } {
  return { known: knownItemCount(states), total: bank.length }
}
