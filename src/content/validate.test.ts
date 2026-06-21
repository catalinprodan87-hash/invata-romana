import { validateItemBank, validateLesson } from './validate'

const goodItem = {
  id: 'buna-ziua', ro: 'Bună ziua', uk: 'Добрий день', pron_uk: 'бúна зíуа',
  freqRank: 12, cefr: 'A1', tags: ['greetings'],
  example_ro: 'Bună ziua!', example_uk: 'Добрий день!',
}

test('accepts a valid item bank', () => {
  expect(() => validateItemBank({ items: [goodItem] })).not.toThrow()
})

test('rejects an item missing pron_uk', () => {
  const bad = { items: [{ ...goodItem, pron_uk: '' }] }
  expect(() => validateItemBank(bad)).toThrow(/pron_uk/)
})

test('rejects duplicate item ids', () => {
  expect(() => validateItemBank({ items: [goodItem, goodItem] })).toThrow(/duplicate/i)
})

test('lesson referencing unknown item id is rejected', () => {
  const lesson = {
    id: 'l1', level: 'A1', unit_uk: 'U', title_uk: 'T', goal_uk: 'G',
    dialogue: [{ speaker: 'A', ro: 'Bună', uk: 'Привіт' }],
    newItemIds: ['nope'], grammarNotes_uk: [],
    exercises: [{ type: 'dictation', itemId: 'buna-ziua' }],
    mission: { prompt_uk: 'p', lines: [], realWorld_uk: ['x'] },
  }
  expect(() => validateLesson(lesson, new Set(['buna-ziua']))).toThrow(/nope/)
})
