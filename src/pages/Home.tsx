import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCourseIndex, getItemBank, loadLesson } from '../content/load'
import { allItemStates, getMeta } from '../srs/store'
import { today } from '../srs/scheduler'
import { buildSession } from '../session/build'
import { frequencyBackbone } from '../srs/progress'
import { useSettings } from '../ui/settings'
import ProgressRing from '../ui/components/ProgressRing'
import Button from '../ui/components/Button'
import Spinner from '../ui/components/Spinner'
import { t } from '../ui/strings'

interface Dash {
  reviewsDue: number
  newLessonTitle: string | null
  newWords: number
  dailyDone: number
  streak: number
  known: number
  total: number
}

/** Dashboard: daily goal, streak, frequency backbone, and the start-session card. */
export default function Home() {
  const navigate = useNavigate()
  const { dailyGoal } = useSettings()
  const [dash, setDash] = useState<Dash | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      const bank = getItemBank()
      const [states, meta] = await Promise.all([allItemStates(), getMeta()])
      if (!active) return
      const plan = buildSession({
        states,
        bank,
        course: getCourseIndex(),
        completedLessons: meta.completedLessons,
        today: today(),
      })
      let newLessonTitle: string | null = null
      let newWords = 0
      if (plan.newLessonId) {
        const l = await loadLesson(plan.newLessonId)
        if (l) {
          newLessonTitle = l.title_uk
          newWords = l.newItemIds.length
        }
      }
      if (!active) return
      const fb = frequencyBackbone(states, bank)
      setDash({
        reviewsDue: plan.reviewItemIds.length,
        newLessonTitle,
        newWords,
        dailyDone: meta.daily.day === today() ? meta.daily.count : 0,
        streak: meta.streak.count,
        known: fb.known,
        total: fb.total,
      })
    })()
    return () => {
      active = false
    }
  }, [])

  if (!dash) {
    return <div className="min-h-dvh bg-bg"><Spinner /></div>
  }

  const hasWork = dash.reviewsDue > 0 || dash.newLessonTitle !== null
  const ringValue = dailyGoal > 0 ? dash.dailyDone / dailyGoal : 0
  const knownPct = dash.total ? (dash.known / dash.total) * 100 : 0

  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto flex max-w-screen-sm items-center justify-between px-4 pt-5">
        <h1 className="text-xl font-bold text-text">{t.appName}</h1>
        <Link
          to="/settings"
          aria-label={t.settings}
          className="flex min-h-tap min-w-tap items-center justify-center text-xl"
        >
          ⚙️
        </Link>
      </header>

      <main className="mx-auto flex max-w-screen-sm flex-col gap-4 px-4 pb-12 pt-4">
        {/* Daily goal + streak */}
        <div className="flex items-center gap-4 rounded-lg bg-surface p-4 ring-1 ring-hairline">
          <ProgressRing
            value={ringValue}
            center={`${dash.dailyDone}/${dailyGoal}`}
            caption={t.dailyGoal}
          />
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-base">
              <span aria-hidden="true">🔥</span>{' '}
              <span className="font-bold text-text">{dash.streak}</span>{' '}
              <span className="text-text-muted">{t.streak}</span>
            </p>
            {ringValue >= 1 && (
              <p className="text-sm font-medium text-success">{t.allDoneToday}</p>
            )}
          </div>
        </div>

        {/* Frequency backbone */}
        <div className="rounded-lg bg-surface p-4 ring-1 ring-hairline">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              {t.wordsKnownLabel}
            </p>
            <p className="text-sm text-text-muted">
              {dash.known} / {dash.total}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-success transition-all" style={{ width: `${knownPct}%` }} />
          </div>
        </div>

        {/* Action */}
        {hasWork ? (
          <div className="rounded-lg bg-surface p-4 ring-1 ring-hairline">
            <div className="mb-3 flex gap-6">
              <div>
                <p className="text-2xl font-bold text-primary">{dash.reviewsDue}</p>
                <p className="text-xs text-text-muted">{t.reviewsDueShort}</p>
              </div>
              {dash.newLessonTitle && (
                <div>
                  <p className="text-2xl font-bold text-primary">{dash.newWords}</p>
                  <p className="text-xs text-text-muted">{t.newWordsShort}</p>
                </div>
              )}
            </div>
            {dash.newLessonTitle && (
              <p className="mb-3 text-base text-text">📘 {dash.newLessonTitle}</p>
            )}
            <Button onClick={() => navigate('/session')} className="w-full text-lg">
              {t.startSession}
            </Button>
          </div>
        ) : (
          <div className="rounded-lg bg-surface p-6 text-center ring-1 ring-hairline">
            <p className="text-4xl">🌿</p>
            <p className="mt-2 text-lg font-bold text-text">{t.allCaughtUp}</p>
            <p className="text-sm text-text-muted">{t.comeBackLater}</p>
          </div>
        )}

        {/* Optional vocabulary drill — walk the frequency spine, 10 words at a time */}
        <button
          type="button"
          onClick={() => navigate('/drill')}
          className="flex items-center gap-3 rounded-lg bg-surface p-4 text-left ring-1 ring-hairline transition-colors hover:bg-primary/5"
        >
          <span aria-hidden="true" className="text-3xl">📚</span>
          <div className="flex-1">
            <p className="text-base font-bold text-text">{t.drillTitle}</p>
            <p className="text-sm text-text-muted">{t.drillTagline}</p>
          </div>
          <span aria-hidden="true" className="text-text-muted">›</span>
        </button>

        {/* Optional game — quick listening/meaning drill over seen vocabulary */}
        <button
          type="button"
          onClick={() => navigate('/game')}
          className="flex items-center gap-3 rounded-lg bg-surface p-4 text-left ring-1 ring-hairline transition-colors hover:bg-primary/5"
        >
          <span aria-hidden="true" className="text-3xl">🎮</span>
          <div className="flex-1">
            <p className="text-base font-bold text-text">{t.gameTitle}</p>
            <p className="text-sm text-text-muted">{t.gameTagline}</p>
          </div>
          <span aria-hidden="true" className="text-text-muted">›</span>
        </button>
      </main>
    </div>
  )
}
