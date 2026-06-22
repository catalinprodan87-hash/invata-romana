import type { Item, CourseIndex } from '../content/types'
import { isDue, type SrsState } from '../srs/scheduler'

export interface SessionPlan { reviewItemIds: string[]; newLessonId: string | null }

export function buildSession(a: {
  states: Record<string, SrsState>; bank: Item[]; course: CourseIndex
  completedLessons: string[]; today: string
}): SessionPlan {
  const reviewItemIds = Object.entries(a.states)
    .filter(([, s]) => isDue(s, a.today))
    .sort((x, y) => x[1].due.localeCompare(y[1].due) || y[1].lapses - x[1].lapses)
    .map(([id]) => id)
    .slice(0, 50)
  const order = a.course.units.flatMap((u) => u.lessonIds)
  const newLessonId = order.find((id) => !a.completedLessons.includes(id)) ?? null
  return { reviewItemIds, newLessonId }
}
