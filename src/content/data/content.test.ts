import { validateItemBank, validateLesson } from '../validate'
import itemBank from './item-bank.json'
import courseIndex from './course-index.json'
import lesson01 from './lessons/a1-survival/01.json'
import lesson02 from './lessons/a1-survival/02.json'
import lesson03 from './lessons/a1-survival/03.json'
import lesson04 from './lessons/a1-survival/04.json'
import errands01 from './lessons/a2-errands/01.json'
import errands02 from './lessons/a2-errands/02.json'
import errands03 from './lessons/a2-errands/03.json'
import appointments01 from './lessons/b1-appointments/01.json'
import appointments02 from './lessons/b1-appointments/02.json'
import appointments03 from './lessons/b1-appointments/03.json'
import housing01 from './lessons/b1-housing/01.json'
import housing02 from './lessons/b1-housing/02.json'
import housing03 from './lessons/b1-housing/03.json'

const lessons = [
  lesson01,
  lesson02,
  lesson03,
  lesson04,
  errands01,
  errands02,
  errands03,
  appointments01,
  appointments02,
  appointments03,
  housing01,
  housing02,
  housing03,
]

test('item bank passes validation', () => {
  expect(() => validateItemBank(itemBank)).not.toThrow()
})

test('item bank has A1/A2/B1 items with pronunciations', () => {
  expect(itemBank.items.length).toBeGreaterThanOrEqual(50)
  for (const item of itemBank.items) {
    expect(['A1', 'A2', 'B1']).toContain(item.cefr)
    expect(item.pron_uk.trim()).not.toBe('')
  }
})

test('every lesson passes validation against the item bank', () => {
  const ids = new Set(itemBank.items.map((i) => i.id))
  for (const lesson of lessons) {
    expect(() => validateLesson(lesson, ids)).not.toThrow()
  }
})

test('every lesson required by the course index exists and is valid', () => {
  const ids = new Set(itemBank.items.map((i) => i.id))
  const byId = new Map(lessons.map((l) => [l.id, l]))
  expect(courseIndex.units.length).toBeGreaterThanOrEqual(1)
  for (const unit of courseIndex.units) {
    for (const lessonId of unit.lessonIds) {
      const lesson = byId.get(lessonId)
      expect(lesson, `missing lesson ${lessonId}`).toBeDefined()
      expect(() => validateLesson(lesson, ids)).not.toThrow()
    }
  }
})

test('each lesson covers the required exercise types', () => {
  const required = ['dictation', 'minimalPairs', 'shadowing', 'comprehension', 'production']
  for (const lesson of lessons) {
    const types = new Set(lesson.exercises.map((e: { type: string }) => e.type))
    for (const type of required) {
      expect(types.has(type), `${lesson.id} missing ${type}`).toBe(true)
    }
  }
})
