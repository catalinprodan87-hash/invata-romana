export interface SrsState { ease: number; interval: number; due: string; lapses: number; seen: number }
export type Grade = 'again' | 'good' | 'easy'

export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return today(new Date(y, m - 1, d + days))
}

export function initialState(todayStr: string): SrsState {
  return { ease: 2.5, interval: 0, due: todayStr, lapses: 0, seen: 0 }
}

export function isDue(s: SrsState, todayStr: string): boolean {
  return s.due <= todayStr
}

export function schedule(s: SrsState, grade: Grade, todayStr: string): SrsState {
  const seen = s.seen + 1
  if (grade === 'again') {
    const ease = Math.max(1.3, s.ease - 0.2)
    return { ease, interval: 0, due: todayStr, lapses: s.lapses + 1, seen }
  }
  let ease = s.ease
  if (grade === 'easy') ease = s.ease + 0.15
  let interval: number
  if (s.interval === 0) interval = grade === 'easy' ? 2 : 1
  else interval = Math.max(1, Math.round(s.interval * ease))
  return { ease, interval, due: addDays(todayStr, interval), lapses: s.lapses, seen }
}
