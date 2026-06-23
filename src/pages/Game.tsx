import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getItemBank } from '../content/load'
import { allItemStates } from '../srs/store'
import type { Item } from '../content/types'
import SpeakButton from '../ui/components/SpeakButton'
import Button from '../ui/components/Button'
import Spinner from '../ui/components/Spinner'
import { t } from '../ui/strings'

const ROUNDS = 10
const ROUND_MS = 8000
const BASE_POINTS = 50 // awarded for any correct answer
const SPEED_POINTS = 50 // extra, scaled by how much time was left
const BEST_KEY = 'ir.game.best'

function fmt(s: string, vars: Record<string, number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

function writeBest(score: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(score))
  } catch {
    // ignore (private mode etc.)
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface RoundData {
  item: Item
  options: string[] // Ukrainian meanings, shuffled
}

/** Build N rounds from a pool, each with the correct meaning + 3 distractors. */
function buildRounds(pool: Item[]): RoundData[] {
  const chosen = shuffle(pool).slice(0, ROUNDS)
  return chosen.map((item) => {
    const distractors = shuffle(pool.filter((o) => o.uk !== item.uk))
      .slice(0, 3)
      .map((o) => o.uk)
    return { item, options: shuffle([item.uk, ...distractors]) }
  })
}

type Phase = 'loading' | 'playing' | 'over'

/** A self-contained listening/meaning speed quiz over already-seen vocabulary. */
export default function Game() {
  const navigate = useNavigate()
  const bank = getItemBank()

  const [phase, setPhase] = useState<Phase>('loading')
  const [pool, setPool] = useState<Item[]>([])
  const [rounds, setRounds] = useState<RoundData[]>([])
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const best = useRef(readBest())

  // Build the pool once: prefer words the learner has actually seen; on a fresh
  // install fall back to the most-frequent words (not the whole bank, which can
  // hold ~1000 rarely-seen entries). Needs at least 4 items for 3 distractors.
  useEffect(() => {
    let active = true
    void (async () => {
      const states = await allItemStates()
      if (!active) return
      const seen = bank.filter((it) => states[it.id])
      const mostFrequent = [...bank].sort((a, b) => a.freqRank - b.freqRank).slice(0, 40)
      const chosenPool = seen.length >= 8 ? seen : mostFrequent
      setPool(chosenPool)
      setRounds(buildRounds(chosenPool))
      setPhase('playing')
    })()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onAnswer(correct: boolean, msLeft: number) {
    if (correct) {
      const bonus = Math.round((msLeft / ROUND_MS) * SPEED_POINTS)
      setScore((s) => s + BASE_POINTS + bonus)
      setStreak((k) => k + 1)
      setCorrectCount((c) => c + 1)
    } else {
      setStreak(0)
    }
  }

  function next() {
    if (index + 1 < rounds.length) {
      setIndex((i) => i + 1)
    } else {
      if (score > best.current) {
        best.current = score
        writeBest(score)
      }
      setPhase('over')
    }
  }

  function restart() {
    setRounds(buildRounds(pool))
    setIndex(0)
    setScore(0)
    setStreak(0)
    setCorrectCount(0)
    setPhase('playing')
  }

  const Header = (
    <header className="mx-auto flex max-w-screen-sm items-center justify-between px-4 pt-4">
      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label={t.backToHome}
        className="min-h-tap min-w-tap text-xl text-text-muted"
      >
        ✕
      </button>
      {phase === 'playing' && (
        <p className="text-sm font-semibold text-text-muted">
          {fmt(t.gameRoundOf, { n: index + 1, total: rounds.length })}
        </p>
      )}
      <div className="min-w-tap text-right text-sm font-bold text-primary">
        {phase !== 'loading' && score}
      </div>
    </header>
  )

  if (phase === 'loading') {
    return <div className="min-h-dvh bg-bg">{Header}<Spinner /></div>
  }

  if (phase === 'over') {
    const isNewBest = score >= best.current && score > 0
    return (
      <div className="min-h-dvh bg-bg">
        {Header}
        <main className="mx-auto flex max-w-screen-sm flex-col items-center gap-4 px-4 pt-12 text-center">
          <span aria-hidden="true" className="text-6xl">🏁</span>
          <h1 className="text-2xl font-bold text-text">{t.gameOver}</h1>
          <p className="text-4xl font-bold text-primary">{score}</p>
          <p className="text-base text-text-muted">
            {fmt(t.gameCorrectOf, { n: correctCount, total: rounds.length })}
          </p>
          {isNewBest ? (
            <p className="text-base font-semibold text-success">{t.gameNewBest}</p>
          ) : (
            <p className="text-sm text-text-muted">
              {t.gameBest}: {best.current}
            </p>
          )}
          <Button onClick={restart} className="mt-2 w-full text-lg">{t.gamePlayAgain}</Button>
          <Button variant="secondary" onClick={() => navigate('/')} className="w-full">
            {t.backToHome}
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-bg">
      {Header}
      <Round
        key={index}
        round={rounds[index]}
        streak={streak}
        onAnswer={onAnswer}
        onNext={next}
        isLast={index + 1 >= rounds.length}
      />
    </div>
  )
}

interface RoundProps {
  round: RoundData
  streak: number
  onAnswer: (correct: boolean, msLeft: number) => void
  onNext: () => void
  isLast: boolean
}

type OptionState = 'idle' | 'correct' | 'wrong' | 'reveal'

/** One quiz round: counts down, takes one answer, then reveals and waits for Next. */
function Round({ round, streak, onAnswer, onNext, isLast }: RoundProps) {
  const { item, options } = round
  const [selected, setSelected] = useState<string | null>(null)
  const [msLeft, setMsLeft] = useState(ROUND_MS)
  const answered = selected !== null || msLeft <= 0

  // Countdown; stops once answered. A timeout counts as a wrong answer.
  useEffect(() => {
    if (selected !== null) return
    const startedAt = Date.now()
    const id = setInterval(() => {
      const left = ROUND_MS - (Date.now() - startedAt)
      if (left <= 0) {
        clearInterval(id)
        setMsLeft(0)
        onAnswer(false, 0)
      } else {
        setMsLeft(left)
      }
    }, 100)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  function choose(option: string) {
    if (answered) return
    setSelected(option)
    onAnswer(option === item.uk, msLeft)
  }

  function stateFor(option: string): OptionState {
    if (!answered) return 'idle'
    if (option === item.uk) return 'correct'
    if (option === selected) return 'wrong'
    return 'reveal'
  }

  const stateStyles: Record<OptionState, string> = {
    idle: 'bg-surface text-text ring-1 ring-black/10',
    correct: 'bg-green-100 text-green-800 ring-2 ring-green-500',
    wrong: 'bg-red-100 text-red-800 ring-2 ring-red-400',
    reveal: 'bg-surface text-text-muted ring-1 ring-black/10 opacity-60',
  }

  const timedOut = msLeft <= 0 && selected === null

  return (
    <main className="mx-auto flex max-w-screen-sm flex-col gap-5 px-4 pb-12 pt-4">
      {/* Timer */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface ring-1 ring-black/5">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
            msLeft / ROUND_MS < 0.3 ? 'bg-red-400' : 'bg-primary'
          }`}
          style={{ width: `${Math.max(0, (msLeft / ROUND_MS) * 100)}%` }}
        />
      </div>

      {streak >= 2 && (
        <p className="text-center text-sm font-semibold text-success">
          🔥 {t.gameStreakLabel}: {streak}
        </p>
      )}

      {/* Word + always-visible pronunciation (project rule: pron_uk always shown) */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <p className="text-3xl font-bold text-primary">{item.ro}</p>
        <p className="text-base text-text-muted">{item.pron_uk}</p>
        <SpeakButton text={item.ro} size="lg" />
      </div>

      <p className="text-center text-base font-medium text-text-muted">{t.gameWhatMeans}</p>

      {/* Options */}
      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const state = stateFor(option)
          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => choose(option)}
              className={[
                'min-h-tap w-full rounded-md px-4 py-3 text-left text-base font-semibold transition-colors',
                stateStyles[state],
              ].join(' ')}
            >
              {option}
            </button>
          )
        })}
      </div>

      {answered && (
        <>
          {timedOut && (
            <p className="text-center text-sm font-semibold text-red-600">{t.gameTimeUp}</p>
          )}
          <Button onClick={onNext} className="w-full">
            {isLast ? t.gameOver : t.next}
          </Button>
        </>
      )}
    </main>
  )
}
