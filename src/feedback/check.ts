export function normalize(input: string): string {
  return input.toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ').trim()
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  let curr = new Array<number>(b.length + 1)
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[b.length]
}

export function similarity(a: string, b: string): number {
  const x = normalize(a), y = normalize(b)
  const max = Math.max(x.length, y.length)
  return max === 0 ? 1 : 1 - levenshtein(x, y) / max
}

export type Tier = 'great' | 'close' | 'tryAgain'

// The Romanian diacritic letters and their base forms, for hint detection.
const DIACRITICS = 'ăâîșț'

function diacriticHint(expected: string, got: string): string | undefined {
  if (normalize(expected) !== normalize(got)) return undefined
  const offenders = [...expected].filter((ch) => DIACRITICS.includes(ch.toLowerCase()))
  return offenders.length ? `Зверніть увагу на «${[...new Set(offenders)].join(' ')}»` : undefined
}

export function gradeText(expected: string, got: string): { tier: Tier; correct: boolean; diacriticHint?: string } {
  const exact = normalize(expected) === normalize(got)
  if (exact) {
    const hint = expected.trim().toLowerCase() === got.trim().toLowerCase() ? undefined : diacriticHint(expected, got)
    return { tier: 'great', correct: true, diacriticHint: hint }
  }
  const s = similarity(expected, got)
  if (s >= 0.6) return { tier: 'close', correct: false }
  return { tier: 'tryAgain', correct: false }
}
