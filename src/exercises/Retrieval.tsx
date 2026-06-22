import { useState } from 'react'
import type { ExerciseProps } from './types'
import type { Grade } from '../srs/scheduler'
import type { Exercise } from '../content/types'
import { getItemById } from '../content/load'
import SpeakButton from '../ui/components/SpeakButton'
import Button from '../ui/components/Button'
import { t } from '../ui/strings'

type RetrievalExercise = Extract<Exercise, { type: 'retrieval' }>

export default function Retrieval({ exercise, item: itemProp, onDone }: ExerciseProps<RetrievalExercise>) {
  const [revealed, setRevealed] = useState(false)

  const item = itemProp ?? getItemById(exercise.itemId)

  if (!item) {
    return (
      <div className="text-text-muted text-center p-6">Item not found: {exercise.itemId}</div>
    )
  }

  function handleGrade(grade: Grade) {
    onDone(grade)
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Prompt */}
      <div className="bg-surface rounded-md p-5 text-center space-y-1">
        <p className="text-2xl font-semibold text-text">{item.uk}</p>
        {item.pron_uk && (
          <p className="text-base text-text-muted">[{item.pron_uk}]</p>
        )}
      </div>

      {!revealed ? (
        <Button variant="secondary" onClick={() => setRevealed(true)} className="w-full">
          {t.showAnswer}
        </Button>
      ) : (
        <>
          {/* Answer */}
          <div className="bg-surface rounded-md p-5 flex items-center justify-center gap-3">
            <p className="text-2xl font-semibold text-primary">{item.ro}</p>
            <SpeakButton text={item.ro} size="md" />
          </div>

          {/* Self-grade buttons */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="secondary"
              onClick={() => handleGrade('again')}
              className="w-full text-sm"
            >
              {t.again}
            </Button>
            <Button
              variant="primary"
              onClick={() => handleGrade('good')}
              className="w-full text-sm"
            >
              {t.gotIt}
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleGrade('easy')}
              className="w-full text-sm text-green-700"
            >
              {t.easy}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
