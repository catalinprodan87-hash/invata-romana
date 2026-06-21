import { validateItemBank, validateLesson } from '../validate'
import itemBank from './item-bank.json'
import courseIndex from './course-index.json'
import lesson01 from './lessons/a1-survival/01.json'
import lesson02 from './lessons/a1-survival/02.json'
import lesson03 from './lessons/a1-survival/03.json'
import lesson04 from './lessons/a1-survival/04.json'

const lessons = [lesson01, lesson02, lesson03, lesson04]

test('item bank passes validation', () => {
  expect(() => validateItemBank(itemBank)).not.toThrow()
})

test('item bank has ~50 A1 items', () => {
  expect(itemBank.items.length).toBeGreaterThanOrEqual(50)
  for (const item of itemBank.items) {
    expect(item.cefr).toBe('A1')
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
  const unit = courseIndex.units.find((u) => u.id === 'a1-survival')
  expect(unit).toBeDefined()
  for (const lessonId of unit!.lessonIds) {
    const lesson = byId.get(lessonId)
    expect(lesson, `missing lesson ${lessonId}`).toBeDefined()
    expect(() => validateLesson(lesson, ids)).not.toThrow()
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
