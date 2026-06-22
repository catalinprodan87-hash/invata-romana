import { initialState, isDue, schedule } from './scheduler'

test('good on a new item schedules ~1 day out', () => {
  const s = schedule(initialState('2026-06-20'), 'good', '2026-06-20')
  expect(s.interval).toBe(1)
  expect(s.due).toBe('2026-06-21')
})

test('again resets interval and counts a lapse', () => {
  let s = schedule(initialState('2026-06-20'), 'good', '2026-06-20')
  s = schedule({ ...s, due: '2026-06-21' }, 'again', '2026-06-21')
  expect(s.interval).toBe(0)
  expect(s.due).toBe('2026-06-21')
  expect(s.lapses).toBe(1)
})

test('ease never drops below 1.3', () => {
  let s = initialState('2026-06-20')
  for (let i = 0; i < 10; i++) s = schedule(s, 'again', '2026-06-20')
  expect(s.ease).toBeGreaterThanOrEqual(1.3)
})

test('isDue compares against today', () => {
  expect(isDue({ ease: 2.5, interval: 1, due: '2026-06-20', lapses: 0, seen: 1 }, '2026-06-21')).toBe(true)
  expect(isDue({ ease: 2.5, interval: 3, due: '2026-06-25', lapses: 0, seen: 1 }, '2026-06-21')).toBe(false)
})
