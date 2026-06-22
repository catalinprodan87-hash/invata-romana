import { describe, it, expect } from 'vitest'
import { buildSession } from './build'
import type { Item, CourseIndex } from '../content/types'
import type { SrsState } from '../srs/scheduler'

const TODAY = '2026-06-22'

// Minimal Item stub — only id is required by buildSession (bank is passed but not filtered here)
function makeItem(id: string): Item {
  return {
    id,
    ro: `ro_${id}`,
    uk: `uk_${id}`,
    pron_uk: '',
    freqRank: 1,
    cefr: 'A1',
    tags: [],
    example_ro: '',
    example_uk: '',
  }
}

function makeState(due: string, lapses = 0): SrsState {
  return { ease: 2.5, interval: 1, due, lapses, seen: 1 }
}

const bank: Item[] = [makeItem('item-1'), makeItem('item-2'), makeItem('item-3')]

const course: CourseIndex = {
  units: [
    {
      id: 'unit-1',
      unit_uk: 'Одиниця 1',
      lessonIds: ['lesson-a', 'lesson-b', 'lesson-c'],
    },
  ],
}

describe('buildSession', () => {
  it('returns only due item ids when some are not due', () => {
    const states: Record<string, SrsState> = {
      'item-1': makeState('2026-06-21'),  // due yesterday → due
      'item-2': makeState('2026-06-22'),  // due today → due
      'item-3': makeState('2026-06-23'),  // due tomorrow → not due
    }

    const result = buildSession({
      states,
      bank,
      course,
      completedLessons: [],
      today: TODAY,
    })

    expect(result.reviewItemIds).toHaveLength(2)
    expect(result.reviewItemIds).toContain('item-1')
    expect(result.reviewItemIds).toContain('item-2')
    expect(result.reviewItemIds).not.toContain('item-3')
  })

  it('returns first lesson in course order on first run (no completed lessons)', () => {
    const result = buildSession({
      states: {},
      bank,
      course,
      completedLessons: [],
      today: TODAY,
    })

    expect(result.newLessonId).toBe('lesson-a')
  })

  it('returns null for newLessonId when all lessons are completed', () => {
    const result = buildSession({
      states: {},
      bank,
      course,
      completedLessons: ['lesson-a', 'lesson-b', 'lesson-c'],
      today: TODAY,
    })

    expect(result.newLessonId).toBeNull()
  })

  it('sorts due items oldest-due first, then most-lapsed first', () => {
    const states: Record<string, SrsState> = {
      'item-1': makeState('2026-06-20', 0),  // oldest due, 0 lapses
      'item-2': makeState('2026-06-21', 3),  // second due, more lapses
      'item-3': makeState('2026-06-21', 1),  // same due as item-2, fewer lapses
    }

    const result = buildSession({
      states,
      bank,
      course,
      completedLessons: [],
      today: TODAY,
    })

    expect(result.reviewItemIds[0]).toBe('item-1')   // oldest due date first
    expect(result.reviewItemIds[1]).toBe('item-2')   // same date → more lapses first
    expect(result.reviewItemIds[2]).toBe('item-3')
  })
})
