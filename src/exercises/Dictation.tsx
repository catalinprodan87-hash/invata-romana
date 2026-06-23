import { useEffect, useRef, useState } from 'react'
import type { ExerciseProps } from './types'
import type { Exercise } from '../content/types'
import { getItemById } from '../content/load'
import { gradeText } from '../feedback/check'
import { speak, RATE_NORMAL } from '../speech/speech'
import SpeakButton from '../ui/components/SpeakButton'
import Button from '../ui/components/Button'
import { t } from '../ui/strings'

type DictationExercise = Extract<Exercise, { type: 'dictation' }>

export default function Dictation({ exercise, item: itemProp, onDone }: ExerciseProps<DictationExercise>) {
  const item = itemProp ?? getItemById(exercise.itemId)

  const [value, setValue] = useState('')
  const [result, setResult] = useState<ReturnType<typeof gradeText> | null>(null)
  const [done, setDone] = useState(false)
  const autoPlayedRef = useRef(false)

  // Auto-play the Romanian word once on mount.
  useEffect(() => {
    if (autoPlayedRef.current || !item) return
    autoPlayedRef.current = true
    speak(item.ro, { rate: RATE_NORMAL })
  }, [item])

  if (!item) {
    return (
      <div className="text-text-muted text-center p-6">
        {t.itemNotFound}: {exercise.itemId}
      </div>
    )
  }

  function handleCheck() {
    if (result !== null) return
    const r = gradeText(item!.ro, value)
    setResult(r)
  }

  function handleNext() {
    if (done) return
    setDone(true)
    onDone(result?.correct ? 'good' : 'again')
  }

  const tierBg = result
    ? result.tier === 'great'
      ? 'bg-success-tint ring-2 ring-success'
      : result.tier === 'close'
        ? 'bg-warning-tint ring-2 ring-warning'
        : 'bg-danger-tint ring-2 ring-danger'
    : ''

  const tierText = result
    ? result.tier === 'great'
      ? 'text-success'
      : result.tier === 'close'
        ? 'text-warning'
        : 'text-danger'
    : ''

  const tierLabel = result
    ? result.tier === 'great'
      ? t.great
      : result.tier === 'close'
        ? t.closeTier
        : t.tryAgain
    : ''

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Prompt: play button + offline fallback */}
      <div className="bg-surface rounded-md p-5 flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <SpeakButton text={item.ro} size="lg" />
          <p className="text-lg font-medium text-text">{t.typeWhatYouHear}</p>
        </div>
        {/* Pronunciation always shown as offline fallback */}
        <p className="text-base text-text-muted">[{item.pron_uk}]</p>
      </div>

      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && result === null) handleCheck() }}
        disabled={result !== null}
        placeholder={t.typeWhatYouHear}
        className={[
          'w-full min-h-tap rounded-md border border-white/20 px-4 py-3 text-lg text-text',
          'bg-surface placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary',
          'disabled:opacity-70',
          result !== null ? tierBg : '',
        ].join(' ')}
      />

      {/* Feedback panel */}
      {result !== null && (
        <div className={['rounded-md p-4 space-y-2', tierBg].join(' ')}>
          <p className={['font-semibold text-base', tierText].join(' ')}>
            {tierLabel}
          </p>
          {result.diacriticHint && (
            <p className="text-sm text-text-muted">{result.diacriticHint}</p>
          )}
          <p className="text-sm text-text-muted">
            {t.correctIs} <span className="font-semibold text-primary">{item.ro}</span>
          </p>
        </div>
      )}

      {/* Actions */}
      {result === null ? (
        <Button
          variant="primary"
          disabled={!value.trim()}
          onClick={handleCheck}
          className="w-full"
        >
          {t.check}
        </Button>
      ) : (
        <Button
          variant="primary"
          disabled={done}
          onClick={handleNext}
          className="w-full"
        >
          {t.next}
        </Button>
      )}
    </div>
  )
}
