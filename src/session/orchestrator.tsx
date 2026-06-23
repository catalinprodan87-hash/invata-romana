import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getItemBank, getCourseIndex, loadLesson } from '../content/load'
import type { Lesson } from '../content/types'
import {
  allItemStates,
  getItemState,
  getMeta,
  setItemState,
  setMeta,
  type Meta,
} from '../srs/store'
import { initialState, schedule, today, type Grade } from '../srs/scheduler'
import { recordActivity } from '../srs/progress'
import { buildSession } from './build'
import ExerciseRenderer from '../exercises/ExerciseRenderer'
import Retrieval from '../exercises/Retrieval'
import MissionRehearsal from '../exercises/MissionRehearsal'
import SpeakButton from '../ui/components/SpeakButton'
import Button from '../ui/components/Button'
import Spinner from '../ui/components/Spinner'
import { t } from '../ui/strings'

const XP_PER_REVIEW = 2
const XP_PER_EXERCISE = 1
const XP_PER_LESSON = 10

type Phase = 'loading' | 'empty' | 'warmup' | 'input' | 'practice' | 'mission' | 'complete'

function fmt(s: string, n: number): string {
  return s.replace('{count}', String(n))
}

/** A thin progress bar for the warm-up and practice phases. */
function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface ring-1 ring-hairline">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  )
}

/**
 * Runs one daily session end-to-end and persists results:
 * warm-up reviews → input dialogue → focused practice → mission → complete.
 */
