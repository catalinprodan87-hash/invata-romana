import { gradeText, normalize, similarity } from './check'

test('exact match is great + correct', () => {
  const r = gradeText('Bună ziua', 'Bună ziua')
  expect(r.correct).toBe(true); expect(r.tier).toBe('great')
})

test('diacritics-only miss is correct-enough with a hint', () => {
  const r = gradeText('mulțumesc', 'multumesc')
  expect(r.correct).toBe(true)
  expect(r.diacriticHint).toMatch(/ț/)
})

test('one wrong letter is close', () => {
  expect(gradeText('pâine', 'paine').correct).toBe(true) // diacritic only
  expect(gradeText('lapte', 'larte').tier).toBe('close')
})

test('unrelated is tryAgain', () => {
  expect(gradeText('apă', 'xyzzy').tier).toBe('tryAgain')
})

test('normalize folds diacritics + case + punctuation', () => {
  expect(normalize('Mulțumesc!')).toBe(normalize('multumesc'))
})

test('similarity is 1 for identical', () => {
  expect(similarity('da', 'da')).toBe(1)
})
