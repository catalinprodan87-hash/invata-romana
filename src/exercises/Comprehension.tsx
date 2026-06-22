import { useState } from 'react'
import type { ExerciseProps } from './types'
import type { Exercise } from '../content/types'
import { t } from '../ui/strings'

type ComprehensionExercise = Extract<Exercise, { type: 'comprehension' }>

type OptionState = 'idle' | 'correct' | 'wrong' | 'reveal'

export default function Comprehension({ exercise, onDone }: ExerciseProps<ComprehensionExercise>) {
  const [selected, setSelected] = useState<number | null>(null)
  const [done, setDone] = useState(false)

  function handleSelect(index: number) {
    if (done) return
    setSelected(index)
    setDone(true)
    onDone(index === exercise.answerIndex ? 'good' : 'again')
  }

  function stateFor(index: number): OptionState {
    if (!done) return 'idle'
    if (index === exercise.answerIndex) return 'correct'
    if (index === selected) return 'wrong'
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
              disabled={done}
              onClick={() => handleSelect(index)}
              className={[
                'min-h-tap w-full rounded-md px-4 py-3 text-left text-base font-medium transition-colors',
                stateStyles[state],
              ].join(' ')}
            >
              {option}
              {done && state === 'correct' && (
                <span className="ml-2 text-sm font-normal text-green-700">{t.correct}</span>
              )}
              {done && state === 'wrong' && (
                <span className="ml-2 text-sm font-normal text-red-600">{t.incorrect}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