export default function SessionOrchestrator() {
  const navigate = useNavigate()
  const bank = getItemBank()

  const [phase, setPhase] = useState<Phase>('loading')
  const [reviewIds, setReviewIds] = useState<string[]>([])
  const [reviewIdx, setReviewIdx] = useState(0)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [exerciseIdx, setExerciseIdx] = useState(0)
  const [summary, setSummary] = useState<{ xp: number; newItems: number } | null>(null)

  // Mutated across phases, persisted at completion.
  const metaRef = useRef<Meta | null>(null)
  const xpRef = useRef(0)
  const itemsRef = useRef(0)
  const pendingLessonIdRef = useRef<string | null>(null)

  // Plan the session once on mount.
  useEffect(() => {
    let active = true
    void (async () => {
      const [states, meta] = await Promise.all([allItemStates(), getMeta()])
      if (!active) return
      metaRef.current = meta
      const plan = buildSession({
        states,
        bank,
        course: getCourseIndex(),
        completedLessons: meta.completedLessons,
        today: today(),
      })
      pendingLessonIdRef.current = plan.newLessonId

      if (plan.reviewItemIds.length === 0 && !plan.newLessonId) {
        setPhase('empty')
        return
      }
      if (plan.reviewItemIds.length > 0) {
        setReviewIds(plan.reviewItemIds)
        setPhase('warmup')
      } else {
        const l = await loadLesson(plan.newLessonId!)
        if (!active) return
        setLesson(l)
        setPhase(l ? 'input' : 'complete')
        if (!l) await finishSession(null)
      }
    })()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function scheduleItem(id: string, grade: Grade) {
    const current = (await getItemState(id)) ?? initialState(today())
    await setItemState(id, schedule(current, grade, today()))
  }

  // ---- warm-up ----
  async function onReviewDone(grade: Grade) {
    await scheduleItem(reviewIds[reviewIdx], grade)
    xpRef.current += XP_PER_REVIEW
    itemsRef.current += 1
    if (reviewIdx + 1 < reviewIds.length) {
      setReviewIdx((i) => i + 1)
      return
    }
    // Warm-up finished → start the new lesson, or end if there's none.
    const lessonId = pendingLessonIdRef.current
    if (lessonId) {
      const l = await loadLesson(lessonId)
      setLesson(l)
      if (l) setPhase('input')
      else await finishSession(null)
    } else {
      await finishSession(null)
    }
  }

  // ---- practice ----
  async function onExerciseDone(grade: Grade) {
    if (!lesson) return
    const ex = lesson.exercises[exerciseIdx]
    if ('itemId' in ex) await scheduleItem(ex.itemId, grade)
    xpRef.current += XP_PER_EXERCISE
    itemsRef.current += 1
    if (exerciseIdx + 1 < lesson.exercises.length) setExerciseIdx((i) => i + 1)
    else setPhase('mission')
  }

  // ---- completion ----
  async function finishLesson() {
    if (!lesson) return
    // Seed SRS for every new item so it enters the review rotation. Items a
    // practice exercise already graded keep that practice-derived state (so a
    // struggled-with item stays due sooner); items no exercise targeted enter
    // at the 'good' baseline (due tomorrow). The `!existing` guard preserves
    // the practiced state and only seeds the untouched ones.
    for (const id of lesson.newItemIds) {
      const existing = await getItemState(id)
      if (!existing) await setItemState(id, schedule(initialState(today()), 'good', today()))
    }
    xpRef.current += XP_PER_LESSON
    const meta = metaRef.current
    if (meta && !meta.completedLessons.includes(lesson.id)) {
      meta.completedLessons = [...meta.completedLessons, lesson.id]
    }
    await finishSession(lesson)
  }

  async function finishSession(completed: Lesson | null) {
    const base = metaRef.current ?? (await getMeta())
    const updated = recordActivity(base, today(), xpRef.current, itemsRef.current)
    await setMeta(updated)
    metaRef.current = updated
    setSummary({ xp: xpRef.current, newItems: completed?.newItemIds.length ?? 0 })
    setPhase('complete')
  }

  // ---------------------------------------------------------------- render
  const ExitBar = (
    <div className="flex items-center gap-3 px-4 pt-4">
      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label={t.done}
        className="min-h-tap min-w-tap text-xl text-text-muted"
      >
        ✕
      </button>
      {phase === 'warmup' && (
        <Bar value={reviewIds.length ? reviewIdx / reviewIds.length : 0} />
      )}
      {phase === 'practice' && lesson && (
        <Bar value={lesson.exercises.length ? exerciseIdx / lesson.exercises.length : 0} />
      )}
    </div>
  )

  if (phase === 'loading') {
    return <div className="min-h-dvh bg-bg">{ExitBar}<Spinner /></div>
  }

  if (phase === 'empty') {
    return (
      <div className="min-h-dvh bg-bg">
        {ExitBar}
        <div className="mx-auto flex max-w-screen-sm flex-col items-center gap-4 px-4 pt-16 text-center">
          <span aria-hidden="true" className="text-6xl">🌿</span>
          <p className="text-xl font-bold text-text">{t.allCaughtUp}</p>
          <p className="text-base text-text-muted">{t.comeBackLater}</p>
          <Button onClick={() => navigate('/')} className="mt-2 w-full">{t.continue}</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-bg">
      {ExitBar}
      <main className="mx-auto max-w-screen-sm px-2 pb-12 pt-2">
        {phase === 'warmup' && (
          <>
            <p className="px-2 pt-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
              {t.warmUp}
            </p>
            <Retrieval
              key={`r-${reviewIdx}`}
              exercise={{ type: 'retrieval', itemId: reviewIds[reviewIdx] }}
              bank={bank}
              onDone={onReviewDone}
            />
          </>
        )}

        {phase === 'input' && lesson && (
          <div className="flex flex-col gap-5 p-2">
            <h1 className="text-2xl font-bold text-text">{lesson.title_uk}</h1>
            <p className="rounded-md bg-primary/5 p-4 text-base text-text">🎯 {lesson.goal_uk}</p>

            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
                {t.dialogue}
              </h2>
              <div className="flex flex-col gap-2">
                {lesson.dialogue.map((line, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-md bg-surface p-3 ring-1 ring-hairline">
                    <SpeakButton text={line.ro} size="md" label={t.playModel} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-text-muted">{line.speaker}</p>
                      <p className="text-base font-semibold text-primary">{line.ro}</p>
                      <p className="text-sm text-text-muted">{line.uk}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {lesson.grammarNotes_uk.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
                  {t.grammar}
                </h2>
                <ul className="flex flex-col gap-2">
                  {lesson.grammarNotes_uk.map((note, i) => (
                    <li key={i} className="rounded-md bg-surface p-3 text-sm text-text ring-1 ring-hairline">
                      {note}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <Button onClick={() => { setExerciseIdx(0); setPhase('practice') }} className="w-full text-lg">
              {t.beginPractice}
            </Button>
          </div>
        )}

        {phase === 'practice' && lesson && (
          <ExerciseRenderer
            key={`e-${exerciseIdx}`}
            exercise={lesson.exercises[exerciseIdx]}
            bank={bank}
            onDone={onExerciseDone}
          />
        )}

        {phase === 'mission' && lesson && (
          <MissionRehearsal mission={lesson.mission} onDone={() => void finishLesson()} />
        )}

        {phase === 'complete' && summary && (
          <div className="flex flex-col items-center gap-4 px-4 pt-12 text-center">
            <span aria-hidden="true" className="text-6xl">🎉</span>
            <h1 className="text-2xl font-bold text-text">{t.sessionComplete}</h1>
            <p className="text-xl font-bold text-success">{fmt(t.xpEarned, summary.xp)}</p>
            {summary.newItems > 0 && (
              <p className="text-base text-text-muted">{fmt(t.addedToReview, summary.newItems)}</p>
            )}
            {lesson && <p className="text-base text-text">{t.canDoNow}</p>}
            <Button onClick={() => navigate('/')} className="mt-2 w-full text-lg">{t.continue}</Button>
          </div>
        )}
      </main>
    </div>
  )
}
