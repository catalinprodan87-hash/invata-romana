import { useState } from 'react'
import type { ExerciseProps } from './types'
import type { Exercise } from '../content/types'
import Button from '../ui/components/Button'
import { t } from '../ui/strings'

type ComprehensionExercise = Extract<Exercise, { type: 'comprehension' }>

type OptionState = 'idle' | 'correct' | 'wrong' | 'reveal'

export default function Comprehension({ exercise, onDone }: ExerciseProps<ComprehensionExercise>) {
  const [selected, setSelected] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const answered = selected !== null

  function handleSelect(index: number) {
    if (answered) return
    setSelected(index)
  }

  function handleContinue() {
    if (submitted) return
    setSubmitted(true)
    onDone(selected === exercise.answerIndex ? 'good' : 'again')
  }

  function stateFor(index: number): OptionState {
    if (!answered) return 'idle'
    if (index === exercise.answerIndex) return 'correct'
    if (index === selected) return 'wrong'
    return 'reveal'
  }

  const stateStyles: Record<OptionState, string> = {
    idle: 'bg-surface text-text ring-1 ring-hairline-strong',
    correct: 'bg-success-tint text-success ring-2 ring-success',
    wrong: 'bg-danger-tint text-danger ring-2 ring-danger',
    reveal: 'bg-surface text-text-muted ring-1 ring-hairline-strong opacity-60',
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Question */}
      <div className="bg-surface rounded-md p-5">
        <p className="text-lg font-medium text-text">{exercise.question_uk}</p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3">
        {exercise.options_uk.map((option, index) => {
          const state = stateFor(index)
          return (
            <button
              key={index}
              type="button"
              disabled={answered}
              onClick={() => handleSelect(index)}
              className={[
                'min-h-tap w-full rounded-md px-4 py-3 text-left text-base font-medium transition-colors',
                stateStyles[state],
              ].join(' ')}
            >
              {option}
              {answered && state === 'correct' && (
                <span className="ml-2 text-sm font-normal text-success">{t.correct}</span>
              )}
              {answered && state === 'wrong' && (
                <span className="ml-2 text-sm font-normal text-danger">{t.incorrect}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Continue only after the learner has seen the result */}
      {answered && (
        <Button disabled={submitted} onClick={handleContinue} className="w-full">
          {t.next}
        </Button>
      )}
    </div>
  )
}
