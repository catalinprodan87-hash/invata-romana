import { useState } from 'react'
import type { ExerciseProps } from './types'
import type { Exercise } from '../content/types'
import { gradeText } from '../feedback/check'
import Button from '../ui/components/Button'
import { t } from '../ui/strings'

type ProductionExercise = Extract<Exercise, { type: 'production' }>

export default function Production({ exercise, onDone }: ExerciseProps<ProductionExercise>) {
  const { prompt_uk, answer_ro, wordBank } = exercise

  // Word-bank mode: list of selected tokens (allows repeats in order).
  const [built, setBuilt] = useState<string[]>([])
  // Free-text mode.
  const [typed, setTyped] = useState('')
  // Feedback state.
  const [result, setResult] = useState<ReturnType<typeof gradeText> | null>(null)
  const [done, setDone] = useState(false)

  const currentAnswer = wordBank ? built.join(' ') : typed

  function handleCheck() {
    if (result !== null) return
    const r = gradeText(answer_ro, currentAnswer)
    setResult(r)
  }

  function handleNext() {
    if (done) return
    setDone(true)
    onDone(result?.correct ? 'good' : 'again')
  }

  function tapWord(word: string) {
    if (result !== null) return
    setBuilt((prev) => [...prev, word])
  }

  function removeToken(index: number) {
    if (result !== null) return
    setBuilt((prev) => prev.filter((_, i) => i !== index))
  }

  function clearBuilt() {
    if (result !== null) return
    setBuilt([])
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
      {/* Prompt */}
      <div className="bg-surface rounded-md p-5 text-center">
        <p className="text-xl font-semibold text-text">{prompt_uk}</p>
      </div>

      {wordBank ? (
        <>
          {/* Built sentence display */}
          <div
            className={[
              'min-h-[3.5rem] rounded-md border border-white/20 bg-surface px-4 py-3 flex flex-wrap gap-2 items-center',
              result !== null ? tierBg : '',
            ].join(' ')}
          >
            {built.length === 0 && (
              <span className="text-text-muted text-sm">{t.tapToAnswer}</span>
            )}
            {built.map((word, idx) => (
              <button
                key={idx}
                type="button"
                disabled={result !== null}
                onClick={() => removeToken(idx)}
                className="min-h-tap rounded-md bg-primary/10 px-3 py-1 text-base font-medium text-primary active:scale-95 transition-transform disabled:opacity-70"
              >
                {word}
              </button>
            ))}
          </div>

          {/* Word bank tokens */}
          {result === null && (
            <div className="flex flex-wrap gap-2">
              {wordBank.map((word, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => tapWord(word)}
                  className="min-h-tap rounded-md bg-surface ring-1 ring-white/15 px-3 py-2 text-base font-medium text-text hover:bg-primary/10 active:scale-95 transition-colors"
                >
                  {word}
                </button>
              ))}
            </div>
          )}

          {/* Clear button */}
          {result === null && built.length > 0 && (
            <button
              type="button"
              onClick={clearBuilt}
              className="self-start min-h-tap px-2 inline-flex items-center text-sm text-text-muted underline underline-offset-2"
            >
              {t.clear}
            </button>
          )}
        </>
      ) : (
        /* Free-text input */
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && result === null) handleCheck() }}
          disabled={result !== null}
          placeholder={t.typeAnswer}
          className={[
            'w-full min-h-tap rounded-md border border-white/20 px-4 py-3 text-lg text-text',
            'bg-surface placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary',
            'disabled:opacity-70',
            result !== null ? tierBg : '',
          ].join(' ')}
        />
      )}

      {/* Feedback panel */}
      {result !== null && (
        <div className={['rounded-md p-4 space-y-2', tierBg].join(' ')}>
          <p className={['font-semibold text-base', tierText].join(' ')}>{tierLabel}</p>
          {result.diacriticHint && (
            <p className="text-sm text-text-muted">{result.diacriticHint}</p>
          )}
          <p className="text-sm text-text-muted">
            {t.correctIs} <span className="font-semibold text-primary">{answer_ro}</span>
          </p>
        </div>
      )}

      {/* Actions */}
      {result === null ? (
        <Button
          variant="primary"
          disabled={!currentAnswer.trim()}
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
