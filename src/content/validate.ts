import type { Cefr, Exercise, ItemBank, Lesson } from './types'

const CEFR: Cefr[] = ['A1', 'A2', 'B1']

function fail(msg: string): never { throw new Error(`Content invalid: ${msg}`) }
function str(v: unknown, where: string): string {
  if (typeof v !== 'string' || v.trim() === '') fail(`${where} must be a non-empty string`)
  return v as string
}

export function validateItemBank(data: unknown): asserts data is ItemBank {
  if (!data || typeof data !== 'object' || !Array.isArray((data as ItemBank).items)) {
    fail('item bank must be { items: [...] }')
  }
  const seen = new Set<string>()
  for (const it of (data as ItemBank).items) {
    const id = str(it.id, 'item.id')
    if (seen.has(id)) fail(`duplicate item id "${id}"`)
    seen.add(id)
    str(it.ro, `item ${id}.ro`)
    str(it.uk, `item ${id}.uk`)
    str(it.pron_uk, `item ${id}.pron_uk`)
    str(it.example_ro, `item ${id}.example_ro`)
    str(it.example_uk, `item ${id}.example_uk`)
    if (typeof it.freqRank !== 'number') fail(`item ${id}.freqRank must be a number`)
    if (!CEFR.includes(it.cefr)) fail(`item ${id}.cefr must be A1/A2/B1`)
    if (!Array.isArray(it.tags)) fail(`item ${id}.tags must be an array`)
  }
}

function validateExercise(ex: Exercise, ids: Set<string>, where: string): void {
  switch (ex.type) {
    case 'comprehension':
      str(ex.question_uk, `${where}.question_uk`)
      if (!Array.isArray(ex.options_uk) || ex.options_uk.length < 2) fail(`${where} needs >=2 options`)
      if (ex.answerIndex < 0 || ex.answerIndex >= ex.options_uk.length) fail(`${where}.answerIndex out of range`)
      break
    case 'production':
      str(ex.prompt_uk, `${where}.prompt_uk`); str(ex.answer_ro, `${where}.answer_ro`)
      break
    case 'retrieval': case 'dictation': case 'shadowing':
      if (!ids.has(ex.itemId)) fail(`${where} references unknown item "${ex.itemId}"`)
      break
    case 'minimalPairs':
      if (!ids.has(ex.itemId)) fail(`${where} references unknown item "${ex.itemId}"`)
      if (!ids.has(ex.distractorId)) fail(`${where} references unknown distractor "${ex.distractorId}"`)
      break
    default:
      fail(`${where} has unknown exercise type`)
  }
}

export function validateLesson(data: unknown, ids: Set<string>): asserts data is Lesson {
  const l = data as Lesson
  str(l.id, 'lesson.id'); str(l.title_uk, 'lesson.title_uk'); str(l.goal_uk, 'lesson.goal_uk')
  if (!CEFR.includes(l.level)) fail(`lesson ${l.id}.level invalid`)
  if (!Array.isArray(l.dialogue) || l.dialogue.length === 0) fail(`lesson ${l.id}.dialogue empty`)
  if (!Array.isArray(l.newItemIds)) fail(`lesson ${l.id}.newItemIds must be an array`)
  for (const id of l.newItemIds) if (!ids.has(id)) fail(`lesson ${l.id} references unknown item "${id}"`)
  if (!Array.isArray(l.exercises) || l.exercises.length === 0) fail(`lesson ${l.id}.exercises empty`)
  l.exercises.forEach((ex, i) => validateExercise(ex, ids, `lesson ${l.id} exercise[${i}]`))
  if (!l.mission || !Array.isArray(l.mission.realWorld_uk) || l.mission.realWorld_uk.length === 0) {
    fail(`lesson ${l.id}.mission.realWorld_uk empty`)
  }
}
