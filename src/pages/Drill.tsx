import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getItemBank } from '../content/load'
import { allItemStates, getMeta, setItemState, setMeta } from '../srs/store'
import { initialState, schedule, today, type Grade } from '../srs/scheduler'
import { recordActivity } from '../srs/progress'
import type { Item } from '../content/types'
import SpeakButton from '../ui/components/SpeakButton'
import Button from '../ui/components/Button'
import Spinner from '../ui/components/Spinner'
import { t } from '../ui/strings'

const BATCH = 10
const XP_PER_WORD = 1

function fmt(s: string, vars: Record<string, number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

type Phase = 'loading' | 'studying' | 'empty' | 'done'

/**
 * Walks the frequency spine: presents the next batch of words the learner
 * hasn't started yet (lowest freqRank first), teaches each, and seeds it into
 * the SRS so it enters the daily review rotation.
 */
export default function Drill() {
  const navigate = useNavigate()
  const bank = getItemBank()

  const [phase, setPhase] = useState<Phase>('loading')
  const [batch, setBatch] = useState<Item[]>([])
  const [index, setIndex] = useState(0)
  const [learned, setLearned] = useState(0)
  const metaRef = useRef<Awaited<ReturnType<typeof getMeta>> | null>(null)

  // Build a batch of not-yet-seen words in frequency order.
  async function loadBatch() {
    const [states, meta] = await Promise.all([allItemStates(), getMeta()])
    metaRef.current = meta
    const unseen = bank
      .filter((it) => !states[it.id])
      .sort((a, b) => a.freqRank - b.freqRank)
      .slice(0, BATCH)
    if (unseen.length === 0) {
      setPhase('empty')
      return
    }
    setBatch(unseen)
    setIndex(0)
    setLearned(0)
    setPhase('studying')
  }

  useEffect(() => {
    void loadBatch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onGrade(grade: Grade) {
    const item = batch[index]
    await setItemState(item.id, schedule(initialState(today()), grade, today()))
    const nextLearned = learned + 1
    setLearned(nextLearned)
    if (index + 1 < batch.length) {
      setIndex((i) => i + 1)
    } else {
      // Batch finished: persist activity (xp, daily goal, streak) once.
      const base = metaRef.current ?? (await getMeta())
      const updated = recordActivity(base, today(), nextLearned * XP_PER_WORD, nextLearned)
      await setMeta(updated)
      metaRef.current = updated
      setPhase('done')
    }
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
      {phase === 'studying' && (
        <p className="text-sm font-semibold text-text-muted">
          {fmt(t.drillProgress, { n: index + 1, total: batch.length })}
        </p>
      )}
      <div className="min-w-tap" />
    </header>
  )

  if (phase === 'loading') {
    return <div className="min-h-dvh bg-bg">{Header}<Spinner /></div>
  }

  if (phase === 'empty') {
    return (
      <div className="min-h-dvh bg-bg">
        {Header}
        <main className="mx-auto flex max-w-screen-sm flex-col items-center gap-4 px-4 pt-16 text-center">
          <span aria-hidden="true" className="text-6xl">📚</span>
          <p className="text-lg font-bold text-text">{t.drillAllSeen}</p>
          <Button onClick={() => navigate('/')} className="mt-2 w-full">{t.backToHome}</Button>
        </main>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="min-h-dvh bg-bg">
        {Header}
        <main className="mx-auto flex max-w-screen-sm flex-col items-center gap-4 px-4 pt-12 text-center">
          <span aria-hidden="true" className="text-6xl">🎉</span>
          <h1 className="text-2xl font-bold text-text">{t.drillDone}</h1>
          <p className="text-base text-success">{fmt(t.drillAdded, { count: learned })}</p>
          <Button onClick={() => void loadBatch()} className="mt-2 w-full text-lg">{t.drillMore}</Button>
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
      <Card key={index} item={batch[index]} onGrade={onGrade} />
    </div>
  )
}

/** One flashcard: word + always-visible pronunciation, reveal meaning, then grade. */
function Card({ item, onGrade }: { item: Item; onGrade: (g: Grade) => void }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <main className="mx-auto flex max-w-screen-sm flex-col items-center gap-5 px-4 pb-12 pt-8">
      <p className="text-4xl font-bold text-primary">{item.ro}</p>
      {/* Pronunciation is always visible (project rule). */}
      <p className="text-lg text-text-muted">{item.pron_uk}</p>
      <SpeakButton text={item.ro} size="lg" />

      {!revealed ? (
        <Button variant="secondary" onClick={() => setRevealed(true)} className="mt-4 w-full">
          {t.drillReveal}
        </Button>
      ) : (
        <div className="mt-2 flex w-full flex-col gap-4">
          <div className="rounded-md bg-surface p-4 text-center ring-1 ring-white/10">
            <p className="text-xl font-semibold text-text">{item.uk}</p>
            <p className="mt-2 text-sm text-primary">{item.example_ro}</p>
            <p className="text-sm text-text-muted">{item.example_uk}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => onGrade('easy')} className="flex-1">
              {t.drillKnow}
            </Button>
            <Button onClick={() => onGrade('good')} className="flex-1">
              {t.next}
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}
