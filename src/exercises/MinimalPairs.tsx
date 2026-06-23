import { useMemo, useState } from 'react'
import type { ExerciseProps } from './types'
import type { Exercise } from '../content/types'
import { getItemById } from '../content/load'
import SpeakButton from '../ui/components/SpeakButton'
import Button from '../ui/components/Button'
import { t } from '../ui/strings'

type MinimalPairsExercise = Extract<Exercise, { type: 'minimalPairs' }>

type OptionState = 'idle' | 'correct' | 'wrong' | 'reveal'

export default function MinimalPairs({ exercise, onDone }: ExerciseProps<MinimalPairsExercise>) {
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const answered = selected !== null

  const item = getItemById(exercise.itemId)
  const distractor = getItemById(exercise.distractorId)

  // Randomise option order once on mount.
  const options = useMemo(() => {
    if (!item || !distractor) return []
    const pair = [item.ro, distractor.ro]
    return Math.random() < 0.5 ? pair : [pair[1], pair[0]]
  }, [item, distractor])

  if (!item || !distractor) {
    return (
      <div className="text-text-muted text-center p-6">
        {t.itemNotFound}: {!item ? exercise.itemId : exercise.distractorId}
      </div>
    )
  }

  function handleSelect(choice: string) {
    if (answered) return
    setSelected(choice)
  }

  function stateFor(option: string): OptionState {
    if (!answered) return 'idle'
    if (option === item!.ro) return 'correct'
    if (option === selected) return 'wrong'
    return 'reveal'
  }

  const stateStyles: Record<OptionState, string> = {
    idle: 'bg-surface text-text ring-1 ring-black/10',
    correct: 'bg-green-100 text-green-800 ring-2 ring-green-500',
    wrong: 'bg-red-100 text-red-800 ring-2 ring-red-400',
    reveal: 'bg-surface text-text-muted ring-1 ring-black/10 opacity-60',
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Prompt */}
      <p className="text-center text-lg font-medium text-text-muted">{t.whichWord}</p>

      {/* Listen */}
      <div className="flex justify-center">
        <SpeakButton text={item.ro} size="lg" />
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const state = stateFor(option)
          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => handleSelect(option)}
              className={[
                'min-h-tap w-full rounded-md px-4 py-3 text-xl font-semibold transition-colors',
                stateStyles[state],
              ].join(' ')}
            >
              {option}
              {answered && state === 'correct' && (
                <span className="ml-2 text-base font-normal text-green-700">{t.correct}</span>
              )}
              {answered && state === 'wrong' && (
                <span className="ml-2 text-base font-normal text-red-600">{t.incorrect}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Continue only after the learner has seen the result */}
      {answered && (
        <Button
          disabled={submitted}
          onClick={() => {
            if (submitted) return
            setSubmitted(true)
            onDone(selected === item!.ro ? 'good' : 'again')
          }}
          className="w-full"
        >
          {t.next}
        </Button>
      )}
    </div>
  )
}
